/**
 * Client B2C Module - Barrel Exports
 */

// Module
export { ClientModule } from './client.module';

// Service
export { ClientService } from './client.service';

// Controller
export { ClientController } from './client.controller';

// Entities
export { ClientUser } from './entities/client-user.entity';
export { ClientWallet } from './entities/client-wallet.entity';
export { ClientWalletLedger, WalletTransactionType } from './entities/client-wallet-ledger.entity';
export { ClientLoyaltyAccount } from './entities/client-loyalty-account.entity';
export { ClientLoyaltyLedger, LoyaltyTransactionReason } from './entities/client-loyalty-ledger.entity';
export { ClientOrder, ClientOrderStatus, OrderItem } from './entities/client-order.entity';
export { ClientPayment, ClientPaymentStatus, ClientPaymentProvider } from './entities/client-payment.entity';

// DTOs
export { CreateClientUserDto, UpdateClientUserDto } from './dto/create-client-user.dto';
export { TopUpWalletDto, WalletAdjustmentDto } from './dto/wallet.dto';
export { CreateClientOrderDto, OrderItemDto } from './dto/client-order.dto';
export { QueryClientsDto, QueryOrdersDto } from './dto/query-clients.dto';
