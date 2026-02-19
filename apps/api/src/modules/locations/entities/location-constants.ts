/**
 * Location Constants for VendHub OS
 * Helper constants, labels, and default values
 */

import type { WeeklySchedule } from "./location-interfaces";
import { LocationType, LocationStatus, ContractType } from "./location-enums";

/**
 * Дефолтное расписание (пн-пт 9-18)
 */
export const DEFAULT_WORKING_HOURS: WeeklySchedule = {
  monday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
  tuesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
  wednesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
  thursday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
  friday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
  saturday: { isOpen: false },
  sunday: { isOpen: false },
};

/**
 * Праздники Узбекистана
 */
export const UZBEKISTAN_HOLIDAYS_2024 = [
  { date: "2024-01-01", name: "Новый год" },
  { date: "2024-03-08", name: "Международный женский день" },
  { date: "2024-03-21", name: "Навруз" },
  { date: "2024-05-09", name: "День памяти и почестей" },
  { date: "2024-09-01", name: "День независимости" },
  { date: "2024-10-01", name: "День учителя" },
  { date: "2024-12-08", name: "День Конституции" },
  // Исламские праздники (даты меняются)
  { date: "2024-04-10", name: "Ийд аль-Фитр (Ураза-байрам)" },
  { date: "2024-06-17", name: "Ийд аль-Адха (Курбан-байрам)" },
];

/**
 * Регионы Узбекистана
 */
export const UZBEKISTAN_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog'iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
];

/**
 * Labels для типов локаций
 */
export const LOCATION_TYPE_LABELS: Record<
  LocationType,
  { ru: string; uz: string }
> = {
  [LocationType.SHOPPING_CENTER]: { ru: "Торговый центр", uz: "Savdo markazi" },
  [LocationType.SUPERMARKET]: { ru: "Супермаркет", uz: "Supermarket" },
  [LocationType.BUSINESS_CENTER]: { ru: "Бизнес центр", uz: "Biznes markazi" },
  [LocationType.OFFICE]: { ru: "Офис", uz: "Ofis" },
  [LocationType.UNIVERSITY]: { ru: "Университет", uz: "Universitet" },
  [LocationType.SCHOOL]: { ru: "Школа", uz: "Maktab" },
  [LocationType.COLLEGE]: { ru: "Колледж", uz: "Kollej" },
  [LocationType.HOSPITAL]: { ru: "Больница", uz: "Kasalxona" },
  [LocationType.CLINIC]: { ru: "Клиника", uz: "Klinika" },
  [LocationType.PHARMACY]: { ru: "Аптека", uz: "Dorixona" },
  [LocationType.FITNESS]: { ru: "Фитнес центр", uz: "Fitnes markazi" },
  [LocationType.GYM]: { ru: "Тренажерный зал", uz: "Sport zali" },
  [LocationType.CINEMA]: { ru: "Кинотеатр", uz: "Kinoteatr" },
  [LocationType.ENTERTAINMENT]: {
    ru: "Развлекательный центр",
    uz: "Ko'ngilochar markazi",
  },
  [LocationType.METRO_STATION]: { ru: "Станция метро", uz: "Metro bekati" },
  [LocationType.BUS_STATION]: { ru: "Автовокзал", uz: "Avtobekati" },
  [LocationType.TRAIN_STATION]: { ru: "ЖД вокзал", uz: "Temir yo'l vokzali" },
  [LocationType.AIRPORT]: { ru: "Аэропорт", uz: "Aeroport" },
  [LocationType.GAS_STATION]: { ru: "АЗС", uz: "YoqMoy bekati" },
  [LocationType.HOTEL]: { ru: "Отель", uz: "Mehmonxona" },
  [LocationType.HOSTEL]: { ru: "Хостел", uz: "Xostel" },
  [LocationType.RESIDENTIAL]: {
    ru: "Жилой комплекс",
    uz: "Turar-joy majmuasi",
  },
  [LocationType.DORMITORY]: { ru: "Общежитие", uz: "Yotoqxona" },
  [LocationType.FACTORY]: { ru: "Завод", uz: "Zavod" },
  [LocationType.WAREHOUSE]: { ru: "Склад", uz: "Ombor" },
  [LocationType.INDUSTRIAL]: { ru: "Промзона", uz: "Sanoat zonasi" },
  [LocationType.GOVERNMENT]: { ru: "Госучреждение", uz: "Davlat muassasasi" },
  [LocationType.POLICE]: { ru: "Полиция", uz: "Politsiya" },
  [LocationType.MILITARY]: { ru: "Военное учреждение", uz: "Harbiy muassasa" },
  [LocationType.PARK]: { ru: "Парк", uz: "Bog'" },
  [LocationType.STREET]: { ru: "Улица", uz: "Ko'cha" },
  [LocationType.OTHER]: { ru: "Другое", uz: "Boshqa" },
};

/**
 * Labels для статусов локации
 */
export const LOCATION_STATUS_LABELS: Record<
  LocationStatus,
  { ru: string; uz: string; color: string }
> = {
  [LocationStatus.PROSPECTING]: {
    ru: "Поиск",
    uz: "Qidiruv",
    color: "#9CA3AF",
  },
  [LocationStatus.CONTRACT_PENDING]: {
    ru: "Ожидание контракта",
    uz: "Shartnoma kutilmoqda",
    color: "#F59E0B",
  },
  [LocationStatus.ACTIVE]: { ru: "Активная", uz: "Faol", color: "#10B981" },
  [LocationStatus.SUSPENDED]: {
    ru: "Приостановлена",
    uz: "To'xtatilgan",
    color: "#EF4444",
  },
  [LocationStatus.CLOSING]: {
    ru: "Закрывается",
    uz: "Yopilmoqda",
    color: "#F97316",
  },
  [LocationStatus.CLOSED]: { ru: "Закрыта", uz: "Yopiq", color: "#6B7280" },
};

/**
 * Labels для типов контрактов
 */
export const CONTRACT_TYPE_LABELS: Partial<
  Record<ContractType, { ru: string; uz: string }>
> = {
  [ContractType.RENT]: { ru: "Фиксированная аренда", uz: "Belgilangan ijara" },
  [ContractType.REVENUE_SHARE]: { ru: "Доля от выручки", uz: "Daromad ulushi" },
  [ContractType.HYBRID]: { ru: "Фикс + доля", uz: "Belgilangan + ulush" },
  [ContractType.FREE]: { ru: "Бесплатно", uz: "Bepul" },
  [ContractType.COMMISSION]: { ru: "Комиссия", uz: "Komissiya" },
};
