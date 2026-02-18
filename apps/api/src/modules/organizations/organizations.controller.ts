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
  @ApiOperation({ summary: "Get organization by ID" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.organizationsService.findById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Update organization" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: "Delete organization (soft delete)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.organizationsService.remove(id);
  }
}
