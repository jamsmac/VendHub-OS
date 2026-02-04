/**
 * Location Entities for VendHub OS
 * Точки размещения автоматов с контрактами и аналитикой
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Тип локации
 */
export enum LocationType {
  // Коммерческие
  SHOPPING_CENTER = 'shopping_center',      // Торговый центр
  SUPERMARKET = 'supermarket',              // Супермаркет
  BUSINESS_CENTER = 'business_center',      // Бизнес центр
  OFFICE = 'office',                        // Офис

  // Образование
  UNIVERSITY = 'university',                // Университет
  SCHOOL = 'school',                        // Школа
  COLLEGE = 'college',                      // Колледж

  // Здравоохранение
  HOSPITAL = 'hospital',                    // Больница
  CLINIC = 'clinic',                        // Клиника
  PHARMACY = 'pharmacy',                    // Аптека

  // Развлечения и спорт
  FITNESS = 'fitness',                      // Фитнес центр
  GYM = 'gym',                              // Тренажерный зал
  CINEMA = 'cinema',                        // Кинотеатр
  ENTERTAINMENT = 'entertainment',          // Развлекательный центр

  // Транспорт
  METRO_STATION = 'metro_station',          // Станция метро
  BUS_STATION = 'bus_station',              // Автовокзал
  TRAIN_STATION = 'train_station',          // ЖД вокзал
  AIRPORT = 'airport',                      // Аэропорт
  GAS_STATION = 'gas_station',              // АЗС

  // Проживание
  HOTEL = 'hotel',                          // Отель
  HOSTEL = 'hostel',                        // Хостел
  RESIDENTIAL = 'residential',              // Жилой комплекс
  DORMITORY = 'dormitory',                  // Общежитие

  // Промышленность
  FACTORY = 'factory',                      // Завод
  WAREHOUSE = 'warehouse',                  // Склад
  INDUSTRIAL = 'industrial',                // Промзона

  // Государственные
  GOVERNMENT = 'government',                // Госучреждение
  POLICE = 'police',                        // Полиция
  MILITARY = 'military',                    // Военное учреждение

  // Другое
  PARK = 'park',                            // Парк
  STREET = 'street',                        // Улица
  OTHER = 'other',                          // Другое
}

/**
 * Статус локации
 */
export enum LocationStatus {
  PROSPECTING = 'prospecting',      // Поиск/переговоры
  CONTRACT_PENDING = 'contract_pending',  // Ожидание контракта
  ACTIVE = 'active',                // Активная
  SUSPENDED = 'suspended',          // Приостановлена
  CLOSING = 'closing',              // Закрывается
  CLOSED = 'closed',                // Закрыта
}

/**
 * Тип контракта аренды
 */
export enum ContractType {
  RENT = 'rent',                    // Фиксированная аренда
  REVENUE_SHARE = 'revenue_share',  // Доля от выручки
  HYBRID = 'hybrid',                // Фикс + доля
  FREE = 'free',                    // Бесплатно (бартер/договоренность)
  COMMISSION = 'commission',        // Комиссия с продаж
}

/**
 * Статус контракта
 */
export enum ContractStatus {
  DRAFT = 'draft',                  // Черновик
  PENDING_APPROVAL = 'pending_approval',  // На согласовании
  ACTIVE = 'active',                // Действует
  EXPIRING_SOON = 'expiring_soon',  // Скоро истекает
  EXPIRED = 'expired',              // Истек
  TERMINATED = 'terminated',        // Расторгнут
  RENEWED = 'renewed',              // Продлен
}

/**
 * Периодичность оплаты
 */
export enum PaymentFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

/**
 * Тип события локации
 */
export enum LocationEventType {
  // Статус
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  ACTIVATED = 'activated',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',

  // Контракт
  CONTRACT_SIGNED = 'contract_signed',
  CONTRACT_RENEWED = 'contract_renewed',
  CONTRACT_TERMINATED = 'contract_terminated',
  CONTRACT_PAYMENT = 'contract_payment',

  // Автоматы
  MACHINE_INSTALLED = 'machine_installed',
  MACHINE_REMOVED = 'machine_removed',
  MACHINE_REPLACED = 'machine_replaced',

  // Инциденты
  COMPLAINT_RECEIVED = 'complaint_received',
  INCIDENT_REPORTED = 'incident_reported',
  INSPECTION_COMPLETED = 'inspection_completed',

  // Контакт
  CONTACT_UPDATED = 'contact_updated',
  MEETING_SCHEDULED = 'meeting_scheduled',
  NEGOTIATION = 'negotiation',

  // Другое
  NOTE_ADDED = 'note_added',
  DOCUMENT_UPLOADED = 'document_uploaded',
  PHOTO_UPLOADED = 'photo_uploaded',
}

/**
 * День недели
 */
export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

/**
 * Тип зоны в локации
 */
export enum LocationZoneType {
  ENTRANCE = 'entrance',            // Вход
  LOBBY = 'lobby',                  // Холл/Лобби
  FOOD_COURT = 'food_court',        // Фуд-корт
  HALLWAY = 'hallway',              // Коридор
  FLOOR = 'floor',                  // Этаж
  DEPARTMENT = 'department',        // Отдел
  WAITING_AREA = 'waiting_area',    // Зона ожидания
  REST_AREA = 'rest_area',          // Зона отдыха
  OUTDOOR = 'outdoor',              // Улица/снаружи
  OTHER = 'other',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Рабочие часы на день
 */
interface DaySchedule {
  isOpen: boolean;
  openTime?: string;      // "09:00"
  closeTime?: string;     // "21:00"
  breakStart?: string;    // "13:00" (для обеда)
  breakEnd?: string;      // "14:00"
}

/**
 * Недельное расписание
 */
interface WeeklySchedule {
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
interface ContactPerson {
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
interface Address {
  country: string;                  // "Uzbekistan"
  region: string;                   // "Toshkent viloyati"
  city: string;                     // "Toshkent"
  district?: string;                // "Mirzo Ulug'bek tumani"
  street: string;                   // "Amir Temur ko'chasi"
  building: string;                 // "15A"
  floor?: string;                   // "2"
  room?: string;                    // "201"
  entrance?: string;                // "A"
  postalCode?: string;              // "100000"
  landmark?: string;                // "Напротив банка"
  fullAddress: string;              // Полный адрес одной строкой
}

/**
 * GPS координаты
 */
interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;                // Точность в метрах
  altitude?: number;
  capturedAt?: Date;
}

/**
 * Характеристики локации
 */
interface LocationCharacteristics {
  // Трафик
  dailyFootTraffic?: number;        // Проходимость в день
  peakHours?: string[];             // Пиковые часы ["12:00-14:00", "18:00-20:00"]

  // Аудитория
  targetAudience?: string[];        // ["students", "office_workers"]
  ageGroup?: string;                // "18-35"
  incomeLevel?: string;             // "medium", "high"

  // Инфраструктура
  hasElectricity: boolean;
  electricityType?: string;         // "220V", "380V"
  hasWifi: boolean;
  wifiSpeed?: number;               // Мбит/с
  hasWaterSupply: boolean;
  hasDrainage: boolean;
  hasAirConditioning: boolean;

  // Безопасность
  hasSecurity: boolean;
  securityType?: string;            // "guard", "camera", "both"
  hasAlarm: boolean;

  // Доступность
  hasParking: boolean;
  parkingSpaces?: number;
  hasLoadingDock: boolean;          // Разгрузочная зона
  hasElevator: boolean;
  isWheelchairAccessible: boolean;

  // Ограничения
  noiseRestrictions?: string;       // "after 22:00"
  dietaryRestrictions?: string[];   // ["halal_only"]
  brandRestrictions?: string[];     // Запрещенные бренды

  // Конкуренция
  competitorMachines?: number;      // Автоматы конкурентов
  nearbyVendingMachines?: number;   // Другие автоматы рядом

  // Особые условия
  specialConditions?: string[];
}

/**
 * Финансовые условия контракта
 */
interface ContractFinancials {
  // Основная аренда
  baseRent?: number;                // Фиксированная сумма
  rentCurrency: string;             // "UZS", "USD"

  // Доля от выручки
  revenueSharePercent?: number;     // % от выручки
  revenueShareMinimum?: number;     // Минимальная сумма

  // Комиссия
  commissionPercent?: number;       // % комиссии
  commissionMinimum?: number;       // Минимальная комиссия

  // Депозит
  depositAmount?: number;
  depositReturnable: boolean;

  // Коммунальные
  utilitiesIncluded: boolean;
  utilitiesCost?: number;           // Если не включены

  // Налоги
  vatIncluded: boolean;
  taxRate?: number;

  // Индексация
  annualIndexation?: number;        // % годовой индексации

  // Бонусы/штрафы
  earlyTerminationPenalty?: number;
  performanceBonus?: {
    threshold: number;              // Сумма продаж
    bonusPercent: number;           // Скидка на аренду
  };
}

/**
 * Метаданные локации
 */
interface LocationMetadata {
  // Источник
  source?: string;                  // "referral", "cold_call", "partner"
  referredBy?: string;              // Кто привел

  // CRM данные
  crmId?: string;                   // ID в внешней CRM
  externalId?: string;              // Внешний ID

  // Медиа
  photos?: {
    url: string;
    type: string;                   // "exterior", "interior", "spot"
    description?: string;
    uploadedAt: Date;
  }[];
  documents?: {
    url: string;
    name: string;
    type: string;                   // "contract", "permit", "photo"
    uploadedAt: Date;
  }[];

  // Теги
  tags?: string[];

  // Оценки
  potentialScore?: number;          // Оценка потенциала 1-10
  riskScore?: number;               // Оценка риска 1-10
  priorityScore?: number;           // Приоритет 1-10

  // Интеграции
  googlePlaceId?: string;
  yandexOrgId?: string;
  twoGisId?: string;
}

/**
 * Статистика локации
 */
interface LocationStats {
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
  averageServiceInterval: number;   // дней

  // Рейтинг
  customerRating?: number;          // 1-5
  operatorRating?: number;          // 1-5
  locationRating?: number;          // 1-5

  // Тренды
  revenueGrowth?: number;           // % роста
  transactionGrowth?: number;

  // Обновлено
  statsUpdatedAt?: Date;
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * Локация - точка размещения автоматов
 */
@Entity('locations')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'type'])
@Index(['city', 'status'])
@Index(['latitude', 'longitude'])
@Index(['status', 'deletedAt'])
export class Location extends BaseEntity {
  // ===== Основная информация =====

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  code: string;                     // "LOC-TAS-001"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: LocationType,
    default: LocationType.OTHER,
  })
  type: LocationType;

  @Column({
    type: 'enum',
    enum: LocationStatus,
    default: LocationStatus.PROSPECTING,
  })
  status: LocationStatus;

  // ===== Адрес =====

  @Column({ type: 'jsonb' })
  address: Address;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 100, nullable: true })
  region: string;

  @Column({ length: 20, nullable: true })
  postalCode: string;

  // ===== Координаты =====

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'jsonb', nullable: true })
  coordinates: Coordinates;

  // ===== Контакты =====

  @Column({ type: 'jsonb', default: [] })
  contacts: ContactPerson[];

  @Column({ length: 255, nullable: true })
  primaryContactName: string;

  @Column({ length: 50, nullable: true })
  primaryContactPhone: string;

  @Column({ length: 255, nullable: true })
  primaryContactEmail: string;

  // ===== Расписание =====

  @Column({ type: 'jsonb', nullable: true })
  workingHours: WeeklySchedule;

  @Column({ default: false })
  is24Hours: boolean;

  @Column({ type: 'jsonb', default: [] })
  holidays: {
    date: string;                   // "2024-01-01"
    name: string;
    isOpen: boolean;
    schedule?: DaySchedule;
  }[];

  @Column({ length: 50, default: 'Asia/Tashkent' })
  timezone: string;

  // ===== Характеристики =====

  @Column({ type: 'jsonb', default: {} })
  characteristics: LocationCharacteristics;

  // ===== Финансы =====

  @Column({
    type: 'enum',
    enum: ContractType,
    default: ContractType.RENT,
  })
  contractType: ContractType;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  monthlyRent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  revenueSharePercent: number;

  @Column({ length: 10, default: 'UZS' })
  currency: string;

  // ===== Зоны локации =====

  // @OneToMany(() => LocationZone, zone => zone.location)
  // zones: LocationZone[];

  // ===== Активный контракт =====

  @Column({ type: 'uuid', nullable: true })
  activeContractId: string;

  // @ManyToOne(() => LocationContract)
  // @JoinColumn({ name: 'activeContractId' })
  // activeContract: LocationContract;

  // ===== Статистика =====

  @Column({ type: 'jsonb', default: {} })
  stats: LocationStats;

  @Column({ default: 0 })
  machineCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ default: 0 })
  totalTransactions: number;

  // ===== Рейтинги =====

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number;                   // Общий рейтинг 1-5

  @Column({ default: 0 })
  ratingCount: number;

  // ===== Приоритет и оценка =====

  @Column({ type: 'int', default: 5 })
  priorityScore: number;            // 1-10

  @Column({ type: 'int', nullable: true })
  potentialScore: number;           // 1-10

  @Column({ type: 'int', nullable: true })
  riskScore: number;                // 1-10

  // ===== Метаданные =====

  @Column({ type: 'jsonb', default: {} })
  metadata: LocationMetadata;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVip: boolean;                   // VIP локация

  @Column({ default: false })
  requiresApproval: boolean;        // Требует одобрения для действий

  @Column({ default: false })
  hasExclusivity: boolean;          // Эксклюзивный контракт

  // ===== Multi-tenant =====

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // ===== Ответственные =====

  @Column({ type: 'uuid', nullable: true })
  managerId: string;                // Менеджер по локации

  @Column({ type: 'uuid', nullable: true })
  salesRepId: string;               // Торговый представитель

  // ===== Связи =====

  @OneToMany(() => LocationContract, contract => contract.location)
  contracts: LocationContract[];

  @OneToMany(() => LocationZone, zone => zone.location)
  zones: LocationZone[];

  @OneToMany(() => LocationEvent, event => event.location)
  events: LocationEvent[];

  @OneToMany(() => LocationNote, note => note.location)
  notes: LocationNote[];

  // ===== Timestamps =====

  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastVisitAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextVisitAt: Date;

  // ===== Hooks =====

  @BeforeInsert()
  generateCode() {
    if (!this.code) {
      const cityCode = (this.city || 'XXX').substring(0, 3).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.code = `LOC-${cityCode}-${random}`;
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateFullAddress() {
    if (this.address && !this.address.fullAddress) {
      const parts = [
        this.address.city,
        this.address.district,
        this.address.street,
        this.address.building,
      ].filter(Boolean);
      this.address.fullAddress = parts.join(', ');
    }
  }
}

/**
 * Зона в локации - конкретное место установки автомата
 */
@Entity('location_zones')
@Index(['locationId', 'isActive'])
export class LocationZone extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, location => location.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ length: 100 })
  name: string;                     // "Вход A", "2 этаж у лифта"

  @Column({ length: 50, unique: true })
  code: string;                     // "LOC-TAS-001-Z01"

  @Column({
    type: 'enum',
    enum: LocationZoneType,
    default: LocationZoneType.OTHER,
  })
  type: LocationZoneType;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Позиция в здании
  @Column({ nullable: true })
  floor: string;

  @Column({ nullable: true })
  section: string;

  @Column({ nullable: true })
  spot: string;                     // Конкретное место

  // Координаты внутри здания (опционально)
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  internalX: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  internalY: number;

  // Характеристики
  @Column({ type: 'jsonb', default: {} })
  characteristics: {
    hasElectricity: boolean;
    hasWifi: boolean;
    hasCCTV: boolean;
    footTraffic?: number;           // Проходимость
    visibility?: number;            // Видимость 1-10
    accessibility?: number;         // Доступность 1-10
  };

  // Размеры доступного места
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  availableWidth: number;           // см

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  availableDepth: number;           // см

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  availableHeight: number;          // см

  // Аренда для конкретной зоны
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  monthlyRent: number;

  // Установленный автомат
  @Column({ type: 'uuid', nullable: true })
  machineId: string;

  @Column({ default: false })
  isOccupied: boolean;

  // Флаги
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPremium: boolean;               // Премиум место

  @Column({ default: false })
  isReserved: boolean;              // Зарезервировано

  // Медиа
  @Column({ type: 'jsonb', default: [] })
  photos: {
    url: string;
    description?: string;
    uploadedAt: Date;
  }[];
}

/**
 * Контракт с локацией
 */
@Entity('location_contracts')
@Index(['locationId', 'status'])
@Index(['organizationId', 'status'])
@Index(['endDate', 'status'])
export class LocationContract extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, location => location.contracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // ===== Основные данные =====

  @Column({ length: 100, unique: true })
  contractNumber: string;           // "CT-2024-00001"

  @Column({ length: 255, nullable: true })
  title: string;

  @Column({
    type: 'enum',
    enum: ContractType,
    default: ContractType.RENT,
  })
  type: ContractType;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  // ===== Даты =====

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  signedDate: Date;

  @Column({ type: 'date', nullable: true })
  terminatedDate: Date;

  // Автопродление
  @Column({ default: false })
  autoRenewal: boolean;

  @Column({ type: 'int', default: 12 })
  renewalPeriodMonths: number;

  @Column({ type: 'int', default: 30 })
  noticeBeforeExpiryDays: number;   // За сколько дней уведомить

  // ===== Финансы =====

  @Column({ type: 'jsonb' })
  financials: ContractFinancials;

  @Column({
    type: 'enum',
    enum: PaymentFrequency,
    default: PaymentFrequency.MONTHLY,
  })
  paymentFrequency: PaymentFrequency;

  @Column({ type: 'int', default: 5 })
  paymentDueDay: number;            // День месяца для оплаты

  // Суммы для быстрого доступа
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  monthlyAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  revenueSharePercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ length: 10, default: 'UZS' })
  currency: string;

  // ===== Стороны контракта =====

  // Наша сторона
  @Column({ length: 255, nullable: true })
  companyName: string;

  @Column({ length: 255, nullable: true })
  companyRepresentative: string;

  // Сторона локации
  @Column({ length: 255 })
  landlordName: string;             // Арендодатель

  @Column({ length: 20, nullable: true })
  landlordInn: string;              // ИНН арендодателя

  @Column({ length: 255, nullable: true })
  landlordRepresentative: string;

  @Column({ length: 50, nullable: true })
  landlordPhone: string;

  @Column({ length: 255, nullable: true })
  landlordEmail: string;

  @Column({ type: 'text', nullable: true })
  landlordAddress: string;

  // ===== Условия =====

  @Column({ type: 'jsonb', default: [] })
  specialConditions: {
    condition: string;
    isActive: boolean;
  }[];

  @Column({ type: 'jsonb', default: [] })
  allowedMachineTypes: string[];    // Разрешенные типы автоматов

  @Column({ type: 'int', nullable: true })
  maxMachines: number;              // Макс. количество автоматов

  @Column({ type: 'jsonb', default: [] })
  restrictedProducts: string[];     // Запрещенные продукты

  // ===== Документы =====

  @Column({ type: 'jsonb', default: [] })
  documents: {
    id: string;
    name: string;
    type: string;                   // "contract", "annex", "act"
    url: string;
    uploadedAt: Date;
    uploadedBy: string;
  }[];

  @Column({ type: 'text', nullable: true })
  contractFileUrl: string;          // Основной файл контракта

  // ===== История платежей =====

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPaid: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDue: number;

  @Column({ type: 'date', nullable: true })
  lastPaymentDate: Date;

  @Column({ type: 'date', nullable: true })
  nextPaymentDate: Date;

  // ===== Примечания =====

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  terminationReason: string;

  // ===== Approval =====

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  // ===== Hooks =====

  @BeforeInsert()
  generateContractNumber() {
    if (!this.contractNumber) {
      const year = new Date().getFullYear();
      const random = Math.random().toString().substring(2, 7);
      this.contractNumber = `CT-${year}-${random}`;
    }
  }

  @BeforeUpdate()
  checkExpiry() {
    if (this.status === ContractStatus.ACTIVE && this.endDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(this.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= this.noticeBeforeExpiryDays && daysUntilExpiry > 0) {
        this.status = ContractStatus.EXPIRING_SOON;
      } else if (daysUntilExpiry <= 0) {
        this.status = ContractStatus.EXPIRED;
      }
    }
  }
}

/**
 * Оплата по контракту
 */
@Entity('location_contract_payments')
@Index(['contractId', 'status'])
@Index(['organizationId', 'dueDate'])
export class LocationContractPayment extends BaseEntity {
  @Column()
  contractId: string;

  @ManyToOne(() => LocationContract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: LocationContract;

  @Column()
  locationId: string;

  @Column()
  organizationId: string;

  // Период
  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  // Суммы
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  baseAmount: number;               // Базовая сумма

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  revenueShareAmount: number;       // Доля от выручки

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  utilitiesAmount: number;          // Коммунальные

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  penaltyAmount: number;            // Штрафы

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: number;           // Скидки

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;              // Итого к оплате

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;               // Оплачено

  @Column({ length: 10, default: 'UZS' })
  currency: string;

  // Даты
  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'date', nullable: true })
  paidDate: Date;

  // Статус
  @Column({
    type: 'enum',
    enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

  // Детали оплаты
  @Column({ length: 50, nullable: true })
  paymentMethod: string;            // "bank_transfer", "cash", "card"

  @Column({ length: 100, nullable: true })
  paymentReference: string;         // Номер платежки

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Документы
  @Column({ type: 'jsonb', default: [] })
  documents: {
    type: string;                   // "invoice", "receipt", "act"
    url: string;
    uploadedAt: Date;
  }[];

  @Column({ type: 'uuid', nullable: true })
  paidBy: string;
}

/**
 * События/история локации
 */
@Entity('location_events')
@Index(['locationId', 'eventType'])
@Index(['organizationId', 'createdAt'])
export class LocationEvent extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, location => location.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column()
  organizationId: string;

  @Column({
    type: 'enum',
    enum: LocationEventType,
  })
  eventType: LocationEventType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Связанные данные
  @Column({ type: 'uuid', nullable: true })
  relatedEntityId: string;          // ID связанной сущности

  @Column({ length: 50, nullable: true })
  relatedEntityType: string;        // "machine", "contract", "complaint"

  // Изменения (для status_changed и т.д.)
  @Column({ type: 'jsonb', nullable: true })
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];

  // Метаданные
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  // Пользователь
  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ length: 255, nullable: true })
  userName: string;
}

/**
 * Заметки по локации
 */
@Entity('location_notes')
@Index(['locationId', 'isPinned'])
export class LocationNote extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, location => location.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column()
  organizationId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ['general', 'important', 'warning', 'contact', 'meeting', 'todo'],
    default: 'general',
  })
  noteType: 'general' | 'important' | 'warning' | 'contact' | 'meeting' | 'todo';

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isPrivate: boolean;               // Видно только автору

  // Напоминание
  @Column({ type: 'timestamp', nullable: true })
  reminderAt: Date;

  @Column({ default: false })
  reminderSent: boolean;

  // Вложения
  @Column({ type: 'jsonb', default: [] })
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];

  @Column({ length: 255, nullable: true })
  createdByName: string;
}

/**
 * Посещения локации
 */
@Entity('location_visits')
@Index(['locationId', 'visitDate'])
@Index(['userId', 'visitDate'])
export class LocationVisit extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column()
  organizationId: string;

  @Column()
  userId: string;

  @Column({ length: 255, nullable: true })
  userName: string;

  // Время
  @Column({ type: 'date' })
  visitDate: Date;

  @Column({ type: 'time', nullable: true })
  checkInTime: string;

  @Column({ type: 'time', nullable: true })
  checkOutTime: string;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number;

  // Тип визита
  @Column({
    type: 'enum',
    enum: ['routine', 'service', 'inspection', 'meeting', 'installation', 'collection', 'complaint'],
    default: 'routine',
  })
  visitType: 'routine' | 'service' | 'inspection' | 'meeting' | 'installation' | 'collection' | 'complaint';

  // Геолокация
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  checkInLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  checkInLongitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  checkOutLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  checkOutLongitude: number;

  // Результат
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: [] })
  tasks: {
    description: string;
    completed: boolean;
  }[];

  @Column({ type: 'jsonb', default: [] })
  photos: {
    url: string;
    description?: string;
    takenAt: Date;
  }[];

  @Column({
    type: 'enum',
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  })
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

/**
 * Дефолтное расписание (пн-пт 9-18)
 */
export const DEFAULT_WORKING_HOURS: WeeklySchedule = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  saturday: { isOpen: false },
  sunday: { isOpen: false },
};

/**
 * Праздники Узбекистана
 */
export const UZBEKISTAN_HOLIDAYS_2024 = [
  { date: '2024-01-01', name: 'Новый год' },
  { date: '2024-03-08', name: 'Международный женский день' },
  { date: '2024-03-21', name: 'Навруз' },
  { date: '2024-05-09', name: 'День памяти и почестей' },
  { date: '2024-09-01', name: 'День независимости' },
  { date: '2024-10-01', name: 'День учителя' },
  { date: '2024-12-08', name: 'День Конституции' },
  // Исламские праздники (даты меняются)
  { date: '2024-04-10', name: 'Ийд аль-Фитр (Ураза-байрам)' },
  { date: '2024-06-17', name: 'Ийд аль-Адха (Курбан-байрам)' },
];

/**
 * Регионы Узбекистана
 */
export const UZBEKISTAN_REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon viloyati',
  'Buxoro viloyati',
  'Farg\'ona viloyati',
  'Jizzax viloyati',
  'Xorazm viloyati',
  'Namangan viloyati',
  'Navoiy viloyati',
  'Qashqadaryo viloyati',
  'Qoraqalpog\'iston Respublikasi',
  'Samarqand viloyati',
  'Sirdaryo viloyati',
  'Surxondaryo viloyati',
];

/**
 * Labels для типов локаций
 */
export const LOCATION_TYPE_LABELS: Record<LocationType, { ru: string; uz: string }> = {
  [LocationType.SHOPPING_CENTER]: { ru: 'Торговый центр', uz: 'Savdo markazi' },
  [LocationType.SUPERMARKET]: { ru: 'Супермаркет', uz: 'Supermarket' },
  [LocationType.BUSINESS_CENTER]: { ru: 'Бизнес центр', uz: 'Biznes markazi' },
  [LocationType.OFFICE]: { ru: 'Офис', uz: 'Ofis' },
  [LocationType.UNIVERSITY]: { ru: 'Университет', uz: 'Universitet' },
  [LocationType.SCHOOL]: { ru: 'Школа', uz: 'Maktab' },
  [LocationType.COLLEGE]: { ru: 'Колледж', uz: 'Kollej' },
  [LocationType.HOSPITAL]: { ru: 'Больница', uz: 'Kasalxona' },
  [LocationType.CLINIC]: { ru: 'Клиника', uz: 'Klinika' },
  [LocationType.PHARMACY]: { ru: 'Аптека', uz: 'Dorixona' },
  [LocationType.FITNESS]: { ru: 'Фитнес центр', uz: 'Fitnes markazi' },
  [LocationType.GYM]: { ru: 'Тренажерный зал', uz: 'Sport zali' },
  [LocationType.CINEMA]: { ru: 'Кинотеатр', uz: 'Kinoteatr' },
  [LocationType.ENTERTAINMENT]: { ru: 'Развлекательный центр', uz: 'Ko\'ngilochar markazi' },
  [LocationType.METRO_STATION]: { ru: 'Станция метро', uz: 'Metro bekati' },
  [LocationType.BUS_STATION]: { ru: 'Автовокзал', uz: 'Avtobekati' },
  [LocationType.TRAIN_STATION]: { ru: 'ЖД вокзал', uz: 'Temir yo\'l vokzali' },
  [LocationType.AIRPORT]: { ru: 'Аэропорт', uz: 'Aeroport' },
  [LocationType.GAS_STATION]: { ru: 'АЗС', uz: 'YoqMoy bekati' },
  [LocationType.HOTEL]: { ru: 'Отель', uz: 'Mehmonxona' },
  [LocationType.HOSTEL]: { ru: 'Хостел', uz: 'Xostel' },
  [LocationType.RESIDENTIAL]: { ru: 'Жилой комплекс', uz: 'Turar-joy majmuasi' },
  [LocationType.DORMITORY]: { ru: 'Общежитие', uz: 'Yotoqxona' },
  [LocationType.FACTORY]: { ru: 'Завод', uz: 'Zavod' },
  [LocationType.WAREHOUSE]: { ru: 'Склад', uz: 'Ombor' },
  [LocationType.INDUSTRIAL]: { ru: 'Промзона', uz: 'Sanoat zonasi' },
  [LocationType.GOVERNMENT]: { ru: 'Госучреждение', uz: 'Davlat muassasasi' },
  [LocationType.POLICE]: { ru: 'Полиция', uz: 'Politsiya' },
  [LocationType.MILITARY]: { ru: 'Военное учреждение', uz: 'Harbiy muassasa' },
  [LocationType.PARK]: { ru: 'Парк', uz: 'Bog\'' },
  [LocationType.STREET]: { ru: 'Улица', uz: 'Ko\'cha' },
  [LocationType.OTHER]: { ru: 'Другое', uz: 'Boshqa' },
};

/**
 * Labels для статусов локации
 */
export const LOCATION_STATUS_LABELS: Record<LocationStatus, { ru: string; uz: string; color: string }> = {
  [LocationStatus.PROSPECTING]: { ru: 'Поиск', uz: 'Qidiruv', color: '#9CA3AF' },
  [LocationStatus.CONTRACT_PENDING]: { ru: 'Ожидание контракта', uz: 'Shartnoma kutilmoqda', color: '#F59E0B' },
  [LocationStatus.ACTIVE]: { ru: 'Активная', uz: 'Faol', color: '#10B981' },
  [LocationStatus.SUSPENDED]: { ru: 'Приостановлена', uz: 'To\'xtatilgan', color: '#EF4444' },
  [LocationStatus.CLOSING]: { ru: 'Закрывается', uz: 'Yopilmoqda', color: '#F97316' },
  [LocationStatus.CLOSED]: { ru: 'Закрыта', uz: 'Yopiq', color: '#6B7280' },
};

/**
 * Labels для типов контрактов
 */
export const CONTRACT_TYPE_LABELS: Record<ContractType, { ru: string; uz: string }> = {
  [ContractType.RENT]: { ru: 'Фиксированная аренда', uz: 'Belgilangan ijara' },
  [ContractType.REVENUE_SHARE]: { ru: 'Доля от выручки', uz: 'Daromad ulushi' },
  [ContractType.HYBRID]: { ru: 'Фикс + доля', uz: 'Belgilangan + ulush' },
  [ContractType.FREE]: { ru: 'Бесплатно', uz: 'Bepul' },
  [ContractType.COMMISSION]: { ru: 'Комиссия', uz: 'Komissiya' },
};
