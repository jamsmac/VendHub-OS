/**
 * Containers Controller
 * REST API for managing hoppers/bunkers within vending machines
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ContainersService } from "./containers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User, UserRole } from "../users/entities/user.entity";
import { CreateContainerDto } from "./dto/create-container.dto";
import { UpdateContainerDto } from "./dto/update-container.dto";
import { RefillContainerDto } from "./dto/refill-container.dto";
import { ContainerStatus } from "./entities/container.entity";

@ApiTags("containers")
@Controller("containers")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new container (hopper/bunker)" })
  @ApiResponse({ status: 201, description: "Container created successfully" })
  @ApiResponse({
    status: 400,
    description: "Validation error or duplicate slot number",
  })
  @ApiResponse({ status: 403, description: "Forbidden" })
  create(@Body() dto: CreateContainerDto, @CurrentUser() user: User) {
    return this.containersService.create(dto, user.organizationId, user.id);
  }

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({ summary: "Get all containers with pagination and filters" })
  @ApiQuery({
    name: "machineId",
    required: false,
    type: String,
    description: "Filter by machine UUID",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ContainerStatus,
    description: "Filter by container status",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20, max: 100)",
  })
  @ApiResponse({ status: 200, description: "Paginated list of containers" })
  findAll(
    @CurrentUser() user: User,
    @Query("machineId") machineId?: string,
    @Query("status") status?: ContainerStatus,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.containersService.findAll(user.organizationId, {
      machineId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("low-levels")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({
    summary: "Get containers with low levels for a machine",
  })
  @ApiQuery({
    name: "machineId",
    required: true,
    type: String,
    description: "Machine UUID to check",
  })
  @ApiResponse({
    status: 200,
    description:
      "List of low-level containers with fill percentage and deficit",
  })
  checkLowLevels(
    @CurrentUser() user: User,
    @Query("machineId", ParseUUIDPipe) machineId: string,
  ) {
    return this.containersService.checkLowLevels(
      machineId,
      user.organizationId,
    );
  }

  @Get("low-levels/all")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({
    summary: "Get all containers with low levels across the organization",
  })
  @ApiResponse({
    status: 200,
    description:
      "Org-wide list of low-level containers with fill percentage and deficit",
  })
  checkAllLowLevels(@CurrentUser() user: User) {
    return this.containersService.checkAllLowLevels(user.organizationId);
  }

  @Get("by-nomenclature/:nomenclatureId")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({
    summary: "Get all containers for a specific nomenclature (ingredient)",
  })
  @ApiParam({
    name: "nomenclatureId",
    type: "string",
    format: "uuid",
    description: "Nomenclature UUID",
  })
  @ApiResponse({
    status: 200,
    description: "List of containers using this nomenclature",
  })
  findByNomenclature(
    @Param("nomenclatureId", ParseUUIDPipe) nomenclatureId: string,
    @CurrentUser() user: User,
  ) {
    return this.containersService.findByNomenclature(
      nomenclatureId,
      user.organizationId,
    );
  }

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({ summary: "Get container by ID" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Container found" })
  @ApiResponse({ status: 404, description: "Container not found" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.containersService.findOne(id, user.organizationId);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update container" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Container updated" })
  @ApiResponse({ status: 404, description: "Container not found" })
  @ApiResponse({
    status: 400,
    description: "Validation error or duplicate slot number",
  })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateContainerDto,
    @CurrentUser() user: User,
  ) {
    return this.containersService.update(id, dto, user.organizationId, user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Delete container (soft delete)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Container deleted" })
  @ApiResponse({ status: 404, description: "Container not found" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.containersService.remove(id, user.organizationId);
  }

  // ============================================================================
  // REFILL
  // ============================================================================

  @Post(":id/refill")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({
    summary: "Refill a container with additional product quantity",
  })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Container refilled successfully" })
  @ApiResponse({ status: 400, description: "Refill would exceed capacity" })
  @ApiResponse({ status: 404, description: "Container not found" })
  refill(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RefillContainerDto,
    @CurrentUser() user: User,
  ) {
    return this.containersService.refill(id, dto, user.organizationId, user.id);
  }

  // ============================================================================
  // BY MACHINE
  // ============================================================================

  @Get("by-machine/:machineId")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({ summary: "Get all containers for a specific machine" })
  @ApiParam({
    name: "machineId",
    type: "string",
    format: "uuid",
    description: "Machine UUID",
  })
  @ApiResponse({
    status: 200,
    description: "List of containers for the machine",
  })
  findByMachine(
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @CurrentUser() user: User,
  ) {
    return this.containersService.findByMachine(machineId, user.organizationId);
  }

  @Get("by-machine/:machineId/stats")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({
    summary: "Get container statistics for a specific machine",
  })
  @ApiParam({
    name: "machineId",
    type: "string",
    format: "uuid",
    description: "Machine UUID",
  })
  @ApiResponse({
    status: 200,
    description:
      "Container statistics (total, active, empty, maintenance, avgFillPercentage)",
  })
  getStatsByMachine(
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @CurrentUser() user: User,
  ) {
    return this.containersService.getStatsByMachine(
      machineId,
      user.organizationId,
    );
  }
}
