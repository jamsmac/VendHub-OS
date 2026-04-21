import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateCategoryDto } from "./create-category.dto";

/**
 * Category update payload. `code` is immutable (it's used as a stable slug in
 * product joins). To change the category code, create a new category and
 * re-link products.
 */
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ["code"] as const),
) {}
