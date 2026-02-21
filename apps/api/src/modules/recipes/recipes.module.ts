import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Recipe,
  RecipeIngredient,
  RecipeSnapshot,
} from "./entities/recipe.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeSnapshot]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class RecipesModule {}
