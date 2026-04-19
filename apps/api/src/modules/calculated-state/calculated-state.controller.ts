import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CalculatedStateService } from "./calculated-state.service";

interface AuthenticatedRequest {
  user: { id: string; organizationId: string };
}

@ApiTags("Calculated State")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("machines")
export class CalculatedStateController {
  constructor(private readonly stateService: CalculatedStateService) {}

  @Get(":machineId/state")
  @Roles("owner", "admin", "manager", "operator")
  @ApiOperation({
    summary:
      "Get calculated machine state (bunker levels, components, cleaning)",
  })
  async getMachineState(
    @Param("machineId") machineId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.stateService.getMachineState(
      machineId,
      req.user.organizationId,
    );
  }

  @Get(":machineId/pnl")
  @Roles("owner", "admin", "manager", "accountant")
  @ApiOperation({
    summary: "Get P&L (Profit & Loss) for a machine over a period",
  })
  @ApiQuery({
    name: "from",
    required: true,
    type: String,
    example: "2026-01-01",
  })
  @ApiQuery({ name: "to", required: true, type: String, example: "2026-03-21" })
  async getMachinePnL(
    @Param("machineId") machineId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.stateService.getMachinePnL(
      machineId,
      req.user.organizationId,
      new Date(from),
      new Date(to),
    );
  }
}
