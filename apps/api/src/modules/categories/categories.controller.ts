import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import {
  Roles,
  UserRole,
  CurrentUser,
  ICurrentUser,
} from "../../common/decorators";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@ApiTags("categories")
@Controller("categories")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "List all product categories for the organization" })
  list(@CurrentUser() user: ICurrentUser) {
    return this.service.list(user.organizationId);
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
  @ApiOperation({ summary: "Get category by ID" })
  @ApiParam({ name: "id", type: String })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.service.findById(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new category" })
  @ApiResponse({ status: 201, description: "Category created" })
  @ApiResponse({ status: 409, description: "Code already exists in org" })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: ICurrentUser) {
    return this.service.create(user.organizationId, dto, user.id);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update a category" })
  @ApiParam({ name: "id", type: String })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.service.update(id, user.organizationId, dto, user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Soft-delete a category" })
  @ApiParam({ name: "id", type: String })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<void> {
    await this.service.remove(id, user.organizationId);
  }
}
