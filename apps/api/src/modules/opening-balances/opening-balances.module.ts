import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpeningBalancesService } from './opening-balances.service';
import { OpeningBalancesController } from './opening-balances.controller';
import { StockOpeningBalance } from './entities/stock-opening-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockOpeningBalance])],
  controllers: [OpeningBalancesController],
  providers: [OpeningBalancesService],
  exports: [OpeningBalancesService],
})
export class OpeningBalancesModule {}
