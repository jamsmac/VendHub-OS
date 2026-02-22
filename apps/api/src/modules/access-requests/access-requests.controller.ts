import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { AccessRequestsService } from "./access-requests.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import {
  Roles,
  UserRole,
  CurrentUser,
  ICurrentUser,
  Public,
} from "../../common/decorators";
import { CreateAccessRequestDto } from "./dto/create-access-request.dto";
import {
  ApproveAccessRequestDto,
  RejectAccessRequestDto,
} from "./dto/approve-access-request.dto";
import { AccessRequestStatus } from "../telegram-bot/entities/access-request.entity";

@ApiTags("access-requests")
@Controller("access-requests")
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: "Submit an access request (public, used by Telegram bot)",
  })
  create(@Body() dto: CreateAccessRequestDto) {
    return this.accessRequestsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "List access requests" })
  @ApiQuery({ name: "status", required: false, enum: AccessRequestStatus })
  @ApiQuery({ name: "source", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @CurrentUser() user: ICurrentUser,
    @Query("status") status?: AccessRequestStatus,
    @Query("source") source?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.accessRequestsService.findAll(user.organizationId, {
      status,
      source,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Get access request statistics" })
  getStats(@CurrentUser() user: ICurrentUser) {
    return this.accessRequestsService.getStats(user.organizationId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get access request by ID" })
  @ApiParam({ name: "id", type: String })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.accessRequestsService.findById(id, user.organizationId);
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Approve an access request and create user account",
  })
  @ApiParam({ name: "id", type: String })
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveAccessRequestDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.accessRequestsService.approve(
      id,
      user.id,
      user.organizationId,
      dto,
    );
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Reject an access request" })
  @ApiParam({ name: "id", type: String })
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectAccessRequestDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.accessRequestsService.reject(
      id,
      user.id,
      user.organizationId,
      dto,
    );
  }
}
