import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Organization } from "../organizations/entities/organization.entity";
import { Location } from "../locations/entities/location.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Product } from "../products/entities/product.entity";
import { PublicTenantController } from "./public-tenant.controller";
import { PublicTenantService } from "./public-tenant.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Location, Machine, Product]),
  ],
  controllers: [PublicTenantController],
  providers: [PublicTenantService],
  exports: [PublicTenantService],
})
export class PublicTenantModule {}
