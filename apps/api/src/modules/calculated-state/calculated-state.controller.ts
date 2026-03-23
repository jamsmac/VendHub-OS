/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { CalculatedStateService } from "./calculated-state.service";

@ApiTags("Calculated State")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("machines")
export class CalculatedStateController {
  constructor(private readonly stateService: CalculatedStateService) {}

  @Get(":machineId/state")
  @ApiOperation({
    summary:
      "Get calculated machine state (bunker levels, components, cleaning)",
  })
  async getMachineState(
    @Param("machineId") machineId: string,
    @Request() req: any,
  ) {
    return this.stateService.getMachineState(
      machineId,
      req.user.organizationId,
    );
  }

  @Get(":machineId/pnl")
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
    @Request() req: any,
  ) {
    return this.stateService.getMachinePnL(
      machineId,
      req.user.organizationId,
      new Date(from),
      new Date(to),
    );
  }
}
