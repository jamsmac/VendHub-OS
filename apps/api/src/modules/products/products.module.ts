import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { ProductsCoreService } from "./products-core.service";
import { ProductsRecipeService } from "./products-recipe.service";
import { ProductsBatchService } from "./products-batch.service";
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
  providers: [
    ProductsService,
    ProductsCoreService,
    ProductsRecipeService,
    ProductsBatchService,
    RecipeConsumptionService,
  ],
  exports: [ProductsService, RecipeConsumptionService],
})
export class ProductsModule {}
