/**
 * Location Interfaces for VendHub OS
 * All interface types used across location entities
 */

/**
 * Рабочие часы на день
 */
export interface DaySchedule {
  isOpen: boolean;
  openTime?: string; // "09:00"
  closeTime?: string; // "21:00"
  breakStart?: string; // "13:00" (для обеда)
  breakEnd?: string; // "14:00"
}

/**
 * Недельное расписание
 */
export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Контактное лицо
 */
export interface ContactPerson {
  name: string;
  position?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  telegram?: string;
  isDecisionMaker: boolean;
  notes?: string;
}

/**
 * Адрес
 */
export interface Address {
  country: string; // "Uzbekistan"
  region: string; // "Toshkent viloyati"
  city: string; // "Toshkent"
  district?: string; // "Mirzo Ulug'bek tumani"
  street: string; // "Amir Temur ko'chasi"
  building: string; // "15A"
  floor?: string; // "2"
  room?: string; // "201"
  entrance?: string; // "A"
  postalCode?: string; // "100000"
  landmark?: string; // "Напротив банка"
  fullAddress: string; // Полный адрес одной строкой
}

/**
 * GPS координаты
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // Точность в метрах
  altitude?: number;
  capturedAt?: Date;
}

/**
 * Характеристики локации
 */
export interface LocationCharacteristics {
  // Трафик
  dailyFootTraffic?: number; // Проходимость в день
  peakHours?: string[]; // Пиковые часы ["12:00-14:00", "18:00-20:00"]

  // Аудитория
  targetAudience?: string[]; // ["students", "office_workers"]
  ageGroup?: string; // "18-35"
  incomeLevel?: string; // "medium", "high"

  // Инфраструктура
  hasElectricity: boolean;
  electricityType?: string; // "220V", "380V"
  hasWifi: boolean;
  wifiSpeed?: number; // Мбит/с
  hasWaterSupply: boolean;
  hasDrainage: boolean;
  hasAirConditioning: boolean;

  // Безопасность
  hasSecurity: boolean;
  securityType?: string; // "guard", "camera", "both"
  hasAlarm: boolean;

  // Доступность
  hasParking: boolean;
  parkingSpaces?: number;
  hasLoadingDock: boolean; // Разгрузочная зона
  hasElevator: boolean;
  isWheelchairAccessible: boolean;

  // Ограничения
  noiseRestrictions?: string; // "after 22:00"
  dietaryRestrictions?: string[]; // ["halal_only"]
  brandRestrictions?: string[]; // Запрещенные бренды

  // Конкуренция
  competitorMachines?: number; // Автоматы конкурентов
  nearbyVendingMachines?: number; // Другие автоматы рядом

  // Особые условия
  specialConditions?: string[];
}

/**
 * Финансовые условия контракта
 */
export interface ContractFinancials {
  // Основная аренда
  baseRent?: number; // Фиксированная сумма
  rentCurrency: string; // "UZS", "USD"

  // Доля от выручки
  revenueSharePercent?: number; // % от выручки
  revenueShareMinimum?: number; // Минимальная сумма

  // Комиссия
  commissionPercent?: number; // % комиссии
  commissionMinimum?: number; // Минимальная комиссия

  // Депозит
  depositAmount?: number;
  depositReturnable: boolean;

  // Коммунальные
  utilitiesIncluded: boolean;
  utilitiesCost?: number; // Если не включены

  // Налоги
  vatIncluded: boolean;
  taxRate?: number;

  // Индексация
  annualIndexation?: number; // % годовой индексации

  // Бонусы/штрафы
  earlyTerminationPenalty?: number;
  performanceBonus?: {
    threshold: number; // Сумма продаж
    bonusPercent: number; // Скидка на аренду
  };
}

/**
 * Метаданные локации
 */
export interface LocationMetadata {
  // Источник
  source?: string; // "referral", "cold_call", "partner"
  referredBy?: string; // Кто привел

  // CRM данные
  crmId?: string; // ID в внешней CRM
  externalId?: string; // Внешний ID

  // Медиа
  photos?: {
    url: string;
    type: string; // "exterior", "interior", "spot"
    description?: string;
    uploadedAt: Date;
  }[];
  documents?: {
    url: string;
    name: string;
    type: string; // "contract", "permit", "photo"
    uploadedAt: Date;
  }[];

  // Теги
  tags?: string[];

  // Оценки
  potentialScore?: number; // Оценка потенциала 1-10
  riskScore?: number; // Оценка риска 1-10
  priorityScore?: number; // Приоритет 1-10

  // Интеграции
  googlePlaceId?: string;
  yandexOrgId?: string;
  twoGisId?: string;
}

/**
 * Статистика локации
 */
export interface LocationStats {
  // Автоматы
  totalMachines: number;
  activeMachines: number;

  // Продажи
  totalRevenue: number;
  monthlyRevenue: number;
  averageDailySales: number;

  // Транзакции
  totalTransactions: number;
  monthlyTransactions: number;
  averageTransactionValue: number;

  // Инциденты
  totalComplaints: number;
  openComplaints: number;

  // Обслуживание
  lastServiceDate?: Date;
  averageServiceInterval: number; // дней

  // Рейтинг
  customerRating?: number; // 1-5
  operatorRating?: number; // 1-5
  locationRating?: number; // 1-5

  // Тренды
  revenueGrowth?: number; // % роста
  transactionGrowth?: number;

  // Обновлено
  statsUpdatedAt?: Date;
}
