/**
 * Parse Date Pipe
 * Validates and transforms date parameters
 */

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { isValid, parseISO, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string, metadata: ArgumentMetadata): Date {
    if (!value) {
      throw new BadRequestException(
        `${metadata.data || 'Дата'} обязательна`,
      );
    }

    const date = parseISO(value);

    if (!isValid(date)) {
      throw new BadRequestException(
        `${metadata.data || 'Дата'} имеет неверный формат. Используйте ISO 8601`,
      );
    }

    return date;
  }
}

/**
 * Optional Date Pipe - returns null for empty/invalid dates
 */
@Injectable()
export class ParseOptionalDatePipe implements PipeTransform<string | undefined, Date | null> {
  transform(value: string | undefined, _metadata: ArgumentMetadata): Date | null {
    if (!value || value === 'null' || value === 'undefined') {
      return null;
    }

    const date = parseISO(value);

    if (!isValid(date)) {
      return null;
    }

    return date;
  }
}

/**
 * Parse Date as Start of Day
 */
@Injectable()
export class ParseDateStartOfDayPipe implements PipeTransform<string, Date> {
  transform(value: string, metadata: ArgumentMetadata): Date {
    if (!value) {
      throw new BadRequestException(
        `${metadata.data || 'Дата'} обязательна`,
      );
    }

    const date = parseISO(value);

    if (!isValid(date)) {
      throw new BadRequestException(
        `${metadata.data || 'Дата'} имеет неверный формат`,
      );
    }

    return startOfDay(date);
  }
}

/**
 * Parse Date as End of Day
 */
@Injectable()
export class ParseDateEndOfDayPipe implements PipeTransform<string, Date> {
  transform(value: string, metadata: ArgumentMetadata): Date {
    if (!value) {
      throw new BadRequestException(
        `${metadata.data || 'Дата'} обязательна`,
      );
    }

    const date = parseISO(value);

    if (!isValid(date)) {
      throw new BadRequestException(
        `${metadata.data || 'Дата'} имеет неверный формат`,
      );
    }

    return endOfDay(date);
  }
}

/**
 * Date Range Pipe - validates date range
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class ParseDateRangePipe implements PipeTransform<{ startDate?: string; endDate?: string }, DateRange> {
  constructor(
    private readonly options?: {
      maxRangeDays?: number;
      defaultRangeDays?: number;
    },
  ) {}

  transform(value: { startDate?: string; endDate?: string }, _metadata: ArgumentMetadata): DateRange {
    let startDate: Date;
    let endDate: Date;

    if (value.startDate) {
      startDate = startOfDay(parseISO(value.startDate));
      if (!isValid(startDate)) {
        throw new BadRequestException('Неверный формат начальной даты');
      }
    } else {
      // Default: start of current month
      startDate = startOfDay(new Date());
      startDate.setDate(1);
    }

    if (value.endDate) {
      endDate = endOfDay(parseISO(value.endDate));
      if (!isValid(endDate)) {
        throw new BadRequestException('Неверный формат конечной даты');
      }
    } else {
      // Default: today
      endDate = endOfDay(new Date());
    }

    // Validate range
    if (startDate > endDate) {
      throw new BadRequestException(
        'Начальная дата не может быть позже конечной',
      );
    }

    // Check max range if specified
    if (this.options?.maxRangeDays) {
      const diffDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays > this.options.maxRangeDays) {
        throw new BadRequestException(
          `Максимальный период: ${this.options.maxRangeDays} дней`,
        );
      }
    }

    return { startDate, endDate };
  }
}
