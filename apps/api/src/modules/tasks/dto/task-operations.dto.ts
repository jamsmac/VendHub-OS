import { IsString, IsOptional, IsNumber, Length } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UploadPhotoBeforeDto {
  @ApiProperty({ description: "Photo URL" })
  @IsString()
  @Length(1, 1000)
  photoUrl: string;

  @ApiPropertyOptional({ description: "Latitude" })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude" })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UploadPhotoAfterDto {
  @ApiProperty({ description: "Photo URL" })
  @IsString()
  @Length(1, 1000)
  photoUrl: string;

  @ApiPropertyOptional({ description: "Completion notes" })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  completionNotes?: string;

  @ApiPropertyOptional({ description: "Latitude" })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude" })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
