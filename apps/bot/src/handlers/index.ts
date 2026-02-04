import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { registerCommands } from './commands';
import { registerCallbacks } from './callbacks';
import { registerMessageHandlers } from './messages';

/**
 * Register all handlers for the bot
 */
export function registerAllHandlers(bot: Telegraf<BotContext>) {
  // Register command handlers (/start, /help, etc.)
  registerCommands(bot);

  // Register callback query handlers (inline buttons)
  registerCallbacks(bot);

  // Register message handlers (text, location, contact, photo)
  registerMessageHandlers(bot);

  console.log('✅ All handlers registered');
}

export { registerCommands } from './commands';
export { registerCallbacks } from './callbacks';
export { registerMessageHandlers } from './messages';
