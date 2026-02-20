/**
 * Telegram Customer Bot Service for VendHub OS
 * Bot for customers: complaints, purchase status, refunds
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context, Markup } from 'telegraf';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Complaint, ComplaintStatus, ComplaintCategory, ComplaintSource } from '../complaints/entities/complaint.entity';
import { Machine } from '../machines/entities/machine.entity';

// ============================================================================
// TYPES
// ============================================================================

interface CustomerContext extends Context {
  telegramId?: string;
  phone?: string;
}

interface CustomerSession {
  state: CustomerSessionState;
  data: Record<string, any>;
}

enum CustomerSessionState {
  IDLE = 'idle',
  AWAITING_MACHINE_CODE = 'awaiting_machine_code',
  AWAITING_COMPLAINT_TYPE = 'awaiting_complaint_type',
  AWAITING_COMPLAINT_DESCRIPTION = 'awaiting_complaint_description',
  AWAITING_TRANSACTION_ID = 'awaiting_transaction_id',
  AWAITING_PHONE = 'awaiting_phone',
  AWAITING_REFUND_DETAILS = 'awaiting_refund_details',
  AWAITING_PHOTO = 'awaiting_photo',
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class TelegramCustomerBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramCustomerBotService.name);
  private bot: Telegraf<CustomerContext>;
  private sessions: Map<number, CustomerSession> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(Transaction) private transactionRepository: Repository<Transaction>,
    @InjectRepository(Complaint) private complaintRepository: Repository<Complaint>,
    @InjectRepository(Machine) private machineRepository: Repository<Machine>,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_CUSTOMER_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_CUSTOMER_BOT_TOKEN not set, customer bot disabled');
      return;
    }

    this.bot = new Telegraf<CustomerContext>(token);

    // Middleware
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        ctx.telegramId = ctx.from.id.toString();
      }
      return next();
    });

    // Register handlers
    this.registerCommands();
    this.registerCallbacks();
    this.registerMessages();

    try {
      await this.bot.launch();
      this.logger.log('Telegram customer bot started');
    } catch (error: any) {
      this.logger.error('Failed to start customer bot:', error);
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop();
    }
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  private registerCommands() {
    // /start - Welcome and main menu
    this.bot.command('start', async (ctx) => {
      const startParam = ctx.message.text.split(' ')[1];

      // Deep link: /start complaint_MACHINEID
      if (startParam?.startsWith('complaint_')) {
        const machineId = startParam.replace('complaint_', '');
        await this.startComplaintFlow(ctx, machineId);
        return;
      }

      // Deep link: /start status_TRANSACTIONID
      if (startParam?.startsWith('status_')) {
        const transactionId = startParam.replace('status_', '');
        await this.showTransactionStatus(ctx, transactionId);
        return;
      }

      await this.showMainMenu(ctx);
    });

    // /help
    this.bot.command('help', async (ctx) => {
      await ctx.reply(this.getHelpMessage());
    });

    // /complaint - Start complaint
    this.bot.command('complaint', async (ctx) => {
      await this.askForMachineCode(ctx);
    });

    // /status - Check purchase status
    this.bot.command('status', async (ctx) => {
      await this.askForTransactionId(ctx);
    });

    // /refund - Request refund
    this.bot.command('refund', async (ctx) => {
      await this.startRefundFlow(ctx);
    });

    // /mycomplaints - My complaints
    this.bot.command('mycomplaints', async (ctx) => {
      await this.showMyComplaints(ctx);
    });
  }

  // ============================================================================
  // CALLBACK HANDLERS
  // ============================================================================

  private registerCallbacks() {
    // Main menu
    this.bot.action('menu', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMainMenu(ctx);
    });

    // Start complaint
    this.bot.action('new_complaint', async (ctx) => {
      await ctx.answerCbQuery();
      await this.askForMachineCode(ctx);
    });

    // Check status
    this.bot.action('check_status', async (ctx) => {
      await ctx.answerCbQuery();
      await this.askForTransactionId(ctx);
    });

    // Request refund
    this.bot.action('request_refund', async (ctx) => {
      await ctx.answerCbQuery();
      await this.startRefundFlow(ctx);
    });

    // My complaints
    this.bot.action('my_complaints', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMyComplaints(ctx);
    });

    // Complaint types
    this.bot.action(/complaint_type:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const type = ctx.match[1] as ComplaintCategory;
      await this.selectComplaintType(ctx, type);
    });

    // View complaint details
    this.bot.action(/complaint:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const complaintId = ctx.match[1];
      await this.showComplaintDetails(ctx, complaintId);
    });

    // Confirm submission
    this.bot.action('submit_complaint', async (ctx) => {
      await ctx.answerCbQuery();
      await this.submitComplaint(ctx);
    });

    // Cancel
    this.bot.action('cancel', async (ctx) => {
      await ctx.answerCbQuery('Отменено');
      this.clearSession(ctx.from!.id);
      await this.showMainMenu(ctx);
    });

    // Add photo
    this.bot.action('add_photo', async (ctx) => {
      await ctx.answerCbQuery();
      await this.requestPhoto(ctx);
    });

    // Skip photo
    this.bot.action('skip_photo', async (ctx) => {
      await ctx.answerCbQuery();
      await this.confirmComplaint(ctx);
    });

    // Language selection
    this.bot.action(/lang:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const lang = ctx.match[1];
      // Store language preference
      await ctx.reply(`✅ Язык изменён на ${lang === 'ru' ? 'Русский' : lang === 'uz' ? "O'zbek" : 'English'}`);
      await this.showMainMenu(ctx);
    });
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  private registerMessages() {
    // Photo handler
    this.bot.on('photo', async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session || session.state !== CustomerSessionState.AWAITING_PHOTO) return;

      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      session.data.photoFileId = photo.file_id;
      this.setSession(ctx.from!.id, session);

      await ctx.reply('📷 Фото сохранено!');
      await this.confirmComplaint(ctx);
    });

    // Text handler
    this.bot.on('text', async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session) return;

      const text = ctx.message.text.trim();

      switch (session.state) {
        case CustomerSessionState.AWAITING_MACHINE_CODE:
          await this.handleMachineCode(ctx, text);
          break;

        case CustomerSessionState.AWAITING_COMPLAINT_DESCRIPTION:
          await this.handleComplaintDescription(ctx, text);
          break;

        case CustomerSessionState.AWAITING_TRANSACTION_ID:
          await this.handleTransactionId(ctx, text);
          break;

        case CustomerSessionState.AWAITING_PHONE:
          await this.handlePhone(ctx, text);
          break;

        case CustomerSessionState.AWAITING_REFUND_DETAILS:
          await this.handleRefundDetails(ctx, text);
          break;
      }
    });

    // Contact handler (for phone number)
    this.bot.on('contact', async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session || session.state !== CustomerSessionState.AWAITING_PHONE) return;

      const phone = ctx.message.contact.phone_number;
      session.data.phone = phone;
      this.setSession(ctx.from!.id, session);

      await ctx.reply(`📱 Телефон сохранён: ${phone}`);
      await this.confirmComplaint(ctx);
    });
  }

  // ============================================================================
  // MENU FUNCTIONS
  // ============================================================================

  private async showMainMenu(ctx: CustomerContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📝 Оставить жалобу', 'new_complaint')],
      [Markup.button.callback('🔍 Проверить статус покупки', 'check_status')],
      [Markup.button.callback('💰 Запросить возврат', 'request_refund')],
      [Markup.button.callback('📋 Мои обращения', 'my_complaints')],
      [
        Markup.button.callback('🇷🇺', 'lang:ru'),
        Markup.button.callback('🇺🇿', 'lang:uz'),
        Markup.button.callback('🇬🇧', 'lang:en'),
      ],
    ]);

    const message =
      '👋 Добро пожаловать в службу поддержки VendHub!\n\n' +
      'Мы поможем вам:\n' +
      '• Оставить жалобу на аппарат\n' +
      '• Проверить статус покупки\n' +
      '• Запросить возврат средств\n\n' +
      'Выберите действие:';

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
      } catch {
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }
  }

  // ============================================================================
  // COMPLAINT FLOW
  // ============================================================================

  private async askForMachineCode(ctx: CustomerContext) {
    this.setSession(ctx.from!.id, {
      state: CustomerSessionState.AWAITING_MACHINE_CODE,
      data: {},
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Отмена', 'cancel')],
    ]);

    await ctx.reply(
      '📍 Укажите номер аппарата\n\n' +
        'Номер указан на наклейке на аппарате.\n' +
        'Например: VH-001 или 12345\n\n' +
        'Или отсканируйте QR-код на аппарате.',
      keyboard,
    );
  }

  private async handleMachineCode(ctx: CustomerContext, code: string) {
    // Try to find machine by code
    const machine = await this.machineRepository.findOne({
      where: [
        { machineNumber: code },
        { serialNumber: code },
      ],
    });

    if (!machine) {
      await ctx.reply(
        '❌ Аппарат не найден.\n\n' +
          'Проверьте номер и попробуйте снова.\n' +
          'Номер обычно указан на QR-коде или наклейке.',
      );
      return;
    }

    await this.startComplaintFlow(ctx, machine.id);
  }

  private async startComplaintFlow(ctx: CustomerContext, machineId: string) {
    const machine = await this.machineRepository.findOne({ where: { id: machineId } });
    if (!machine) {
      await ctx.reply('❌ Аппарат не найден');
      return;
    }

    const session = this.getSession(ctx.from!.id) || { state: CustomerSessionState.IDLE, data: {} };
    session.data.machineId = machineId;
    session.data.machineName = machine.name;
    session.data.machineAddress = machine.address;
    session.state = CustomerSessionState.AWAITING_COMPLAINT_TYPE;
    this.setSession(ctx.from!.id, session);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💰 Не выдал товар', `complaint_type:${ComplaintCategory.PRODUCT_NOT_DISPENSED}`)],
      [Markup.button.callback('⚠️ Товар поврежден', `complaint_type:${ComplaintCategory.PRODUCT_DAMAGED}`)],
      [Markup.button.callback('❌ Товар закончился', `complaint_type:${ComplaintCategory.PRODUCT_OUT_OF_STOCK}`)],
      [Markup.button.callback('💳 Проблема с оплатой', `complaint_type:${ComplaintCategory.PAYMENT_FAILED}`)],
      [Markup.button.callback('🔧 Аппарат не работает', `complaint_type:${ComplaintCategory.MACHINE_NOT_WORKING}`)],
      [Markup.button.callback('🧹 Грязный аппарат', `complaint_type:${ComplaintCategory.MACHINE_DIRTY}`)],
      [Markup.button.callback('💬 Другое', `complaint_type:${ComplaintCategory.OTHER}`)],
      [Markup.button.callback('❌ Отмена', 'cancel')],
    ]);

    await ctx.reply(
      `🏭 Аппарат: ${machine.name}\n` +
        `📍 Адрес: ${machine.address || 'Не указан'}\n\n` +
        'Выберите тип проблемы:',
      keyboard,
    );
  }

  private async selectComplaintType(ctx: CustomerContext, type: ComplaintCategory) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    session.data.complaintType = type;
    session.state = CustomerSessionState.AWAITING_COMPLAINT_DESCRIPTION;
    this.setSession(ctx.from!.id, session);

    const typeLabels: Record<string, string> = {
      [ComplaintCategory.PRODUCT_NOT_DISPENSED]: 'Товар не выдан',
      [ComplaintCategory.PRODUCT_DAMAGED]: 'Товар поврежден',
      [ComplaintCategory.PRODUCT_OUT_OF_STOCK]: 'Товар закончился',
      [ComplaintCategory.PAYMENT_FAILED]: 'Проблема с оплатой',
      [ComplaintCategory.MACHINE_NOT_WORKING]: 'Аппарат не работает',
      [ComplaintCategory.MACHINE_DIRTY]: 'Грязный аппарат',
      [ComplaintCategory.OTHER]: 'Другое',
    };

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Отмена', 'cancel')],
    ]);

    await ctx.reply(
      `📝 Тип жалобы: ${typeLabels[type]}\n\n` +
        'Опишите проблему подробнее:\n' +
        '• Что произошло?\n' +
        '• Какой товар выбрали?\n' +
        '• Сколько денег внесли?',
      keyboard,
    );
  }

  private async handleComplaintDescription(ctx: CustomerContext, description: string) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    session.data.description = description;
    session.state = CustomerSessionState.AWAITING_PHONE;
    this.setSession(ctx.from!.id, session);

    const keyboard = Markup.keyboard([
      [Markup.button.contactRequest('📱 Отправить мой номер')],
    ]).oneTime().resize();

    await ctx.reply(
      '📱 Укажите ваш номер телефона для обратной связи.\n\n' +
        'Нажмите кнопку ниже или введите номер вручную:',
      keyboard,
    );
  }

  private async handlePhone(ctx: CustomerContext, phone: string) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    // Validate phone
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 9) {
      await ctx.reply('❌ Неверный формат номера. Введите корректный номер телефона:');
      return;
    }

    session.data.phone = cleanPhone;
    this.setSession(ctx.from!.id, session);

    await this.askForPhoto(ctx);
  }

  private async askForPhoto(ctx: CustomerContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📷 Добавить фото', 'add_photo')],
      [Markup.button.callback('⏭ Пропустить', 'skip_photo')],
      [Markup.button.callback('❌ Отмена', 'cancel')],
    ]);

    await ctx.reply(
      '📷 Хотите добавить фото?\n\n' +
        'Фото поможет быстрее разобраться в проблеме.',
      keyboard,
    );
  }

  private async requestPhoto(ctx: CustomerContext) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    session.state = CustomerSessionState.AWAITING_PHOTO;
    this.setSession(ctx.from!.id, session);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('⏭ Пропустить', 'skip_photo')],
    ]);

    await ctx.reply('📷 Отправьте фото:', keyboard);
  }

  private async confirmComplaint(ctx: CustomerContext) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    const typeLabels: Record<string, string> = {
      [ComplaintCategory.PRODUCT_NOT_DISPENSED]: '💰 Товар не выдан',
      [ComplaintCategory.PRODUCT_DAMAGED]: '⚠️ Товар поврежден',
      [ComplaintCategory.PRODUCT_OUT_OF_STOCK]: '❌ Товар закончился',
      [ComplaintCategory.PAYMENT_FAILED]: '💳 Проблема с оплатой',
      [ComplaintCategory.MACHINE_NOT_WORKING]: '🔧 Аппарат не работает',
      [ComplaintCategory.MACHINE_DIRTY]: '🧹 Грязный аппарат',
      [ComplaintCategory.OTHER]: '💬 Другое',
    };

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Отправить', 'submit_complaint')],
      [Markup.button.callback('📷 Добавить фото', 'add_photo')],
      [Markup.button.callback('❌ Отмена', 'cancel')],
    ]);

    let message =
      '📋 Проверьте вашу жалобу:\n\n' +
      `🏭 Аппарат: ${session.data.machineName}\n` +
      `📍 Адрес: ${session.data.machineAddress || 'Не указан'}\n` +
      `📝 Тип: ${typeLabels[session.data.complaintType as ComplaintCategory] || session.data.complaintType}\n` +
      `📄 Описание: ${session.data.description}\n` +
      `📱 Телефон: ${session.data.phone}\n`;

    if (session.data.photoFileId) {
      message += '📷 Фото: Прикреплено\n';
    }

    message += '\nВсё верно?';

    await ctx.reply(message, keyboard);
  }

  private async submitComplaint(ctx: CustomerContext) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    try {
      const machine = await this.machineRepository.findOne({
        where: { id: session.data.machineId },
      });

      // Create complaint
      const complaint = this.complaintRepository.create({
        organizationId: machine?.organizationId,
        machineId: session.data.machineId,
        category: session.data.complaintType,
        subject: `Жалоба через Telegram: ${session.data.complaintType}`,
        description: session.data.description,
        customer: {
          phone: session.data.phone,
          telegramId: ctx.from!.id.toString(),
        },
        status: ComplaintStatus.PENDING,
        source: ComplaintSource.TELEGRAM_BOT,
        metadata: {
          qrCodeId: session.data.photoFileId,  // photoFileId stored in qrCodeId
        },
      } as any);

      const savedComplaint = await this.complaintRepository.save(complaint) as any;
      const ticketNumber = Array.isArray(savedComplaint) ? savedComplaint[0]?.ticketNumber : savedComplaint.ticketNumber;

      this.clearSession(ctx.from!.id);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📋 Мои обращения', 'my_complaints')],
        [Markup.button.callback('🏠 В меню', 'menu')],
      ]);

      await ctx.reply(
        `✅ Жалоба #${ticketNumber || 'N/A'} успешно отправлена!\n\n` +
          'Мы рассмотрим вашу жалобу в ближайшее время.\n' +
          'Вы получите уведомление о результате.\n\n' +
          `📱 При необходимости свяжемся с вами по номеру ${session.data.phone}`,
        keyboard,
      );
    } catch (error: any) {
      this.logger.error('Failed to create complaint:', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  }

  // ============================================================================
  // VIEW COMPLAINTS
  // ============================================================================

  private async showMyComplaints(ctx: CustomerContext) {
    const telegramId = ctx.from!.id.toString();
    const complaints = await this.complaintRepository
      .createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.machine', 'machine')
      .where(`complaint.customer->>'telegramId' = :telegramId`, { telegramId })
      .orderBy('complaint.createdAt', 'DESC')
      .take(10)
      .getMany();

    if (complaints.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📝 Оставить жалобу', 'new_complaint')],
        [Markup.button.callback('🏠 В меню', 'menu')],
      ]);
      await ctx.reply('📋 У вас пока нет обращений.', keyboard);
      return;
    }

    const statusLabels: Record<string, string> = {
      pending: '⏳ Ожидает',
      assigned: '👤 Назначена',
      in_progress: '🔄 В работе',
      resolved: '✅ Решена',
      closed: '📁 Закрыта',
      rejected: '❌ Отклонена',
    };

    let message = `📋 Ваши обращения (${complaints.length}):\n\n`;

    const buttons: any[][] = [];

    complaints.forEach((complaint, index) => {
      const status = statusLabels[complaint.status] || complaint.status;
      const date = new Date(complaint.created_at).toLocaleDateString('ru-RU');

      message += `${index + 1}. #${complaint.ticketNumber}\n`;
      message += `   📅 ${date} | ${status}\n\n`;

      buttons.push([
        Markup.button.callback(`#${complaint.ticketNumber}`, `complaint:${complaint.id}`),
      ]);
    });

    buttons.push([Markup.button.callback('🏠 В меню', 'menu')]);

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.reply(message, keyboard);
  }

  private async showComplaintDetails(ctx: CustomerContext, complaintId: string) {
    const complaint = await this.complaintRepository.findOne({
      where: { id: complaintId },
      relations: ['machine', 'refunds'],
    });

    if (!complaint) {
      await ctx.reply('❌ Обращение не найдено');
      return;
    }

    const statusLabels: Record<string, string> = {
      pending: '⏳ Ожидает рассмотрения',
      assigned: '👤 Назначена специалисту',
      in_progress: '🔄 В работе',
      resolved: '✅ Решена',
      closed: '📁 Закрыта',
      rejected: '❌ Отклонена',
    };

    const typeLabels: Record<string, string> = {
      [ComplaintCategory.PRODUCT_NOT_DISPENSED]: '💰 Товар не выдан',
      [ComplaintCategory.PRODUCT_DAMAGED]: '⚠️ Товар поврежден',
      [ComplaintCategory.PRODUCT_OUT_OF_STOCK]: '❌ Товар закончился',
      [ComplaintCategory.PAYMENT_FAILED]: '💳 Проблема с оплатой',
      [ComplaintCategory.MACHINE_NOT_WORKING]: '🔧 Аппарат не работает',
      [ComplaintCategory.MACHINE_DIRTY]: '🧹 Грязный аппарат',
      [ComplaintCategory.OTHER]: '💬 Другое',
    };

    let message =
      `📋 Обращение #${complaint.ticketNumber}\n\n` +
      `📊 Статус: ${statusLabels[complaint.status]}\n` +
      `📝 Тип: ${typeLabels[complaint.category] || complaint.category}\n` +
      `🏭 Аппарат: ${(complaint as any).machine?.name || complaint.machineId || 'N/A'}\n` +
      `📅 Дата: ${new Date(complaint.created_at).toLocaleString('ru-RU')}\n\n` +
      `📄 Описание:\n${complaint.description}\n`;

    if (complaint.resolution) {
      message += `\n✅ Решение:\n${complaint.resolution}\n`;
    }

    if (complaint.refunds && complaint.refunds.length > 0) {
      const latestRefund = complaint.refunds[0];
      const refundStatus: Record<string, string> = {
        pending: '⏳ Ожидает',
        approved: '✅ Одобрен',
        completed: '💰 Выплачен',
        rejected: '❌ Отклонён',
      };
      message += `\n💰 Возврат: ${refundStatus[latestRefund.status] || latestRefund.status} - ${Number(latestRefund.amount).toLocaleString()} сум\n`;
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('« Назад', 'my_complaints')],
      [Markup.button.callback('🏠 В меню', 'menu')],
    ]);

    await ctx.reply(message, keyboard);
  }

  // ============================================================================
  // TRANSACTION STATUS
  // ============================================================================

  private async askForTransactionId(ctx: CustomerContext) {
    this.setSession(ctx.from!.id, {
      state: CustomerSessionState.AWAITING_TRANSACTION_ID,
      data: {},
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Отмена', 'cancel')],
    ]);

    await ctx.reply(
      '🔍 Введите номер транзакции\n\n' +
        'Номер транзакции указан на чеке или в уведомлении об оплате.\n' +
        'Например: TRX-123456',
      keyboard,
    );
  }

  private async handleTransactionId(ctx: CustomerContext, transactionId: string) {
    await this.showTransactionStatus(ctx, transactionId);
  }

  private async showTransactionStatus(ctx: CustomerContext, transactionId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: [
        { id: transactionId },
        { transactionNumber: transactionId },
        { paymentId: transactionId },  // Use paymentId instead of externalTransactionId
      ],
    });

    if (!transaction) {
      await ctx.reply(
        '❌ Транзакция не найдена.\n\n' +
          'Проверьте номер и попробуйте снова.',
      );
      return;
    }

    this.clearSession(ctx.from!.id);

    const statusLabels: Record<string, string> = {
      pending: '⏳ Ожидает оплаты',
      paid: '💳 Оплачена',
      dispensing: '🔄 Выдача товара',
      completed: '✅ Завершена',
      failed: '❌ Ошибка',
      refunded: '💰 Возврат',
      cancelled: '🚫 Отменена',
    };

    let message =
      `🧾 Транзакция #${transaction.transactionNumber}\n\n` +
      `📊 Статус: ${statusLabels[transaction.status]}\n` +
      `🏭 Аппарат: ${transaction.machineId || 'N/A'}\n` +
      `📦 Товар: ${(transaction as any).productName || 'N/A'}\n` +
      `💰 Сумма: ${Number(transaction.amount).toLocaleString()} сум\n` +
      `📅 Дата: ${new Date(transaction.created_at).toLocaleString('ru-RU')}\n`;

    if (transaction.status === 'completed') {
      message += '\n✅ Покупка успешно завершена!';
    } else if (transaction.status === 'failed') {
      message += '\n❌ К сожалению, произошла ошибка при покупке.\nВы можете оставить жалобу для возврата средств.';
    }

    const buttons: any[][] = [];

    if (['failed', 'completed'].includes(transaction.status)) {
      buttons.push([Markup.button.callback('📝 Оставить жалобу', 'new_complaint')]);
    }

    buttons.push([Markup.button.callback('🏠 В меню', 'menu')]);

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.reply(message, keyboard);
  }

  // ============================================================================
  // REFUND FLOW
  // ============================================================================

  private async startRefundFlow(ctx: CustomerContext) {
    this.setSession(ctx.from!.id, {
      state: CustomerSessionState.AWAITING_REFUND_DETAILS,
      data: {},
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Отмена', 'cancel')],
    ]);

    await ctx.reply(
      '💰 Запрос возврата средств\n\n' +
        'Опишите ситуацию:\n' +
        '• Номер транзакции (если есть)\n' +
        '• Сумма возврата\n' +
        '• Причина возврата\n' +
        '• Номер телефона',
      keyboard,
    );
  }

  private async handleRefundDetails(ctx: CustomerContext, details: string) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    // Create complaint with refund request
    try {
      const complaint = this.complaintRepository.create({
        category: ComplaintCategory.REFUND_REQUEST,
        subject: 'Запрос на возврат средств через Telegram',
        description: `Запрос на возврат средств:\n${details}`,
        customer: {
          telegramId: ctx.from!.id.toString(),
        },
        status: ComplaintStatus.PENDING,
        source: ComplaintSource.TELEGRAM_BOT,
        metadata: {
          tags: ['refund_request'],  // Use tags instead of isRefundRequest
        },
      } as any);

      const savedRefund = await this.complaintRepository.save(complaint) as any;
      const refundTicketNumber = Array.isArray(savedRefund) ? savedRefund[0]?.ticketNumber : savedRefund.ticketNumber;
      this.clearSession(ctx.from!.id);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📋 Мои обращения', 'my_complaints')],
        [Markup.button.callback('🏠 В меню', 'menu')],
      ]);

      await ctx.reply(
        `✅ Запрос на возврат #${refundTicketNumber || 'N/A'} создан!\n\n` +
          'Мы рассмотрим вашу заявку и свяжемся с вами.',
        keyboard,
      );
    } catch (error: any) {
      this.logger.error('Failed to create refund request:', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  }

  // ============================================================================
  // NOTIFICATIONS (Public methods)
  // ============================================================================

  async sendComplaintStatusUpdate(telegramId: string, complaint: Complaint) {
    if (!this.bot) return;

    const statusLabels: Record<string, string> = {
      pending: '⏳ Ожидает рассмотрения',
      assigned: '👤 Назначена специалисту',
      in_progress: '🔄 В работе',
      resolved: '✅ Решена',
      closed: '📁 Закрыта',
      rejected: '❌ Отклонена',
    };

    const message =
      `📢 Обновление по жалобе #${complaint.ticketNumber}\n\n` +
      `📊 Новый статус: ${statusLabels[complaint.status]}\n` +
      (complaint.resolution ? `\n📝 Комментарий:\n${complaint.resolution}` : '');

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👀 Подробнее', `complaint:${complaint.id}`)],
    ]);

    try {
      await this.bot.telegram.sendMessage(telegramId, message, keyboard);
    } catch (error: any) {
      this.logger.error(`Failed to send notification to ${telegramId}:`, error);
    }
  }

  async sendRefundNotification(telegramId: string, amount: number, status: string) {
    if (!this.bot) return;

    const statusLabels: Record<string, string> = {
      approved: '✅ одобрен',
      processed: '💰 выплачен',
      rejected: '❌ отклонён',
    };

    const message =
      `💰 Возврат средств ${statusLabels[status] || status}!\n\n` +
      `Сумма: ${amount.toLocaleString()} сум\n` +
      (status === 'processed' ? '\nСредства поступят на ваш счёт в течение 1-3 рабочих дней.' : '');

    try {
      await this.bot.telegram.sendMessage(telegramId, message);
    } catch (error: any) {
      this.logger.error(`Failed to send refund notification to ${telegramId}:`, error);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getHelpMessage(): string {
    return (
      '❓ Справка VendHub\n\n' +
      '📋 Команды:\n' +
      '/start - Главное меню\n' +
      '/complaint - Оставить жалобу\n' +
      '/status - Проверить статус покупки\n' +
      '/refund - Запросить возврат\n' +
      '/mycomplaints - Мои обращения\n' +
      '/help - Эта справка\n\n' +
      '📞 Служба поддержки:\n' +
      '☎️ +998 71 200 00 00\n' +
      '📧 support@vendhub.uz'
    );
  }

  private getSession(userId: number): CustomerSession | undefined {
    return this.sessions.get(userId);
  }

  private setSession(userId: number, session: CustomerSession) {
    this.sessions.set(userId, session);
  }

  private clearSession(userId: number) {
    this.sessions.delete(userId);
  }
}
