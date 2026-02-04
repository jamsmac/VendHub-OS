/**
 * Contractors Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contractor, ContractorInvoice } from './entities/contractor.entity';
import { Contract, CommissionCalculation } from './entities/contract.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ContractorsService } from './contractors.service';
import { ContractService } from './services/contract.service';
import { CommissionService } from './services/commission.service';
import { ContractorsController } from './contractors.controller';
import { ContractController } from './controllers/contract.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contractor,
      ContractorInvoice,
      Contract,
      CommissionCalculation,
      Transaction,
    ]),
  ],
  controllers: [ContractorsController, ContractController],
  providers: [ContractorsService, ContractService, CommissionService],
  exports: [ContractorsService, ContractService, CommissionService],
})
export class ContractorsModule {}
