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
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles, UserRole } from "../../common/decorators";
import {
  CurrentUser,
  ICurrentUser,
} from "../../common/decorators/current-user.decorator";

@ApiTags("organizations")
@Controller("organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: "Create organization" })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: "Get all organizations" })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get organization by ID" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (user.role !== UserRole.OWNER && user.organizationId !== id) {
      throw new ForbiddenException("Access denied to this organization");
    }
    return this.organizationsService.findById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Update organization" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (user.role !== UserRole.OWNER && user.organizationId !== id) {
      throw new ForbiddenException("Access denied to this organization");
    }
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: "Delete organization (soft delete)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<void> {
    await this.organizationsService.remove(id, user.organizationId);
  }
}
