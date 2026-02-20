/**
 * Validation Constants for VendHub OS
 */

// String length limits
export const STRING_LENGTHS = {
  // General
  NAME_MIN: 2,
  NAME_MAX: 100,
  DESCRIPTION_MAX: 2000,
  NOTES_MAX: 5000,
  ADDRESS_MAX: 500,

  // User
  EMAIL_MAX: 255,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  PHONE_MIN: 9,
  PHONE_MAX: 15,

  // Product
  SKU_MIN: 3,
  SKU_MAX: 50,
  BARCODE_MAX: 20,

  // Machine
  SERIAL_NUMBER_MIN: 5,
  SERIAL_NUMBER_MAX: 50,

  // Organization
  SLUG_MIN: 3,
  SLUG_MAX: 50,
  INN_LENGTH: 9,
  API_KEY_LENGTH: 64,

  // Codes
  MXIK_CODE_LENGTH: 17,
  IKPU_CODE_LENGTH: 17,

  // File
  FILENAME_MAX: 255,
} as const;

// Number limits
export const NUMBER_LIMITS = {
  // Price
  PRICE_MIN: 0,
  PRICE_MAX: 999999999, // ~1 billion

  // Quantity
  QUANTITY_MIN: 0,
  QUANTITY_MAX: 999999,

  // Percentage
  PERCENTAGE_MIN: 0,
  PERCENTAGE_MAX: 100,

  // Coordinates
  LATITUDE_MIN: -90,
  LATITUDE_MAX: 90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX: 180,

  // Temperature
  TEMPERATURE_MIN: -50,
  TEMPERATURE_MAX: 100,

  // Radius (meters)
  RADIUS_MIN: 1,
  RADIUS_MAX: 100000,

  // Duration (minutes)
  DURATION_MIN: 1,
  DURATION_MAX: 10080, // 7 days

  // Machine slots
  SLOT_CAPACITY_MIN: 1,
  SLOT_CAPACITY_MAX: 100,
} as const;

// Array limits
export const ARRAY_LIMITS = {
  TAGS_MAX: 20,
  PHOTOS_MAX: 10,
  ALLERGENS_MAX: 30,
  ITEMS_PER_REQUEST_MAX: 100,
  BULK_OPERATION_MAX: 1000,
} as const;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

// Date limits
export const DATE_LIMITS = {
  MIN_DATE: new Date('2020-01-01'),
  MAX_DATE: new Date('2099-12-31'),
  CONTRACT_MAX_YEARS: 10,
  EXPIRATION_MAX_DAYS: 365 * 5, // 5 years
} as const;

// File validation
export const FILE_VALIDATION = {
  IMAGE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    minWidth: 100,
    minHeight: 100,
    maxWidth: 8192,
    maxHeight: 8192,
  },
  PHOTO: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png'],
    minWidth: 640,
    minHeight: 480,
    maxWidth: 4096,
    maxHeight: 4096,
  },
  DOCUMENT: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  IMPORT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
} as const;

// Validation error messages (Russian)
export const VALIDATION_MESSAGES = {
  // Required
  REQUIRED: 'Обязательное поле',
  REQUIRED_FIELD: (field: string) => `Поле "${field}" обязательно`,

  // String
  STRING_MIN: (min: number) => `Минимум ${min} символов`,
  STRING_MAX: (max: number) => `Максимум ${max} символов`,
  STRING_LENGTH: (len: number) => `Должно быть ${len} символов`,

  // Number
  NUMBER_MIN: (min: number) => `Минимум ${min}`,
  NUMBER_MAX: (max: number) => `Максимум ${max}`,
  NUMBER_POSITIVE: 'Должно быть положительным числом',
  NUMBER_INTEGER: 'Должно быть целым числом',

  // Email
  EMAIL_INVALID: 'Некорректный email',
  EMAIL_EXISTS: 'Email уже зарегистрирован',

  // Phone
  PHONE_INVALID: 'Некорректный номер телефона',
  PHONE_EXISTS: 'Телефон уже зарегистрирован',

  // Password
  PASSWORD_TOO_SHORT: `Минимум ${PASSWORD_REQUIREMENTS.MIN_LENGTH} символов`,
  PASSWORD_REQUIRES_UPPERCASE: 'Должна содержать заглавную букву',
  PASSWORD_REQUIRES_LOWERCASE: 'Должна содержать строчную букву',
  PASSWORD_REQUIRES_NUMBER: 'Должна содержать цифру',
  PASSWORD_REQUIRES_SPECIAL: 'Должна содержать специальный символ',
  PASSWORDS_NOT_MATCH: 'Пароли не совпадают',

  // Date
  DATE_INVALID: 'Некорректная дата',
  DATE_PAST: 'Дата должна быть в прошлом',
  DATE_FUTURE: 'Дата должна быть в будущем',
  DATE_RANGE_INVALID: 'Некорректный период',

  // File
  FILE_TOO_LARGE: (maxMb: number) => `Максимальный размер файла ${maxMb} МБ`,
  FILE_TYPE_INVALID: 'Недопустимый тип файла',
  IMAGE_TOO_SMALL: 'Изображение слишком маленькое',
  IMAGE_TOO_LARGE: 'Изображение слишком большое',

  // Arrays
  ARRAY_MIN: (min: number) => `Минимум ${min} элементов`,
  ARRAY_MAX: (max: number) => `Максимум ${max} элементов`,

  // Unique
  ALREADY_EXISTS: 'Уже существует',
  SKU_EXISTS: 'SKU уже используется',
  SERIAL_EXISTS: 'Серийный номер уже используется',
  SLUG_EXISTS: 'Slug уже используется',

  // Coordinates
  LATITUDE_INVALID: 'Некорректная широта',
  LONGITUDE_INVALID: 'Некорректная долгота',

  // Other
  INVALID_FORMAT: 'Некорректный формат',
  INVALID_VALUE: 'Некорректное значение',
  NOT_FOUND: 'Не найдено',
} as const;

// Validation error messages (Uzbek)
export const VALIDATION_MESSAGES_UZ = {
  REQUIRED: "Majburiy maydon",
  STRING_MIN: (min: number) => `Kamida ${min} ta belgi`,
  STRING_MAX: (max: number) => `Ko'pi bilan ${max} ta belgi`,
  EMAIL_INVALID: "Noto'g'ri email",
  PHONE_INVALID: "Noto'g'ri telefon raqami",
  PASSWORD_TOO_SHORT: `Kamida ${PASSWORD_REQUIREMENTS.MIN_LENGTH} ta belgi`,
  ALREADY_EXISTS: 'Allaqachon mavjud',
} as const;
