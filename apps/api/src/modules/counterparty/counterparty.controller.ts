/**
 * Counterparty Controller
 * CRUD for counterparties (partners, suppliers, location owners) and contracts
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { CounterpartyService } from "./counterparty.service";
import {
  CreateCounterpartyDto,
  UpdateCounterpartyDto,
  CreateContractDto,
  CounterpartyFilterDto,
} from "./dto/counterparty.dto";
import { CurrentUser, Roles } from "../../common/decorators";
import { CounterpartyType } from "./entities/counterparty.entity";

@ApiTags("Counterparties")
@ApiBearerAuth()
@Controller("counterparties")
export class CounterpartyController {
  constructor(private readonly service: CounterpartyService) {}

  // ============================================================================
  // COUNTERPARTY CRUD
  // ============================================================================

  @Post()
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Create counterparty" })
  @ApiResponse({ status: 201, description: "Counterparty created" })
  async create(
    @CurrentUser("organizationId") organizationId: string,
    @Body() dto: CreateCounterpartyDto,
  ) {
    return this.service.createCounterparty(organizationId, dto);
  }

  @Get()
  @Roles("manager", "admin", "owner", "accountant")
  @ApiOperation({ summary: "List counterparties" })
  @ApiResponse({ status: 200, description: "List of counterparties" })
  async findAll(
    @CurrentUser("organizationId") organizationId: string,
    @Query() filter: CounterpartyFilterDto,
  ) {
    if (filter.type) {
      return this.service.getCounterpartiesByType(organizationId, filter.type);
    }
    return this.service.getCounterpartiesByType(
      organizationId,
      undefined as unknown as CounterpartyType,
    );
  }

  @Get(":id")
  @Roles("manager", "admin", "owner", "accountant")
  @ApiOperation({ summary: "Get counterparty by ID" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Counterparty details" })
  async findOne(
    @CurrentUser("organizationId") organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.getCounterparty(organizationId, id);
  }

  @Patch(":id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Update counterparty" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Counterparty updated" })
  async update(
    @CurrentUser("organizationId") organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCounterpartyDto,
  ) {
    return this.service.updateCounterparty(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete counterparty (soft)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 204, description: "Counterparty deleted" })
  async remove(
    @CurrentUser("organizationId") organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.service.deleteCounterparty(organizationId, id);
  }

  // ============================================================================
  // CONTRACTS
  // ============================================================================

  @Post(":counterpartyId/contracts")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Create contract for counterparty" })
  @ApiParam({ name: "counterpartyId", type: "string" })
  @ApiResponse({ status: 201, description: "Contract created" })
  async createContract(
    @CurrentUser("organizationId") organizationId: string,
    @Param("counterpartyId", ParseUUIDPipe) counterpartyId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.service.createContract(organizationId, {
      ...dto,
      counterpartyId,
    });
  }

  @Get(":counterpartyId/contracts")
  @Roles("manager", "admin", "owner", "accountant")
  @ApiOperation({ summary: "List contracts for counterparty" })
  @ApiParam({ name: "counterpartyId", type: "string" })
  @ApiResponse({ status: 200, description: "List of contracts" })
  async getContracts(
    @CurrentUser("organizationId") organizationId: string,
    @Param("counterpartyId", ParseUUIDPipe) counterpartyId: string,
  ) {
    return this.service.getCounterpartyContracts(
      organizationId,
      counterpartyId,
    );
  }

  @Get(":counterpartyId/contracts/:contractId")
  @Roles("manager", "admin", "owner", "accountant")
  @ApiOperation({ summary: "Get contract details" })
  @ApiParam({ name: "counterpartyId", type: "string" })
  @ApiParam({ name: "contractId", type: "string" })
  @ApiResponse({ status: 200, description: "Contract details" })
  async getContract(
    @CurrentUser("organizationId") organizationId: string,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    return this.service.getContract(organizationId, contractId);
  }

  @Post(":counterpartyId/contracts/:contractId/activate")
  @Roles("admin", "owner")
  @ApiOperation({ summary: "Activate contract" })
  @ApiParam({ name: "counterpartyId", type: "string" })
  @ApiParam({ name: "contractId", type: "string" })
  @ApiResponse({ status: 200, description: "Contract activated" })
  async activateContract(
    @CurrentUser("organizationId") organizationId: string,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    return this.service.activateContract(organizationId, contractId);
  }

  @Post(":counterpartyId/contracts/:contractId/terminate")
  @Roles("admin", "owner")
  @ApiOperation({ summary: "Terminate contract" })
  @ApiParam({ name: "counterpartyId", type: "string" })
  @ApiParam({ name: "contractId", type: "string" })
  @ApiResponse({ status: 200, description: "Contract terminated" })
  async terminateContract(
    @CurrentUser("organizationId") organizationId: string,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    return this.service.terminateContract(organizationId, contractId);
  }

  // ============================================================================
  // COMMISSIONS
  // ============================================================================

  @Get(":counterpartyId/contracts/:contractId/commissions")
  @Roles("manager", "admin", "owner", "accountant")
  @ApiOperation({ summary: "Get commission calculations for contract" })
  @ApiParam({ name: "counterpartyId", type: "string" })
  @ApiParam({ name: "contractId", type: "string" })
  @ApiResponse({ status: 200, description: "List of commission calculations" })
  async getCommissions(
    @CurrentUser("organizationId") organizationId: string,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    return this.service.getCommissionCalculations(organizationId, contractId);
  }

  @Get(":counterpartyId/contracts/:contractId/commissions/total")
  @Roles("manager", "admin", "owner", "accountant")
  @ApiOperation({ summary: "Get total commission amount for contract" })
  @ApiParam({ name: "counterpartyId", type: "string" })
  @ApiParam({ name: "contractId", type: "string" })
  @ApiResponse({ status: 200, description: "Total commission amount" })
  async getTotalCommission(
    @CurrentUser("organizationId") organizationId: string,
    @Param("contractId", ParseUUIDPipe) contractId: string,
  ) {
    const total = await this.service.calculateTotalCommission(
      organizationId,
      contractId,
    );
    return { total };
  }
}
