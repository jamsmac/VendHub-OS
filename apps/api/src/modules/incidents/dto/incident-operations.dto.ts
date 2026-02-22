import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResolveIncidentDto {
  @ApiProperty({ description: "Resolution description" })
  @IsString()
  @Length(1, 1000)
  resolution: string;
}
