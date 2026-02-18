/**
 * Update Location DTO
 * All fields from CreateLocationDto become optional
 */

import { PartialType } from "@nestjs/swagger";
import { CreateLocationDto } from "./create-location.dto";

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
