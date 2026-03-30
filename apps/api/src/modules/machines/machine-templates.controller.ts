/**
 * MachineTemplatesController
 *
 * REST endpoints for machine template management (Справочники → Шаблоны автоматов).
 * Templates define blueprints for machine types (coffee, snack, water, etc.)
 * and auto-provision containers, slots, and components when creating a machine.
 */

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
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { MachineTemplatesService } from "./machine-templates.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CreateMachineTemplateDto,
  UpdateMachineTemplateDto,
  CreateMachineFromTemplateDto,
} from "./dto/machine-template.dto";

@ApiTags("machine-templates")
@Controller("machine-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MachineTemplatesController {
  constructor(
    private readonly templatesService: MachineTemplatesService,
  ) {}

  // ── List all templates ──

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  )
  @ApiOperation({ summary: "Get all machine templates for organization" })
  @ApiResponse({ status: 200, description: "List of machine templates" })
  findAll(@CurrentUser() user: User) {
    return this.templatesService.findAll(user.organizationId);
  }

  // ── List active templates only (for dropdowns / machine creation) ──

  @Get("active")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  )
  @ApiOperation({ summary: "Get active machine templates (for selectors)" })
  @ApiResponse({ status: 200, description: "List of active templates" })
  findActive(@CurrentUser() user: User) {
    return this.templatesService.findActive(user.organizationId);
  }

  // ── Get single template ──

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  )
  @ApiOperation({ summary: "Get machine template by ID" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Machine template details" })
  @ApiResponse({ status: 404, description: "Template not found" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.findOne(id, user.organizationId);
  }

  // ── Create template ──

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new machine template" })
  @ApiResponse({ status: 201, description: "Template created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  create(
    @Body() dto: CreateMachineTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.create(
      dto,
      user.organizationId,
      user.id,
    );
  }

  // ── Update template ──

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Update machine template" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Template updated" })
  @ApiResponse({ status: 404, description: "Template not found" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMachineTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.update(
      id,
      dto,
      user.organizationId,
      user.id,
    );
  }

  // ── Soft-delete template ──

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete machine template (soft)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 204, description: "Template deleted" })
  @ApiResponse({ status: 404, description: "Template not found" })
  @ApiResponse({
    status: 409,
    description: "Cannot delete system template",
  })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.remove(id, user.organizationId);
  }

  // ── Create machine from template (the main workflow) ──

  @Post("create-machine")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Create a new machine from template",
    description:
      "Creates a machine and auto-provisions containers, slots, and components based on template defaults.",
  })
  @ApiResponse({ status: 201, description: "Machine created from template" })
  @ApiResponse({ status: 404, description: "Template not found" })
  @ApiResponse({ status: 400, description: "Validation error" })
  createFromTemplate(
    @Body() dto: CreateMachineFromTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.createFromTemplate(
      dto,
      user.organizationId,
      user.id,
    );
  }
}
