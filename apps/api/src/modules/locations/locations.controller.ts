import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { LocationsService } from "./locations.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import {
  QueryLocationsDto,
  QueryNearbyLocationsDto,
} from "./dto/query-location.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles, UserRole } from "../../common/decorators";
import {
  CurrentUser,
  ICurrentUser,
} from "../../common/decorators/current-user.decorator";
import { Location } from "./entities/location.entity";

@ApiTags("locations")
@Controller("locations")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Create a new location" })
  create(
    @Body() createLocationDto: CreateLocationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.locationsService.create({
      ...createLocationDto,
      organizationId: user.organizationId,
    } as Partial<Location>);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get all locations with pagination" })
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query() query: QueryLocationsDto,
  ) {
    return this.locationsService.findAll(user.organizationId, query);
  }

  @Get("nearby")
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get nearby locations" })
  findNearby(
    @Query() query: QueryNearbyLocationsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.locationsService.findNearby(
      query.lat,
      query.lng,
      query.radius ?? 5,
      user.organizationId,
    );
  }

  @Get(":id")
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get location by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.locationsService.findById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Update location" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(
      id,
      updateLocationDto as Partial<Location>,
    );
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Delete location" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.locationsService.remove(id);
  }
}
