import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  ValidationPipe,
  ValidationPipeOptions,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";

/**
 * Duck-type for `createZodDto`-produced classes. `nestjs-zod` exports
 * `isZodDto` only at the `nestjs-zod/dto` subpath which requires
 * `moduleResolution: node16`. The project still ships classic `node`
 * resolution, so we inline the same check it performs: every class made
 * by `createZodDto` has a static `isZodDto: true` flag.
 */
function isZodDto(
  metatype: unknown,
): metatype is { new (): unknown; isZodDto: true } {
  return (
    typeof metatype === "function" &&
    (metatype as { isZodDto?: boolean }).isZodDto === true
  );
}

/**
 * Dispatches validation based on the parameter's metatype:
 *  - createZodDto-backed class → ZodValidationPipe (parses against the
 *    embedded Zod schema, throws structured 400 with issue paths)
 *  - any other class (or no metatype) → class-validator ValidationPipe
 *    with the original project options (whitelist, forbidNonWhitelisted,
 *    transform, etc.)
 *
 * Safe rollback: swap `HybridValidationPipe` back to `ValidationPipe` in
 * main.ts. Existing class-validator DTOs (~219 files) take the same code
 * path either way.
 */
@Injectable()
export class HybridValidationPipe implements PipeTransform {
  private readonly zodPipe = new ZodValidationPipe();
  private readonly classValidatorPipe: ValidationPipe;

  constructor(options: ValidationPipeOptions = {}) {
    this.classValidatorPipe = new ValidationPipe(options);
  }

  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    if (metadata.metatype && isZodDto(metadata.metatype)) {
      return this.zodPipe.transform(value, metadata);
    }
    return this.classValidatorPipe.transform(value, metadata);
  }
}
