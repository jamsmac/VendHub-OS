import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { DataParserService } from "./data-parser.service";
import { ParseOptionsDto, RecoverParseDto } from "./dto/data-parser.dto";

@ApiTags("Data Parser")
@ApiBearerAuth()
@Controller("data-parser")
export class DataParserController {
  constructor(private readonly dataParserService: DataParserService) {}

  @Get("formats")
  @ApiOperation({ summary: "List supported file formats" })
  getFormats() {
    return this.dataParserService.getSupportedFormats();
  }

  @Post("parse")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Parse uploaded file (CSV, Excel, JSON)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async parse(
    @UploadedFile() file: Express.Multer.File,
    @Query() options: ParseOptionsDto,
  ) {
    this.validateFile(file);
    return this.dataParserService.parse(file.buffer, file.originalname, {
      delimiter: options.delimiter,
      encoding: (options.encoding as BufferEncoding) || undefined,
      sheetIndex: options.sheetIndex,
      headerRow: options.headerRow,
      maxRows: options.maxRows,
    });
  }

  @Post("parse/sales")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Parse and validate sales data import" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async parseSales(
    @UploadedFile() file: Express.Multer.File,
    @Query() options: ParseOptionsDto,
  ) {
    this.validateFile(file);
    return this.dataParserService.parseSales(file.buffer, file.originalname, {
      delimiter: options.delimiter,
      encoding: (options.encoding as BufferEncoding) || undefined,
      sheetIndex: options.sheetIndex,
      headerRow: options.headerRow,
      maxRows: options.maxRows,
    });
  }

  @Post("parse/counterparties")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Parse and validate counterparty data import" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async parseCounterparties(
    @UploadedFile() file: Express.Multer.File,
    @Query() options: ParseOptionsDto,
  ) {
    this.validateFile(file);
    return this.dataParserService.parseCounterparties(
      file.buffer,
      file.originalname,
      {
        delimiter: options.delimiter,
        encoding: (options.encoding as BufferEncoding) || undefined,
        sheetIndex: options.sheetIndex,
        headerRow: options.headerRow,
        maxRows: options.maxRows,
      },
    );
  }

  @Post("parse/inventory")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Parse and validate inventory data import" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async parseInventory(
    @UploadedFile() file: Express.Multer.File,
    @Query() options: ParseOptionsDto,
  ) {
    this.validateFile(file);
    return this.dataParserService.parseInventory(
      file.buffer,
      file.originalname,
      {
        delimiter: options.delimiter,
        encoding: (options.encoding as BufferEncoding) || undefined,
        sheetIndex: options.sheetIndex,
        headerRow: options.headerRow,
        maxRows: options.maxRows,
      },
    );
  }

  @Post("detect-format")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Detect file format without full parsing" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  detectFormat(@UploadedFile() file: Express.Multer.File) {
    this.validateFile(file);
    return this.dataParserService.detectFormat(file.buffer, file.originalname);
  }

  @Post("recover")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Attempt to recover data from a file with parsing errors",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async recover(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: RecoverParseDto,
  ) {
    this.validateFile(file);
    return this.dataParserService.recover(file.buffer, file.originalname, {
      delimiter: dto.delimiter,
      encoding: (dto.encoding as BufferEncoding) || undefined,
    });
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException("File size exceeds 10 MB limit");
    }
  }
}
