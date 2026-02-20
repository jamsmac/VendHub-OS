/**
 * Client B2C Module
 * Customer-facing module for registration, wallet, orders, loyalty, payments
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { ClientController } from './client.controller';
import { ClientService } from './client.service';

import { ClientUser } from './entities/client-user.entity';
import { ClientWallet } from './entities/client-wallet.entity';
import { ClientWalletLedger } from './entities/client-wallet-ledger.entity';
import { ClientLoyaltyAccount } from './entities/client-loyalty-account.entity';
import { ClientLoyaltyLedger } from './entities/client-loyalty-ledger.entity';
import { ClientOrder } from './entities/client-order.entity';
import { ClientPayment } from './entities/client-payment.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientUser,
      ClientWallet,
      ClientWalletLedger,
      ClientLoyaltyAccount,
      ClientLoyaltyLedger,
      ClientOrder,
      ClientPayment,
      Product,
    ]),
    ConfigModule,
  ],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
