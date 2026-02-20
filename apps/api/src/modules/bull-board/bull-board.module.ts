/**
 * BullBoard Module
 *
 * Provides a web-based admin UI for monitoring and managing BullMQ queues.
 * Mounted at /admin/queues — accessible only to owner and admin roles.
 *
 * Uses @bull-board/nestjs with Express adapter for seamless NestJS integration.
 * All registered BullMQ queues are automatically discovered and displayed.
 *
 * NOTE: @bull-board/nestjs and @bull-board/express are optional dependencies.
 * If they are not installed, this module acts as a simple placeholder.
 */

import { Module, Logger } from '@nestjs/common';
import { BullBoardController } from './bull-board.controller';

const logger = new Logger('BullBoardModule');

/**
 * Attempt to dynamically load bull-board packages.
 * If they are not installed, return empty imports and log a warning.
 */
function getBullBoardImports(): any[] {
  try {
    const { BullBoardModule: NestBullBoardModule } = require('@bull-board/nestjs');
    const { ExpressAdapter } = require('@bull-board/express');

    return [
      NestBullBoardModule.forRoot({
        route: '/admin/queues',
        adapter: ExpressAdapter,
      }),
    ];
  } catch {
    logger.warn(
      '@bull-board/nestjs or @bull-board/express not installed. ' +
      'Queue dashboard UI will not be available. ' +
      'Install with: pnpm add @bull-board/nestjs @bull-board/express',
    );
    return [];
  }
}

@Module({
  imports: getBullBoardImports(),
  controllers: [BullBoardController],
})
export class BullBoardModule {}
