# Soft Delete Patterns in VendHub OS

VendHub OS uses **soft deletes** for data safety and auditability. Soft deletes mark records as deleted without permanently removing them from the database, allowing for recovery and maintaining referential integrity.

## Overview

Soft deletes are implemented in VendHub OS through:

- **BaseEntity**: All entities inherit from a base entity that includes a `deletedAt` field
- **TypeORM Integration**: Automatic filtering of soft-deleted records
- **Audit Trail**: Complete history of deletions for compliance
- **Recovery**: Ability to restore deleted records

## BaseEntity Implementation

All entities in VendHub OS inherit from `BaseEntity`:

```typescript
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";

@Entity()
export class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deletedAt: Date | null;
}
```

The `deletedAt` field:

- Is `null` for active records
- Contains a timestamp for soft-deleted records
- Automatically managed by TypeORM

### Example Entity

```typescript
import { Entity, Column } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", nullable: true })
  phone?: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;
}
```

## Automatic Filtering

TypeORM automatically filters out soft-deleted records in queries by default.

### Default Behavior (Excludes Deleted)

```typescript
// This query only returns active users (deletedAt IS NULL)
const users = await userRepository.find({
  where: {
    isActive: true,
  },
});

// Pagination with automatic filtering
const [users, total] = await userRepository.findAndCount({
  where: { isActive: true },
  skip: 0,
  take: 10,
});
```

### Including Deleted Records

To include soft-deleted records in your query, use the `.withDeleted()` method:

```typescript
// Include soft-deleted users
const allUsers = await userRepository.find({
  withDeleted: true,
  where: {
    isActive: true,
  },
});

// Paginated query including deleted records
const [allUsers, total] = await userRepository.findAndCount({
  withDeleted: true,
  where: { isActive: true },
  skip: 0,
  take: 10,
});

// Find a specific user even if deleted
const user = await userRepository.findOne({
  where: { id: userId },
  withDeleted: true,
});
```

### Querying Only Deleted Records

To find only soft-deleted records:

```typescript
// Find users deleted in the last 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const deletedUsers = await userRepository.find({
  where: {
    deletedAt: MoreThan(thirtyDaysAgo),
  },
  withDeleted: true,
});

// Find all deleted users
const allDeletedUsers = await userRepository.find({
  where: {
    deletedAt: Not(IsNull()),
  },
  withDeleted: true,
});
```

## Unique Constraints and Soft Deletes

Soft deletes require special handling for unique constraints to allow deleted records to have the same value as new records.

### Partial Unique Index

Define unique constraints that only apply to non-deleted records:

```typescript
import { Entity, Column, Index, Unique } from "typeorm";

@Entity("users")
@Index("idx_email_unique", { synchronize: false })
export class User extends BaseEntity {
  @Column({ type: "varchar", length: 255, unique: true })
  email: string;
}

// In migration or raw SQL:
// CREATE UNIQUE INDEX idx_email_unique ON users (email) WHERE deleted_at IS NULL;
```

This allows multiple deleted users with the same email address, which is essential for allowing new users to register with previously used email addresses.

### Implementation in Migrations

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraints1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the default unique constraint if it exists
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS UQ_email`,
    );

    // Create partial unique index
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_users_email_unique`);
    // Recreate full unique constraint
    await queryRunner.query(
      `ALTER TABLE users ADD CONSTRAINT UQ_email UNIQUE (email)`,
    );
  }
}
```

## Service Pattern

Always use `softDelete()` method instead of `delete()` when removing records.

### User Service Example

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Create
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  // Read (all active)
  async findAll(
    skip: number = 0,
    take: number = 10,
  ): Promise<[User[], number]> {
    return this.userRepository.findAndCount({
      where: { isActive: true },
      skip,
      take,
      order: { createdAt: "DESC" },
    });
  }

  // Read (with pagination)
  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  // Read (including deleted)
  async findById(id: string, includeDeleted: boolean = false): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  // Update
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  // Soft Delete (preferred)
  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.softDelete(user.id);
  }

  // Restore (recover soft-deleted record)
  async restore(id: string): Promise<User> {
    const user = await this.findById(id, true);

    if (!user.deletedAt) {
      throw new BadRequestException("User is not deleted");
    }

    await this.userRepository.restore(user.id);
    return this.findById(id);
  }

  // Permanent Delete (only for privacy/GDPR requests)
  async permanentlyDelete(id: string): Promise<void> {
    const user = await this.findById(id, true);
    await this.userRepository.remove(user);
  }
}
```

## Repository Pattern Examples

### Using the Repository API

```typescript
// Soft delete a user
await userRepository.softDelete(userId);

// Soft delete multiple users
await userRepository.softDelete([userId1, userId2, userId3]);

// Soft delete with conditions
await userRepository.softDelete({
  isActive: false,
  createdAt: LessThan(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)), // 90 days ago
});

// Restore a soft-deleted user
await userRepository.restore(userId);

// Restore multiple users
await userRepository.restore([userId1, userId2]);

// Restore with conditions
await userRepository.restore({
  deletedAt: Between(startDate, endDate),
});

// Permanent delete (use sparingly)
const user = await userRepository.findOne({
  where: { id: userId },
  withDeleted: true,
});
await userRepository.remove(user);
```

### Custom Query Builder

```typescript
// Get users with associated deleted posts
const usersWithDeletedPosts = await userRepository
  .createQueryBuilder("user")
  .leftJoinAndSelect("user.posts", "posts", "posts.deleted_at IS NOT NULL")
  .withDeleted()
  .where("user.deleted_at IS NULL")
  .getMany();

// Get soft-deleted users created in the last 7 days
const recentlyDeleted = await userRepository
  .createQueryBuilder("user")
  .where("user.deleted_at IS NOT NULL")
  .andWhere("user.deleted_at >= :sevenDaysAgo", {
    sevenDaysAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  })
  .withDeleted()
  .orderBy("user.deletedAt", "DESC")
  .getMany();

// Count active and deleted users
const counts = await userRepository
  .createQueryBuilder("user")
  .select("COUNT(CASE WHEN user.deleted_at IS NULL THEN 1 END)", "activeCount")
  .addSelect(
    "COUNT(CASE WHEN user.deleted_at IS NOT NULL THEN 1 END)",
    "deletedCount",
  )
  .getRawOne();
```

## Best Practices

### Do's

1. **Always use softDelete()** for normal delete operations

   ```typescript
   await userRepository.softDelete(userId);
   ```

2. **Include timestamps** to track when records were deleted

   ```typescript
   const deletedAt = user.deletedAt;
   ```

3. **Use withDeleted()** when auditing or restoring records

   ```typescript
   const user = await userRepository.findOne({ id: userId, withDeleted: true });
   ```

4. **Create partial unique indexes** for unique constraints

   ```sql
   CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE deleted_at IS NULL;
   ```

5. **Document deletion policies** in your API
   ```typescript
   /**
    * Delete a user (soft delete)
    * @param id - User ID
    * @returns Deleted user details
    */
   async remove(id: string): Promise<User>
   ```

### Don'ts

1. **Don't use delete()** for normal operations

   ```typescript
   // ❌ BAD
   await userRepository.delete(userId);

   // ✅ GOOD
   await userRepository.softDelete(userId);
   ```

2. **Don't forget withDeleted() when needed**

   ```typescript
   // ❌ BAD - Won't find deleted user
   const user = await userRepository.findOne(id);

   // ✅ GOOD - Will find even if deleted
   const user = await userRepository.findOne(id, { withDeleted: true });
   ```

3. **Don't permanently delete user data lightly**
   - Only for GDPR/privacy requests
   - Maintain audit trail
   - Have approval workflow

4. **Don't ignore soft-deleted records in reporting**

   ```typescript
   // ❌ BAD - Includes deleted records
   const count = await userRepository.count();

   // ✅ GOOD - Only active records
   const count = await userRepository.count({ where: { isActive: true } });
   ```

## Migration Guide

If converting an existing entity to soft deletes:

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSoftDeleteToUsers1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deletedAt column
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "deleted_at",
        type: "timestamp",
        isNullable: true,
        default: null,
      }),
    );

    // Create index for faster queries
    await queryRunner.query(
      `CREATE INDEX idx_users_deleted_at ON users (deleted_at)`,
    );

    // Create partial unique index for email
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_users_email_unique`);
    await queryRunner.query(`DROP INDEX idx_users_deleted_at`);
    await queryRunner.dropColumn("users", "deleted_at");
  }
}
```

## Monitoring and Maintenance

### Check Soft-Deleted Records

```typescript
// Audit: Recent deletions
const recentDeletions = await userRepository
  .createQueryBuilder("user")
  .select(["user.id", "user.email", "user.deletedAt"])
  .where("user.deleted_at >= :cutoff", {
    cutoff: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  })
  .withDeleted()
  .orderBy("user.deletedAt", "DESC")
  .getMany();

// Audit: Oldest soft-deleted records
const oldDeletions = await userRepository
  .createQueryBuilder("user")
  .select(["user.id", "user.email", "user.deletedAt"])
  .where("user.deleted_at IS NOT NULL")
  .withDeleted()
  .orderBy("user.deletedAt", "ASC")
  .limit(100)
  .getMany();
```

## Related Resources

- [TypeORM Soft Delete Documentation](https://typeorm.io/entities#deletion-dates)
- [Database Auditing Guide](./DATABASE_AUDITING.md)
- [Data Recovery Procedures](./DATA_RECOVERY.md)
