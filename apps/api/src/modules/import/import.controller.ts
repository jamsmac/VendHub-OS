/**
 * Import Controller
 * REST API endpoints for data imports
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { ImportService } from './import.service';
import {
  ImportJob,
  ImportTemplate,
  ImportType,
  ImportStatus,
  ImportSource,
} from './entities/import.entity';
import { ImportSession, DomainType, ImportSessionStatus, ApprovalStatus } from './entities/import-session.entity';
import { ImportAuditLog } from './entities/import-audit-log.entity';
import {
  CreateImportSessionDto,
  ClassifySessionDto,
  ValidateSessionDto,
  ApproveSessionDto,
  RejectSessionDto,
  QueryImportSessionsDto,
  QueryAuditLogDto,
} from './dto/import-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentOrganizationId, ICurrentUser } from '../../common/decorators/current-user.decorator';

// DTOs - keeping for API documentation/future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class _CreateImportDto {
  importType: ImportType;
  source: ImportSource;
  templateId?: string;
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    dryRun?: boolean;
    mapping?: Record<string, string>;
    dateFormat?: string;
    delimiter?: string;
  };
}

class CreateTemplateDto {
  name: string;
  description?: string;
  importType: ImportType;
  source: ImportSource;
  columnMappings: Record<string, string>;
  defaultValues?: Record<string, any>;
  options?: any;
}

@ApiTags('Import')
@ApiBearerAuth()
@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // ========================================================================
  // IMPORT JOBS
  // ========================================================================

  @Post('upload')
  @Roles('manager', 'admin', 'owner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file and create import job' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        importType: { type: 'string', enum: Object.values(ImportType) },
        templateId: { type: 'string' },
        skipDuplicates: { type: 'boolean' },
        updateExisting: { type: 'boolean' },
        dryRun: { type: 'boolean' },
      },
    },
  })
  async uploadAndCreateJob(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ): Promise<{ job: ImportJob; preview: { headers: string[]; sampleRows: any[] } }> {
    if (!file) {
      throw new Error('No file provided');
    }

    // Determine source type from file extension
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    let source: ImportSource;

    switch (extension) {
      case 'csv':
        source = ImportSource.CSV;
        break;
      case 'xlsx':
      case 'xls':
        source = ImportSource.EXCEL;
        break;
      case 'json':
        source = ImportSource.JSON;
        break;
      default:
        throw new Error('Unsupported file format');
    }

    // Parse file for preview
    let parsed: { headers: string[]; rows: any[] };

    if (source === ImportSource.CSV) {
      parsed = await this.importService.parseCSV(file.buffer, {
        delimiter: body.delimiter,
      });
    } else if (source === ImportSource.EXCEL) {
      parsed = await this.importService.parseExcel(file.buffer);
    } else {
      parsed = await this.importService.parseJSON(file.buffer);
    }

    // Create import job
    const job = await this.importService.createImportJob(
      organizationId,
      user.id,
      body.importType,
      source,
      file.originalname,
      undefined, // File URL will be set after upload to storage
      {
        skipDuplicates: body.skipDuplicates === 'true',
        updateExisting: body.updateExisting === 'true',
        dryRun: body.dryRun === 'true',
        templateId: body.templateId,
      },
    );

    return {
      job,
      preview: {
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, 5),
      },
    };
  }

  @Post(':id/validate')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Validate import data' })
  @ApiParam({ name: 'id', description: 'Import job ID' })
  async validateImport(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { rows: any[]; mapping?: Record<string, string> },
  ) {
    const job = await this.importService.getImportJob(organizationId, id);

    const result = await this.importService.validateImportData(
      organizationId,
      id,
      body.rows,
      job.importType,
      body.mapping,
    );

    return {
      jobId: id,
      totalRows: body.rows.length,
      validRows: result.validRows.length,
      invalidRows: result.invalidRows.length,
      errors: result.invalidRows.flatMap(r =>
        r.errors.map(e => ({ row: r.rowNumber, field: e.field, message: e.message })),
      ),
      warnings: result.warnings,
    };
  }

  @Post(':id/execute')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Execute import job' })
  @ApiParam({ name: 'id', description: 'Import job ID' })
  async executeImport(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: { rows: any[]; mapping?: Record<string, string> },
  ) {
    // This would trigger the actual import process
    // For a full implementation, this would be a background job

    return {
      jobId: id,
      status: 'processing',
      message: 'Import job started. Check job status for progress.',
    };
  }

  @Get('jobs')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List import jobs' })
  @ApiQuery({ name: 'importType', enum: ImportType, required: false })
  @ApiQuery({ name: 'status', enum: ImportStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async listJobs(
    @CurrentOrganizationId() organizationId: string,
    @Query('importType') importType?: ImportType,
    @Query('status') status?: ImportStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.importService.listImportJobs(
      organizationId,
      { importType, status },
      page || 1,
      limit || 20,
    );
  }

  @Get('jobs/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get import job details' })
  @ApiParam({ name: 'id', description: 'Import job ID' })
  async getJob(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportJob> {
    return this.importService.getImportJob(organizationId, id);
  }

  @Post('jobs/:id/cancel')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Cancel import job' })
  @ApiParam({ name: 'id', description: 'Import job ID' })
  async cancelJob(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportJob> {
    return this.importService.cancelImportJob(organizationId, id, user.id);
  }

  // ========================================================================
  // TEMPLATES
  // ========================================================================

  @Post('templates')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create import template' })
  async createTemplate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateTemplateDto,
  ): Promise<ImportTemplate> {
    return this.importService.createTemplate(organizationId, user.id, dto);
  }

  @Get('templates')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List import templates' })
  @ApiQuery({ name: 'importType', enum: ImportType, required: false })
  async listTemplates(
    @CurrentOrganizationId() organizationId: string,
    @Query('importType') importType?: ImportType,
  ): Promise<ImportTemplate[]> {
    return this.importService.getTemplates(organizationId, importType);
  }

  @Get('templates/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get import template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplate(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportTemplate> {
    return this.importService.getTemplate(organizationId, id);
  }

  @Delete('templates/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete import template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.importService.deleteTemplate(organizationId, id);
  }

  // ========================================================================
  // INTELLIGENT IMPORT SESSIONS
  // ========================================================================

  @Post('sessions')
  @Roles('manager', 'admin', 'owner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create import session with file upload' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        domain: { type: 'string', enum: Object.values(DomainType) },
        templateId: { type: 'string', format: 'uuid' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Import session created successfully' })
  async createSession(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportSessionDto,
  ): Promise<ImportSession> {
    if (!file) {
      throw new Error('No file provided');
    }

    return this.importService.createSession(file, dto, organizationId, user.id);
  }

  @Get('sessions')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List import sessions' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'domain', enum: DomainType, required: false })
  @ApiQuery({ name: 'status', enum: ImportSessionStatus, required: false })
  @ApiQuery({ name: 'approvalStatus', enum: ApprovalStatus, required: false })
  @ApiQuery({ name: 'dateFrom', type: String, required: false })
  @ApiQuery({ name: 'dateTo', type: String, required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of import sessions' })
  async listSessions(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryImportSessionsDto,
  ): Promise<{ data: ImportSession[]; total: number; page: number; limit: number }> {
    return this.importService.getSessions(query, organizationId);
  }

  @Get('sessions/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get import session details' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiResponse({ status: 200, description: 'Import session details' })
  async getSession(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportSession> {
    return this.importService.getSession(id, organizationId);
  }

  @Post('sessions/:id/classify')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Classify and map columns for import session' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiResponse({ status: 200, description: 'Classification result with column mapping and confidence score' })
  async classifySession(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClassifySessionDto,
  ): Promise<ImportSession> {
    return this.importService.classifySession(id, dto, organizationId);
  }

  @Post('sessions/:id/validate')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Validate import session data against rules' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiResponse({ status: 200, description: 'Validation result with errors and warnings' })
  async validateSession(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidateSessionDto,
  ): Promise<ImportSession> {
    return this.importService.validateSession(id, organizationId);
  }

  @Post('sessions/:id/submit-for-approval')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Submit import session for approval' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiResponse({ status: 200, description: 'Session submitted for approval or auto-approved' })
  async submitForApproval(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportSession> {
    return this.importService.submitForApproval(id, organizationId);
  }

  @Post('sessions/:id/approve')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve import session' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiResponse({ status: 200, description: 'Session approved and optionally executed' })
  async approveSession(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveSessionDto,
  ): Promise<ImportSession> {
    return this.importService.approveSession(id, dto, user.id, organizationId);
  }

  @Post('sessions/:id/reject')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Reject import session' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiResponse({ status: 200, description: 'Session rejected with reason' })
  async rejectSession(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSessionDto,
  ): Promise<ImportSession> {
    return this.importService.rejectSession(id, dto, user.id, organizationId);
  }

  @Post('sessions/:id/execute')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Execute approved import session' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiResponse({ status: 200, description: 'Import execution result' })
  async executeSession(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportSession> {
    return this.importService.executeImportSession(id, organizationId, user.id);
  }

  @Get('sessions/:id/audit-log')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get audit log for import session' })
  @ApiParam({ name: 'id', description: 'Import session ID' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'actionType', enum: ['insert', 'update', 'merge', 'skip', 'delete', 'restore'], required: false })
  @ApiQuery({ name: 'tableName', type: String, required: false })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
  async getSessionAuditLog(
    @CurrentOrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryAuditLogDto,
  ): Promise<{ data: ImportAuditLog[]; total: number; page: number; limit: number }> {
    return this.importService.getAuditLog(id, query, organizationId);
  }

  // ========================================================================
  // SCHEMA DEFINITIONS & VALIDATION RULES
  // ========================================================================

  @Get('schemas')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List schema definitions for import auto-classification' })
  @ApiQuery({ name: 'domain', enum: DomainType, required: false })
  @ApiResponse({ status: 200, description: 'List of schema definitions' })
  async listSchemaDefinitions(
    @Query('domain') domain?: DomainType,
  ) {
    return this.importService.getSchemaDefinitions(domain);
  }

  @Get('validation-rules')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List validation rules for import data' })
  @ApiQuery({ name: 'domain', enum: DomainType, required: false })
  @ApiResponse({ status: 200, description: 'List of validation rules' })
  async listValidationRules(
    @Query('domain') domain?: DomainType,
  ) {
    return this.importService.getValidationRules(domain);
  }

  // ========================================================================
  // SAMPLE FILES
  // ========================================================================

  @Get('samples/:importType')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get sample import file structure' })
  @ApiParam({ name: 'importType', enum: ImportType })
  async getSampleStructure(@Param('importType') importType: ImportType) {
    const samples: Record<ImportType, { columns: string[]; sampleRow: any }> = {
      [ImportType.PRODUCTS]: {
        columns: ['name', 'nameUz', 'sku', 'barcode', 'category', 'price', 'costPrice', 'description'],
        sampleRow: {
          name: 'Coca-Cola 0.5л',
          nameUz: 'Coca-Cola 0.5l',
          sku: 'COCA-05',
          barcode: '4600123456789',
          category: 'beverages',
          price: 8000,
          costPrice: 5500,
          description: 'Газированный напиток',
        },
      },
      [ImportType.MACHINES]: {
        columns: ['serialNumber', 'model', 'manufacturer', 'locationName', 'address', 'latitude', 'longitude'],
        sampleRow: {
          serialNumber: 'VM-001-2024',
          model: 'VendMax 3000',
          manufacturer: 'VendMax',
          locationName: 'ТЦ Мега',
          address: 'г. Ташкент, ул. Навои, 1',
          latitude: 41.311,
          longitude: 69.279,
        },
      },
      [ImportType.EMPLOYEES]: {
        columns: ['firstName', 'lastName', 'middleName', 'phone', 'email', 'employeeRole', 'hireDate'],
        sampleRow: {
          firstName: 'Иван',
          lastName: 'Петров',
          middleName: 'Сергеевич',
          phone: '+998901234567',
          email: 'ivan@example.com',
          employeeRole: 'operator',
          hireDate: '2024-01-15',
        },
      },
      [ImportType.SALES]: {
        columns: ['machineSerial', 'saleDate', 'productSku', 'quantity', 'amount', 'paymentMethod'],
        sampleRow: {
          machineSerial: 'VM-001-2024',
          saleDate: '2024-01-15 14:30:00',
          productSku: 'COCA-05',
          quantity: 1,
          amount: 8000,
          paymentMethod: 'card',
        },
      },
      // Add other types as needed
      [ImportType.USERS]: { columns: ['email', 'firstName', 'lastName', 'role', 'phone'], sampleRow: {} },
      [ImportType.TRANSACTIONS]: { columns: ['transactionDate', 'type', 'amount', 'description'], sampleRow: {} },
      [ImportType.INVENTORY]: { columns: ['productSku', 'quantity', 'location'], sampleRow: {} },
      [ImportType.CUSTOMERS]: { columns: ['phone', 'email', 'firstName', 'lastName'], sampleRow: {} },
      [ImportType.PRICES]: { columns: ['productSku', 'price', 'effectiveDate'], sampleRow: {} },
      [ImportType.CATEGORIES]: { columns: ['name', 'nameUz', 'parentCategory', 'sortOrder'], sampleRow: {} },
      [ImportType.LOCATIONS]: { columns: ['name', 'address', 'city', 'latitude', 'longitude'], sampleRow: {} },
      [ImportType.CONTRACTORS]: { columns: ['companyName', 'contactPerson', 'phone', 'email', 'serviceType'], sampleRow: {} },
    };

    return samples[importType] || { columns: [], sampleRow: {} };
  }
}
