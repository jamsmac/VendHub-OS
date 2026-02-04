import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: SeedDefaultRolesAndPermissions
 *
 * Seeds the 7 default system roles and 100 permissions (20 resources x 5 actions).
 * Then assigns default permission sets to each role.
 *
 * Roles (is_system = true, organization_id = NULL):
 *   owner (100), admin (90), manager (70), accountant (50),
 *   warehouse (40), operator (30), viewer (10)
 *
 * Resources (20): users, organizations, locations, machines, products,
 *   inventory, transactions, reports, settings, tasks, complaints,
 *   notifications, audit, payments, orders, maintenance, employees,
 *   contractors, loyalty, referrals
 *
 * Actions (5): read, create, update, delete, manage
 */
export class SeedDefaultRolesAndPermissions1707200001000 implements MigrationInterface {
  name = 'SeedDefaultRolesAndPermissions1707200001000';

  // ========================================================================
  // Fixed UUIDs for deterministic seeding (allows reliable rollback)
  // ========================================================================

  // Role UUIDs (prefixed with r100xxxx pattern for readability)
  private static readonly ROLE_IDS = {
    owner:      'r1000000-0000-4000-a000-000000000001',
    admin:      'r1000000-0000-4000-a000-000000000002',
    manager:    'r1000000-0000-4000-a000-000000000003',
    accountant: 'r1000000-0000-4000-a000-000000000004',
    warehouse:  'r1000000-0000-4000-a000-000000000005',
    operator:   'r1000000-0000-4000-a000-000000000006',
    viewer:     'r1000000-0000-4000-a000-000000000007',
  } as const;

  // Resources and actions
  private static readonly RESOURCES = [
    'users', 'organizations', 'locations', 'machines', 'products',
    'inventory', 'transactions', 'reports', 'settings', 'tasks',
    'complaints', 'notifications', 'audit', 'payments', 'orders',
    'maintenance', 'employees', 'contractors', 'loyalty', 'referrals',
  ] as const;

  private static readonly ACTIONS = [
    'read', 'create', 'update', 'delete', 'manage',
  ] as const;

  /**
   * Generates a deterministic UUID for a permission based on resource + action index.
   * Format: p100RRRR-0000-4000-a000-00000000AAAA
   * where RRRR = resource index (0-padded) and AAAA = action index (0-padded)
   */
  private static permissionId(resourceIdx: number, actionIdx: number): string {
    const r = String(resourceIdx).padStart(4, '0');
    const a = String(actionIdx).padStart(4, '0');
    return `p100${r}-0000-4000-a000-0000000${a}`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { ROLE_IDS, RESOURCES, ACTIONS } = SeedDefaultRolesAndPermissions1707200001000;

    // ========================================================================
    // 1. SEED ROLES
    // ========================================================================
    const roles: Array<{ key: string; id: string; name: string; description: string; level: number }> = [
      { key: 'owner',      id: ROLE_IDS.owner,      name: 'owner',      description: 'System-wide full access, organization management', level: 100 },
      { key: 'admin',      id: ROLE_IDS.admin,      name: 'admin',      description: 'Full organization access, user management',       level: 90  },
      { key: 'manager',    id: ROLE_IDS.manager,    name: 'manager',    description: 'Operations, reports, tasks management',            level: 70  },
      { key: 'accountant', id: ROLE_IDS.accountant, name: 'accountant', description: 'Finance, reports, reconciliation',                 level: 50  },
      { key: 'warehouse',  id: ROLE_IDS.warehouse,  name: 'warehouse',  description: 'Inventory, warehouse, stock management',           level: 40  },
      { key: 'operator',   id: ROLE_IDS.operator,   name: 'operator',   description: 'Machines, inventory, tasks (assigned)',             level: 30  },
      { key: 'viewer',     id: ROLE_IDS.viewer,     name: 'viewer',     description: 'Read-only access to all resources',                level: 10  },
    ];

    for (const role of roles) {
      await queryRunner.query(`
        INSERT INTO "roles" ("id", "name", "description", "is_active", "is_system", "organization_id", "level")
        VALUES ($1, $2, $3, true, true, NULL, $4)
      `, [role.id, role.name, role.description, role.level]);
    }

    // ========================================================================
    // 2. SEED PERMISSIONS (20 resources x 5 actions = 100)
    // ========================================================================
    for (let ri = 0; ri < RESOURCES.length; ri++) {
      const resource = RESOURCES[ri];
      for (let ai = 0; ai < ACTIONS.length; ai++) {
        const action = ACTIONS[ai];
        const id = SeedDefaultRolesAndPermissions1707200001000.permissionId(ri, ai);
        const name = `${resource}:${action}`;
        const description = `${action.charAt(0).toUpperCase() + action.slice(1)} access to ${resource}`;

        await queryRunner.query(`
          INSERT INTO "permissions" ("id", "name", "resource", "action", "description", "is_active")
          VALUES ($1, $2, $3, $4, $5, true)
        `, [id, name, resource, action, description]);
      }
    }

    // ========================================================================
    // 3. ASSIGN PERMISSIONS TO ROLES
    // ========================================================================

    // Helper: insert role_permissions row
    const assign = async (roleId: string, resourceIdx: number, actionIdx: number) => {
      const permId = SeedDefaultRolesAndPermissions1707200001000.permissionId(resourceIdx, actionIdx);
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        VALUES ($1, $2)
      `, [roleId, permId]);
    };

    // Helper: assign ALL actions for a resource to a role
    const assignAllActions = async (roleId: string, resourceIdx: number) => {
      for (let ai = 0; ai < ACTIONS.length; ai++) {
        await assign(roleId, resourceIdx, ai);
      }
    };

    // Helper: assign only read action for a resource to a role
    const assignRead = async (roleId: string, resourceIdx: number) => {
      await assign(roleId, resourceIdx, 0); // read = index 0
    };

    // Helper: assign read + create + update for a resource to a role
    const assignReadCreateUpdate = async (roleId: string, resourceIdx: number) => {
      await assign(roleId, resourceIdx, 0); // read
      await assign(roleId, resourceIdx, 1); // create
      await assign(roleId, resourceIdx, 2); // update
    };

    // Resource index map for readability
    const R = {
      users: 0,
      organizations: 1,
      locations: 2,
      machines: 3,
      products: 4,
      inventory: 5,
      transactions: 6,
      reports: 7,
      settings: 8,
      tasks: 9,
      complaints: 10,
      notifications: 11,
      audit: 12,
      payments: 13,
      orders: 14,
      maintenance: 15,
      employees: 16,
      contractors: 17,
      loyalty: 18,
      referrals: 19,
    };

    // ---------------------------------------------------------------
    // OWNER: ALL permissions (100 permissions)
    // ---------------------------------------------------------------
    for (let ri = 0; ri < RESOURCES.length; ri++) {
      await assignAllActions(ROLE_IDS.owner, ri);
    }

    // ---------------------------------------------------------------
    // ADMIN: ALL except settings:manage
    // ---------------------------------------------------------------
    for (let ri = 0; ri < RESOURCES.length; ri++) {
      if (ri === R.settings) {
        // settings: read, create, update, delete (skip manage)
        await assign(ROLE_IDS.admin, ri, 0); // read
        await assign(ROLE_IDS.admin, ri, 1); // create
        await assign(ROLE_IDS.admin, ri, 2); // update
        await assign(ROLE_IDS.admin, ri, 3); // delete
      } else {
        await assignAllActions(ROLE_IDS.admin, ri);
      }
    }

    // ---------------------------------------------------------------
    // MANAGER: read + create + update for most resources
    // Full access to tasks, complaints, notifications, maintenance
    // ---------------------------------------------------------------
    await assignReadCreateUpdate(ROLE_IDS.manager, R.users);
    await assignRead(ROLE_IDS.manager, R.organizations);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.locations);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.machines);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.products);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.inventory);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.transactions);
    await assignAllActions(ROLE_IDS.manager, R.reports);
    await assignRead(ROLE_IDS.manager, R.settings);
    await assignAllActions(ROLE_IDS.manager, R.tasks);
    await assignAllActions(ROLE_IDS.manager, R.complaints);
    await assignAllActions(ROLE_IDS.manager, R.notifications);
    await assignRead(ROLE_IDS.manager, R.audit);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.payments);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.orders);
    await assignAllActions(ROLE_IDS.manager, R.maintenance);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.employees);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.contractors);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.loyalty);
    await assignReadCreateUpdate(ROLE_IDS.manager, R.referrals);

    // ---------------------------------------------------------------
    // ACCOUNTANT: read all + manage transactions, reports, payments
    // ---------------------------------------------------------------
    for (let ri = 0; ri < RESOURCES.length; ri++) {
      if (ri === R.transactions || ri === R.reports || ri === R.payments) {
        await assignAllActions(ROLE_IDS.accountant, ri);
      } else {
        await assignRead(ROLE_IDS.accountant, ri);
      }
    }

    // ---------------------------------------------------------------
    // WAREHOUSE: read all + manage inventory, products
    // ---------------------------------------------------------------
    for (let ri = 0; ri < RESOURCES.length; ri++) {
      if (ri === R.inventory || ri === R.products) {
        await assignAllActions(ROLE_IDS.warehouse, ri);
      } else {
        await assignRead(ROLE_IDS.warehouse, ri);
      }
    }

    // ---------------------------------------------------------------
    // OPERATOR: read machines, products, locations + manage tasks
    // Also read inventory, orders, maintenance, notifications
    // ---------------------------------------------------------------
    await assignRead(ROLE_IDS.operator, R.users);
    await assignRead(ROLE_IDS.operator, R.organizations);
    await assignRead(ROLE_IDS.operator, R.locations);
    await assignRead(ROLE_IDS.operator, R.machines);
    await assignRead(ROLE_IDS.operator, R.products);
    await assignRead(ROLE_IDS.operator, R.inventory);
    await assignRead(ROLE_IDS.operator, R.transactions);
    await assignRead(ROLE_IDS.operator, R.reports);
    await assignRead(ROLE_IDS.operator, R.settings);
    await assignAllActions(ROLE_IDS.operator, R.tasks);
    await assignReadCreateUpdate(ROLE_IDS.operator, R.complaints);
    await assignRead(ROLE_IDS.operator, R.notifications);
    await assignRead(ROLE_IDS.operator, R.audit);
    await assignRead(ROLE_IDS.operator, R.payments);
    await assignRead(ROLE_IDS.operator, R.orders);
    await assignReadCreateUpdate(ROLE_IDS.operator, R.maintenance);
    await assignRead(ROLE_IDS.operator, R.employees);
    await assignRead(ROLE_IDS.operator, R.contractors);
    await assignRead(ROLE_IDS.operator, R.loyalty);
    await assignRead(ROLE_IDS.operator, R.referrals);

    // ---------------------------------------------------------------
    // VIEWER: read only for ALL resources
    // ---------------------------------------------------------------
    for (let ri = 0; ri < RESOURCES.length; ri++) {
      await assignRead(ROLE_IDS.viewer, ri);
    }

    console.log('SeedDefaultRolesAndPermissions migration completed successfully');
    console.log(`  Roles seeded: ${roles.length}`);
    console.log(`  Permissions seeded: ${RESOURCES.length * ACTIONS.length}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const { ROLE_IDS } = SeedDefaultRolesAndPermissions1707200001000;
    const roleIds = Object.values(ROLE_IDS);

    // Delete role_permissions for seeded roles
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "role_id" = ANY($1::uuid[])
    `, [roleIds]);

    // Delete seeded permissions (all with our deterministic ID prefix)
    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "id"::text LIKE 'p100%'
    `);

    // Delete seeded roles
    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE "id" = ANY($1::uuid[])
    `, [roleIds]);

    console.log('SeedDefaultRolesAndPermissions migration reverted successfully');
  }
}
