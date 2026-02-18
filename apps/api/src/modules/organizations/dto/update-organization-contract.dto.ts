import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateOrganizationContractDto } from "./create-organization-contract.dto";

export class UpdateOrganizationContractDto extends PartialType(
  OmitType(CreateOrganizationContractDto, [
    "organization_id",
    "contract_number",
  ] as const),
) {}
