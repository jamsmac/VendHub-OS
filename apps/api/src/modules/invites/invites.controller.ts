import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ICurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums";
import { InvitesService } from "./invites.service";
import { CreateInviteDto } from "./dto/create-invite.dto";

@ApiTags("Invites")
@ApiBearerAuth()
@Controller("invites")
@UseGuards(JwtAuthGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Create an invite" })
  async create(
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const invite = await this.invitesService.create(
      dto.role,
      user.organizationId,
      user.id,
      dto.expiresInHours,
      dto.maxUses,
      dto.description,
    );

    return {
      id: invite.id,
      code: invite.code,
      role: invite.role,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      link: `/auth/register?code=${invite.code}`,
    };
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "List organization invites" })
  async findAll(
    @CurrentUser() user: ICurrentUser,
    @Query("includeExpired") includeExpired?: string,
  ) {
    return this.invitesService.findByOrganization(
      user.organizationId,
      includeExpired === "true",
    );
  }

  @Get("validate/:code")
  @Public()
  @ApiOperation({ summary: "Validate an invite code (public)" })
  async validate(@Param("code") code: string) {
    const invite = await this.invitesService.validateInvite(code);
    return {
      valid: true,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  }

  @Get(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Get invite details" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.invitesService.findById(id, user.organizationId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Revoke an invite" })
  async revoke(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<void> {
    await this.invitesService.revoke(id, user.organizationId);
  }
}
