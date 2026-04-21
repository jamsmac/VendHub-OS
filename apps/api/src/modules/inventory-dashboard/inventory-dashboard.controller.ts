import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import {
  Roles,
  UserRole,
  CurrentUser,
  ICurrentUser,
} from "../../common/decorators";
import { InventoryDashboardService } from "./inventory-dashboard.service";

@ApiTags("Inventory Dashboard")
@Controller("inventory/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryDashboardController {
  constructor(private readonly service: InventoryDashboardService) {}

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({
    summary:
      "Aggregate inventory dashboard (value, top products, recent movements)",
  })
  async getDashboard(@CurrentUser() user: ICurrentUser) {
    return this.service.getDashboard(user.organizationId);
  }
}
