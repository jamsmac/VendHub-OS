import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { BatchMovementsService } from "./batch-movements.service";
import { CreateBatchMovementDto } from "./dto/create-batch-movement.dto";

interface AuthenticatedRequest {
  user: { id: string; organizationId: string };
}

@ApiTags("Batch Movements")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("batch-movements")
export class BatchMovementsController {
  constructor(private readonly batchMovementsService: BatchMovementsService) {}

  @Post()
  @Roles("owner", "admin", "manager", "operator", "warehouse")
  @ApiOperation({ summary: "Record a batch movement" })
  async create(
    @Body() dto: CreateBatchMovementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.batchMovementsService.createMovement(
      dto,
      req.user.id,
      req.user.organizationId,
    );
  }

  @Get("batch/:batchId")
  @Roles("owner", "admin", "manager", "operator", "warehouse")
  @ApiOperation({ summary: "Get movement history for a batch" })
  async getBatchHistory(
    @Param("batchId") batchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.batchMovementsService.getBatchHistory(
      batchId,
      req.user.organizationId,
    );
  }

  @Get("container/:containerId")
  @Roles("owner", "admin", "manager", "operator", "warehouse")
  @ApiOperation({ summary: "Get movements for a container/bunker" })
  async getContainerMovements(
    @Param("containerId") containerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.batchMovementsService.getContainerMovements(
      containerId,
      req.user.organizationId,
    );
  }
}
