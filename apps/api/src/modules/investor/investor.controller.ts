import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";
import { InvestorService } from "./investor.service";
import { CreateInvestorProfileDto } from "./dto/create-investor-profile.dto";
import { CreateDividendDto } from "./dto/create-dividend.dto";

@ApiTags("Investor")
@Controller("investor")
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  @ApiOperation({ summary: "Get investor dashboard for current user" })
  @Get("dashboard")
  getDashboard(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.investorService.getDashboard(organizationId, userId);
  }

  @ApiOperation({ summary: "Get current user investor profile" })
  @Get("profile")
  getMyProfile(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.investorService.findProfile(organizationId, userId);
  }

  @ApiOperation({ summary: "List all investor profiles (admin)" })
  @Get("profiles")
  @Roles("owner", "admin")
  findAllProfiles(@CurrentOrganizationId() organizationId: string) {
    return this.investorService.findAllProfiles(organizationId);
  }

  @ApiOperation({ summary: "Create an investor profile" })
  @Post("profiles")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.CREATED)
  createProfile(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateInvestorProfileDto,
  ) {
    return this.investorService.createProfile(organizationId, userId, dto);
  }

  @ApiOperation({ summary: "Update an investor profile" })
  @Patch("profiles/:id")
  @Roles("owner", "admin")
  updateProfile(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateInvestorProfileDto>,
  ) {
    return this.investorService.updateProfile(id, organizationId, dto);
  }

  @ApiOperation({ summary: "Create a dividend payment record" })
  @Post("dividends")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.CREATED)
  createDividend(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateDividendDto,
  ) {
    return this.investorService.createDividend(organizationId, userId, dto);
  }

  @ApiOperation({ summary: "List dividends for an investor" })
  @Get("dividends/:profileId")
  @Roles("owner", "admin")
  findDividends(
    @Param("profileId", ParseUUIDPipe) profileId: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.investorService.findDividends(profileId, organizationId);
  }
}
