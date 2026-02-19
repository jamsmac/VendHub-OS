/**
 * Location Enums for VendHub OS
 * All enum types used across location entities
 */

import { ContractType, ContractStatus } from "../../../common/enums";

// Re-export shared enums for backward compatibility
export { ContractType, ContractStatus };

/**
 * Тип локации
 */
export enum LocationType {
  // Коммерческие
  SHOPPING_CENTER = "shopping_center", // Торговый центр
  SUPERMARKET = "supermarket", // Супермаркет
  BUSINESS_CENTER = "business_center", // Бизнес центр
  OFFICE = "office", // Офис

  // Образование
  UNIVERSITY = "university", // Университет
  SCHOOL = "school", // Школа
  COLLEGE = "college", // Колледж

  // Здравоохранение
  HOSPITAL = "hospital", // Больница
  CLINIC = "clinic", // Клиника
  PHARMACY = "pharmacy", // Аптека

  // Развлечения и спорт
  FITNESS = "fitness", // Фитнес центр
  GYM = "gym", // Тренажерный зал
  CINEMA = "cinema", // Кинотеатр
  ENTERTAINMENT = "entertainment", // Развлекательный центр

  // Транспорт
  METRO_STATION = "metro_station", // Станция метро
  BUS_STATION = "bus_station", // Автовокзал
  TRAIN_STATION = "train_station", // ЖД вокзал
  AIRPORT = "airport", // Аэропорт
  GAS_STATION = "gas_station", // АЗС

  // Проживание
  HOTEL = "hotel", // Отель
  HOSTEL = "hostel", // Хостел
  RESIDENTIAL = "residential", // Жилой комплекс
  DORMITORY = "dormitory", // Общежитие

  // Промышленность
  FACTORY = "factory", // Завод
  WAREHOUSE = "warehouse", // Склад
  INDUSTRIAL = "industrial", // Промзона

  // Государственные
  GOVERNMENT = "government", // Госучреждение
  POLICE = "police", // Полиция
  MILITARY = "military", // Военное учреждение

  // Другое
  PARK = "park", // Парк
  STREET = "street", // Улица
  OTHER = "other", // Другое
}

/**
 * Статус локации
 */
export enum LocationStatus {
  PROSPECTING = "prospecting", // Поиск/переговоры
  CONTRACT_PENDING = "contract_pending", // Ожидание контракта
  ACTIVE = "active", // Активная
  SUSPENDED = "suspended", // Приостановлена
  CLOSING = "closing", // Закрывается
  CLOSED = "closed", // Закрыта
}

/**
 * Периодичность оплаты
 */
export enum PaymentFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually",
}

/**
 * Тип события локации
 */
export enum LocationEventType {
  // Статус
  CREATED = "created",
  STATUS_CHANGED = "status_changed",
  ACTIVATED = "activated",
  SUSPENDED = "suspended",
  CLOSED = "closed",

  // Контракт
  CONTRACT_SIGNED = "contract_signed",
  CONTRACT_RENEWED = "contract_renewed",
  CONTRACT_TERMINATED = "contract_terminated",
  CONTRACT_PAYMENT = "contract_payment",

  // Автоматы
  MACHINE_INSTALLED = "machine_installed",
  MACHINE_REMOVED = "machine_removed",
  MACHINE_REPLACED = "machine_replaced",

  // Инциденты
  COMPLAINT_RECEIVED = "complaint_received",
  INCIDENT_REPORTED = "incident_reported",
  INSPECTION_COMPLETED = "inspection_completed",

  // Контакт
  CONTACT_UPDATED = "contact_updated",
  MEETING_SCHEDULED = "meeting_scheduled",
  NEGOTIATION = "negotiation",

  // Другое
  NOTE_ADDED = "note_added",
  DOCUMENT_UPLOADED = "document_uploaded",
  PHOTO_UPLOADED = "photo_uploaded",
}

/**
 * День недели
 */
export enum DayOfWeek {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

/**
 * Тип зоны в локации
 */
export enum LocationZoneType {
  ENTRANCE = "entrance", // Вход
  LOBBY = "lobby", // Холл/Лобби
  FOOD_COURT = "food_court", // Фуд-корт
  HALLWAY = "hallway", // Коридор
  FLOOR = "floor", // Этаж
  DEPARTMENT = "department", // Отдел
  WAITING_AREA = "waiting_area", // Зона ожидания
  REST_AREA = "rest_area", // Зона отдыха
  OUTDOOR = "outdoor", // Улица/снаружи
  OTHER = "other",
}
