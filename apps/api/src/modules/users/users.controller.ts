import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles, UserRole } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ICurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({
    status: 200,
    description: "List of users",
    schema: {
      example: {
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "user@example.com",
            firstName: "John",
            lastName: "Doe",
            role: "manager",
            organizationId: "550e8400-e29b-41d4-a716-446655440001",
          },
        ],
        total: 1,
      },
    },
  })
  findAll(@CurrentUser() user: ICurrentUser) {
    // Admin sees only their organization's users
    // Super admin sees all users
    const organizationId =
      user.role === UserRole.OWNER ? undefined : user.organizationId;
    return this.usersService.findAll(organizationId);
  }

  @Get(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({
    status: 200,
    description: "User found",
    schema: {
      example: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "manager",
        organizationId: "550e8400-e29b-41d4-a716-446655440001",
      },
    },
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (
      currentUser.role !== UserRole.OWNER &&
      user.organizationId !== currentUser.organizationId
    ) {
      throw new ForbiddenException("Access denied to this user");
    }
    return user;
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Update user" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: ICurrentUser,
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (
      currentUser.role !== UserRole.OWNER &&
      user.organizationId !== currentUser.organizationId
    ) {
      throw new ForbiddenException("Access denied to this user");
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Delete user" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (
      currentUser.role !== UserRole.OWNER &&
      user.organizationId !== currentUser.organizationId
    ) {
      throw new ForbiddenException("Access denied to this user");
    }
    return this.usersService.remove(id);
  }
}
