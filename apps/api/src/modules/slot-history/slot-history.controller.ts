import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";
import { SlotHistoryService } from "./services/slot-history.service";

class QuerySlotHistoryDto {
  @ApiPropertyOptional({ description: "Page size (1..200)", default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: "Offset", default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

@ApiTags("Slot History")
@ApiBearerAuth()
@Controller("slot-history")
export class SlotHistoryController {
  constructor(private readonly service: SlotHistoryService) {}

  @Get("machine/:machineId")
  @Roles(
    "owner",
    "admin",
    "manager",
    "warehouse",
    "accountant",
    "operator",
    "viewer",
  )
  @ApiOperation({ summary: "List slot history entries for a machine" })
  @ApiOkResponse({ description: "Slot history retrieved" })
  listByMachine(
    @CurrentOrganizationId() organizationId: string,
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @Query() query: QuerySlotHistoryDto,
  ) {
    return this.service.listByMachine({
      organizationId,
      machineId,
      ...(query.limit !== undefined && { limit: query.limit }),
      ...(query.offset !== undefined && { offset: query.offset }),
    });
  }
}
