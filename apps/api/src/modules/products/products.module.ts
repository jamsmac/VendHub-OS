import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController, SuppliersController } from './products.controller';
import {
  Product,
  Recipe,
  RecipeIngredient,
  RecipeSnapshot,
  IngredientBatch,
  ProductPriceHistory,
  Supplier,
} from './entities/product.entity';

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
  ],
  controllers: [ProductsController, SuppliersController],
  providers: [ProductsService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
