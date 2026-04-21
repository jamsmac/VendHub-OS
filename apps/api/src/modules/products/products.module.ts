import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { ProductsCoreService } from "./products-core.service";
import { ProductsRecipeService } from "./products-recipe.service";
import { ProductsBatchService } from "./products-batch.service";
import { RecipeConsumptionService } from "./services/recipe-consumption.service";
import { SupplierAnalyticsService } from "./services/supplier-analytics.service";
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
import { Purchase } from "../purchases/entities/purchase.entity";

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
      // Sprint G5: supplier analytics reads from purchases.
      Purchase,
    ]),
    ContainersModule,
  ],
  controllers: [ProductsController, SuppliersController],
  providers: [
    ProductsService,
    ProductsCoreService,
    ProductsRecipeService,
    ProductsBatchService,
    RecipeConsumptionService,
    SupplierAnalyticsService,
  ],
  exports: [
    ProductsService,
    RecipeConsumptionService,
    SupplierAnalyticsService,
  ],
})
export class ProductsModule {}
