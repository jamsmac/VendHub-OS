import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';
import { GoodsClassifier } from './entities/goods-classifier.entity';
import { IkpuCode } from './entities/ikpu-code.entity';
import { VatRate } from './entities/vat-rate.entity';
import { PackageType } from './entities/package-type.entity';
import { PaymentProvider } from './entities/payment-provider.entity';

/**
 * References Module
 * Contains Uzbekistan tax system references and payment provider configuration:
 * - GoodsClassifier (MXIK codes from Soliq.uz)
 * - IkpuCode (tax identification codes)
 * - VatRate (VAT rates)
 * - PackageType (package types for goods)
 * - PaymentProvider (Payme, Click, Uzum, cash, Telegram Stars)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoodsClassifier,
      IkpuCode,
      VatRate,
      PackageType,
      PaymentProvider,
    ]),
  ],
  controllers: [ReferencesController],
  providers: [ReferencesService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
