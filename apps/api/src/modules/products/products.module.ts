import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { RecipeConsumptionService } from "./services/recipe-consumption.service";
import { ProductsController, SuppliersController } from "./products.controller";
import { ContainersModule } from "../containers/containers.module";
import {
  Product,
  Recipe,
  RecipeIngredient,
  RecipeSnapshot,
  IngredientBatch,
  ProductPriceHistory,
  Supplier,
} from "./entities/product.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Recipe,
      RecipeIngredient,
      RecipeSnapshot,
      IngredientBatch,
      ProductPriceHistory,
      Supplier,
    ]),
    ContainersModule,
  ],
  controllers: [ProductsController, SuppliersController],
  providers: [ProductsService, RecipeConsumptionService],
  exports: [ProductsService, RecipeConsumptionService],
})
export class ProductsModule {}
