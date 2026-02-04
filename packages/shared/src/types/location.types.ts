/**
 * Location Types for VendHub OS
 * Location and address management
 */

export enum LocationType {
  OFFICE = 'office',
  SHOPPING_CENTER = 'shopping_center',
  UNIVERSITY = 'university',
  HOSPITAL = 'hospital',
  AIRPORT = 'airport',
  TRAIN_STATION = 'train_station',
  GAS_STATION = 'gas_station',
  HOTEL = 'hotel',
  RESIDENTIAL = 'residential',
  INDUSTRIAL = 'industrial',
  OTHER = 'other',
}

export enum LocationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  CLOSED = 'closed',
}

export interface ILocation {
  id: string;
  organizationId: string;
  name: string;
  type: LocationType;
  status: LocationStatus;

  // Address
  address: string;
  city: string;
  district?: string;
  region?: string;
  postalCode?: string;
  country: string;

  // Coordinates
  latitude: number;
  longitude: number;

  // Contact
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;

  // Operating hours
  operatingHours?: IOperatingHours;

  // Additional info
  notes?: string;
  photos?: string[];
  footTraffic?: FootTrafficLevel;
  rentAmount?: number;
  rentCurrency?: string;

  // Contract
  contractStartDate?: Date;
  contractEndDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IOperatingHours {
  monday?: IDayHours;
  tuesday?: IDayHours;
  wednesday?: IDayHours;
  thursday?: IDayHours;
  friday?: IDayHours;
  saturday?: IDayHours;
  sunday?: IDayHours;
}

export interface IDayHours {
  isOpen: boolean;
  openTime?: string; // HH:mm
  closeTime?: string; // HH:mm
  breakStart?: string;
  breakEnd?: string;
}

export enum FootTrafficLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export interface ILocationCreate {
  organizationId: string;
  name: string;
  type: LocationType;
  address: string;
  city: string;
  district?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  operatingHours?: IOperatingHours;
  notes?: string;
  photos?: string[];
  footTraffic?: FootTrafficLevel;
  rentAmount?: number;
  rentCurrency?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
}

export interface ILocationUpdate {
  name?: string;
  type?: LocationType;
  status?: LocationStatus;
  address?: string;
  city?: string;
  district?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  operatingHours?: IOperatingHours;
  notes?: string;
  photos?: string[];
  footTraffic?: FootTrafficLevel;
  rentAmount?: number;
  rentCurrency?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
}

export interface ILocationWithMachines extends ILocation {
  machines: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
  }>;
  machineCount: number;
}

export interface INearbyLocation extends ILocation {
  distance: number; // in meters
}

// Location type icons
export const LOCATION_TYPE_ICONS: Record<LocationType, string> = {
  [LocationType.OFFICE]: '🏢',
  [LocationType.SHOPPING_CENTER]: '🛍️',
  [LocationType.UNIVERSITY]: '🎓',
  [LocationType.HOSPITAL]: '🏥',
  [LocationType.AIRPORT]: '✈️',
  [LocationType.TRAIN_STATION]: '🚆',
  [LocationType.GAS_STATION]: '⛽',
  [LocationType.HOTEL]: '🏨',
  [LocationType.RESIDENTIAL]: '🏠',
  [LocationType.INDUSTRIAL]: '🏭',
  [LocationType.OTHER]: '📍',
};

// Location type labels
export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  [LocationType.OFFICE]: 'Офис',
  [LocationType.SHOPPING_CENTER]: 'ТЦ',
  [LocationType.UNIVERSITY]: 'Университет',
  [LocationType.HOSPITAL]: 'Больница',
  [LocationType.AIRPORT]: 'Аэропорт',
  [LocationType.TRAIN_STATION]: 'Ж/Д вокзал',
  [LocationType.GAS_STATION]: 'АЗС',
  [LocationType.HOTEL]: 'Отель',
  [LocationType.RESIDENTIAL]: 'Жилой комплекс',
  [LocationType.INDUSTRIAL]: 'Промышленный объект',
  [LocationType.OTHER]: 'Другое',
};

// Location status labels
export const LOCATION_STATUS_LABELS: Record<LocationStatus, string> = {
  [LocationStatus.ACTIVE]: 'Активная',
  [LocationStatus.INACTIVE]: 'Неактивная',
  [LocationStatus.PENDING]: 'На согласовании',
  [LocationStatus.CLOSED]: 'Закрыта',
};

// Foot traffic labels
export const FOOT_TRAFFIC_LABELS: Record<FootTrafficLevel, string> = {
  [FootTrafficLevel.LOW]: 'Низкая',
  [FootTrafficLevel.MEDIUM]: 'Средняя',
  [FootTrafficLevel.HIGH]: 'Высокая',
  [FootTrafficLevel.VERY_HIGH]: 'Очень высокая',
};

// Default operating hours (24/7)
export const DEFAULT_OPERATING_HOURS: IOperatingHours = {
  monday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
  tuesday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
  wednesday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
  thursday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
  friday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
  saturday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
  sunday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
};

// Tashkent regions/districts
export const TASHKENT_DISTRICTS = [
  'Алмазарский',
  'Бектемирский',
  'Мирабадский',
  'Мирзо-Улугбекский',
  'Сергелийский',
  'Учтепинский',
  'Чиланзарский',
  'Шайхантахурский',
  'Юнусабадский',
  'Яккасарайский',
  'Яшнабадский',
] as const;
