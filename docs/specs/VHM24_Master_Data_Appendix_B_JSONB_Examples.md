# VHM24 Master Data Management — JSONB Structure Examples

## Appendix B to Technical Specification v1.0

Этот документ содержит все примеры JSONB структур, используемых в системе справочников.

---

## 1. directories.settings

### 1.1 Базовая конфигурация

```json
{
  "allow_inline_create": true,
  "allow_local_overlay": true,
  "approval_required": false,
  "prefetch": false,
  "offline_enabled": false,
  "offline_max_entries": 1000
}
```

### 1.2 Справочник с prefetch (единицы измерения)

```json
{
  "allow_inline_create": true,
  "allow_local_overlay": false,
  "approval_required": false,
  "prefetch": true,
  "offline_enabled": true,
  "offline_max_entries": 100
}
```

### 1.3 Справочник с approval workflow

```json
{
  "allow_inline_create": true,
  "allow_local_overlay": true,
  "approval_required": true,
  "prefetch": false,
  "offline_enabled": false,
  "offline_max_entries": 1000,
  "approval_roles": ["manager", "admin"]
}
```

### 1.4 EXTERNAL справочник (ИКПУ)

```json
{
  "allow_inline_create": false,
  "allow_local_overlay": true,
  "approval_required": false,
  "prefetch": false,
  "offline_enabled": false,
  "offline_max_entries": 50000,
  "allow_select_deprecated": false,
  "show_deprecated_warning": true
}
```

---

## 2. directory_fields.validation_rules

### 2.1 Текстовое поле с regex

```json
{
  "regex": "^[A-Z]{2}\\d{6}$",
  "custom_message": "Код должен быть в формате XX000000 (2 буквы + 6 цифр)"
}
```

### 2.2 Текстовое поле с ограничением длины

```json
{
  "min_length": 3,
  "max_length": 100,
  "custom_message": "Название должно быть от 3 до 100 символов"
}
```

### 2.3 Числовое поле с диапазоном

```json
{
  "min_value": 0,
  "max_value": 999999999,
  "custom_message": "Цена должна быть положительным числом"
}
```

### 2.4 Поле с уникальностью

```json
{
  "unique_scope": "DIRECTORY",
  "custom_message": "Такой код уже существует в справочнике"
}
```

```json
{
  "unique_scope": "ORGANIZATION",
  "custom_message": "Такой код уже существует в вашей организации"
}
```

```json
{
  "unique_scope": "GLOBAL",
  "custom_message": "Такой код уже существует в системе"
}
```

### 2.5 Поле с допустимыми значениями

```json
{
  "allowed_values": ["NEW", "USED", "REFURBISHED"],
  "custom_message": "Состояние должно быть: Новый, Б/У или Восстановленный"
}
```

### 2.6 Conditional rules (кросс-поле)

```json
{
  "conditional_rules": [
    {
      "if": { "field": "type", "equals": "DRINK" },
      "then": { "field": "volume", "required": true }
    },
    {
      "if": { "field": "type", "in": ["FOOD", "SNACK"] },
      "then": { "field": "expiry_days", "required": true, "min_value": 1 }
    },
    {
      "if": { "field": "origin", "equals": "OFFICIAL" },
      "then": { "field": "external_key", "required": true }
    },
    {
      "if": { "field": "has_alcohol", "equals": true },
      "then": {
        "field": "alcohol_percent",
        "required": true,
        "min_value": 0.1,
        "max_value": 100
      }
    }
  ]
}
```

### 2.7 Async validator с rate limiting

```json
{
  "async_validator": "check_ikpu_exists",
  "rate_limit": {
    "requests_per_second": 10,
    "batch_size": 100,
    "cache_ttl_hours": 24
  }
}
```

### 2.8 Комплексная валидация

```json
{
  "regex": "^\\d{14}$",
  "min_length": 14,
  "max_length": 14,
  "unique_scope": "GLOBAL",
  "async_validator": "validate_ikpu_checksum",
  "custom_message": "ИКПУ должен содержать 14 цифр и пройти проверку контрольной суммы",
  "rate_limit": {
    "requests_per_second": 5,
    "batch_size": 50
  }
}
```

---

## 3. directory_fields.translations

```json
{
  "ru": "Категория товара",
  "uz": "Tovar kategoriyasi",
  "en": "Product Category"
}
```

---

## 4. directory_fields.default_value

### 4.1 Текст по умолчанию

```json
"Без названия"
```

### 4.2 Число по умолчанию

```json
0
```

### 4.3 Boolean по умолчанию

```json
true
```

### 4.4 SELECT по умолчанию (UUID)

```json
"550e8400-e29b-41d4-a716-446655440001"
```

### 4.5 MULTI-SELECT по умолчанию

```json
["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
```

---

## 5. directory_entries.translations

```json
{
  "ru": "Кока-Кола 0.5л",
  "uz": "Coca-Cola 0.5l",
  "en": "Coca-Cola 0.5L"
}
```

---

## 6. directory_entries.data

### 6.1 Товар (полный пример)

```json
{
  "category_id": "550e8400-e29b-41d4-a716-446655440001",
  "manufacturer_id": "550e8400-e29b-41d4-a716-446655440002",
  "unit_id": "550e8400-e29b-41d4-a716-446655440003",
  "price": 5000,
  "cost_price": 3500,
  "vat_rate": 12,
  "ikpu_code": "17101001001001",
  "barcode": "4607123456789",
  "volume": 0.5,
  "weight": 520,
  "shelf_life_days": 180,
  "storage_temperature": {
    "min": 2,
    "max": 25
  },
  "is_alcoholic": false,
  "is_age_restricted": false,
  "photo": {
    "file_id": "f_abc123",
    "url": "https://storage.example.com/goods/coca-cola-05.jpg",
    "thumb": "https://storage.example.com/goods/coca-cola-05_thumb.jpg",
    "name": "coca-cola-05.jpg"
  },
  "tags": ["популярное", "газированные", "напитки"]
}
```

### 6.2 Ингредиент

```json
{
  "category_id": "550e8400-e29b-41d4-a716-446655440010",
  "supplier_id": "550e8400-e29b-41d4-a716-446655440011",
  "unit_id": "550e8400-e29b-41d4-a716-446655440012",
  "cost_per_unit": 150,
  "min_stock": 100,
  "reorder_point": 200,
  "shelf_life_days": 365,
  "storage_conditions": "Хранить в сухом прохладном месте"
}
```

### 6.3 Автомат

```json
{
  "machine_type_id": "550e8400-e29b-41d4-a716-446655440020",
  "location_id": "550e8400-e29b-41d4-a716-446655440021",
  "serial_number": "VM2024-001234",
  "manufacturer": "Necta",
  "model": "Krea Touch",
  "year_manufactured": 2024,
  "purchase_date": "2024-01-15",
  "warranty_until": "2027-01-15",
  "slots_count": 8,
  "payment_methods": ["cash", "card", "qr"],
  "has_telemetry": true,
  "telemetry_id": "TLM-001234",
  "photo": {
    "file_id": "f_xyz789",
    "url": "https://storage.example.com/machines/vm-001234.jpg",
    "name": "vm-001234.jpg"
  }
}
```

### 6.4 Локация

```json
{
  "address": "г. Ташкент, ул. Навои, 100",
  "contractor_id": "550e8400-e29b-41d4-a716-446655440030",
  "location_type_id": "550e8400-e29b-41d4-a716-446655440031",
  "coordinates": {
    "lat": 41.311081,
    "lng": 69.240562
  },
  "working_hours": {
    "monday": { "open": "09:00", "close": "18:00" },
    "tuesday": { "open": "09:00", "close": "18:00" },
    "wednesday": { "open": "09:00", "close": "18:00" },
    "thursday": { "open": "09:00", "close": "18:00" },
    "friday": { "open": "09:00", "close": "18:00" },
    "saturday": { "open": "10:00", "close": "15:00" },
    "sunday": null
  },
  "contact_person": "Иванов Иван Иванович",
  "contact_phone": "+998901234567",
  "rent_amount": 500000,
  "rent_currency": "UZS",
  "contract_number": "АР-2024/001",
  "contract_date": "2024-01-01",
  "contract_end_date": "2025-01-01",
  "notes": "Ключи у охраны на входе"
}
```

### 6.5 Контрагент

```json
{
  "contractor_type_id": "550e8400-e29b-41d4-a716-446655440040",
  "legal_name": "ООО «Партнёр»",
  "inn": "123456789",
  "address_legal": "г. Ташкент, ул. Амира Темура, 50",
  "address_actual": "г. Ташкент, ул. Амира Темура, 50, офис 301",
  "bank_name": "Узпромстройбанк",
  "bank_mfo": "00450",
  "bank_account": "20208000123456789012",
  "director_name": "Петров Пётр Петрович",
  "director_position": "Директор",
  "contact_person": "Сидорова Анна",
  "contact_phone": "+998901234567",
  "contact_email": "partner@example.com",
  "contract_number": "П-2024/001",
  "contract_date": "2024-01-01",
  "payment_terms_days": 30,
  "is_supplier": true,
  "is_customer": false,
  "is_landlord": true
}
```

### 6.6 Файловое поле (FILE)

```json
{
  "contract_file": {
    "file_id": "f_contract_001",
    "url": "https://storage.example.com/contracts/contract-001.pdf",
    "name": "Договор_аренды_001.pdf",
    "size": 1024000,
    "mime_type": "application/pdf",
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
}
```

### 6.7 Изображение (IMAGE)

```json
{
  "photo": {
    "file_id": "i_photo_001",
    "url": "https://storage.example.com/images/photo-001.jpg",
    "thumb": "https://storage.example.com/images/photo-001_thumb.jpg",
    "name": "photo-001.jpg",
    "width": 1920,
    "height": 1080,
    "size": 512000,
    "mime_type": "image/jpeg"
  }
}
```

---

## 7. directory_sources.auth_config

### 7.1 Bearer Token

```json
{
  "type": "bearer",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 7.2 Basic Auth

```json
{
  "type": "basic",
  "username": "api_user",
  "password": "secret_password"
}
```

### 7.3 API Key в Header

```json
{
  "type": "api_key",
  "header": "X-API-Key",
  "value": "abc123xyz789"
}
```

### 7.4 API Key в Query

```json
{
  "type": "api_key_query",
  "param": "apikey",
  "value": "abc123xyz789"
}
```

### 7.5 OAuth2 Client Credentials

```json
{
  "type": "oauth2_client",
  "token_url": "https://auth.example.com/oauth/token",
  "client_id": "my_client_id",
  "client_secret": "my_client_secret",
  "scope": "read:data"
}
```

---

## 8. directory_sources.request_config

### 8.1 GET запрос с параметрами

```json
{
  "method": "GET",
  "headers": {
    "Accept": "application/json",
    "Accept-Language": "ru"
  },
  "query_params": {
    "format": "json",
    "page_size": "1000"
  }
}
```

### 8.2 POST запрос с телом

```json
{
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  "body": {
    "filters": {
      "status": "active"
    },
    "pagination": {
      "page": 1,
      "per_page": 1000
    }
  }
}
```

### 8.3 Запрос с таймаутами

```json
{
  "method": "GET",
  "headers": {
    "Accept": "application/json"
  },
  "timeout_ms": 30000,
  "retry_count": 3,
  "retry_delay_ms": 1000
}
```

---

## 9. directory_sources.column_mapping

### 9.1 Простой маппинг

```json
{
  "code": "code",
  "name_ru": "name",
  "description": "description"
}
```

### 9.2 Маппинг с вложенностью в data

```json
{
  "code": "code",
  "name_ru": "name",
  "name_uz": "translations.uz",
  "name_en": "translations.en",
  "category_code": "data.category_code",
  "price": "data.price",
  "vat_rate": "data.vat_rate"
}
```

### 9.3 Маппинг с трансформацией

```json
{
  "source_code": {
    "target": "code",
    "transform": "trim"
  },
  "source_name": {
    "target": "name",
    "transform": "trim"
  },
  "source_price": {
    "target": "data.price",
    "transform": "to_number"
  },
  "source_date": {
    "target": "data.valid_from",
    "transform": "to_date",
    "format": "DD.MM.YYYY"
  }
}
```

---

## 10. directory_sync_logs.errors

```json
[
  {
    "row": 15,
    "record": {
      "code": "123456",
      "name": "Invalid Item"
    },
    "field": "code",
    "message": "Code must be 14 digits",
    "error_code": "VALIDATION_FAILED"
  },
  {
    "row": 23,
    "record": {
      "code": "789012345678901",
      "name": "Another Item"
    },
    "field": "category_code",
    "message": "Category not found: XYZ",
    "error_code": "REFERENCE_NOT_FOUND"
  },
  {
    "row": 45,
    "record": {
      "code": "111222333444555",
      "name": ""
    },
    "field": "name",
    "message": "Name is required",
    "error_code": "REQUIRED_FIELD_EMPTY"
  }
]
```

---

## 11. directory_entry_audit (old_values / new_values)

### 11.1 Создание записи

```json
// old_values
null

// new_values
{
  "name": "Coca-Cola 0.5L",
  "code": "CC05",
  "status": "ACTIVE",
  "data": {
    "price": 5000,
    "category_id": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

### 11.2 Обновление записи

```json
// old_values
{
  "name": "Coca-Cola",
  "data": {
    "price": 4500
  }
}

// new_values
{
  "name": "Coca-Cola 0.5L",
  "data": {
    "price": 5000
  }
}
```

### 11.3 Архивирование

```json
// old_values
{
  "status": "ACTIVE"
}

// new_values
{
  "status": "ARCHIVED",
  "deleted_at": "2024-01-15T10:30:00Z"
}
```

---

## 12. directory_events.payload

### 12.1 ENTRY_CREATED

```json
{
  "entry": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Coca-Cola 0.5L",
    "code": "CC05",
    "origin": "LOCAL",
    "status": "ACTIVE"
  },
  "created_by": {
    "id": "user-uuid",
    "name": "Иванов И.И."
  }
}
```

### 12.2 ENTRY_UPDATED

```json
{
  "entry": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Coca-Cola 0.5L",
    "code": "CC05"
  },
  "changes": {
    "data.price": {
      "old": 4500,
      "new": 5000
    },
    "name": {
      "old": "Coca-Cola",
      "new": "Coca-Cola 0.5L"
    }
  },
  "changed_by": {
    "id": "user-uuid",
    "name": "Иванов И.И."
  }
}
```

### 12.3 SYNC_COMPLETED

```json
{
  "source": {
    "id": "source-uuid",
    "name": "IKPU API",
    "url": "https://api.example.com/ikpu"
  },
  "stats": {
    "total_records": 15000,
    "created": 150,
    "updated": 50,
    "deprecated": 5,
    "errors": 2
  },
  "duration_seconds": 45.2,
  "source_version": "2024.01.15"
}
```

### 12.4 IMPORT_COMPLETED

```json
{
  "job": {
    "id": "job-uuid",
    "file_name": "products.xlsx",
    "mode": "UPSERT"
  },
  "stats": {
    "total_rows": 500,
    "success": 485,
    "errors": 15
  },
  "duration_seconds": 12.5,
  "imported_by": {
    "id": "user-uuid",
    "name": "Иванов И.И."
  }
}
```

---

## 13. import_jobs.column_mapping

```json
{
  "A": "name",
  "B": "code",
  "C": "data.category_id",
  "D": "data.price",
  "E": null,
  "F": "data.unit_id",
  "G": "description",
  "H": "translations.uz"
}
```

---

## 14. import_jobs.errors

```json
[
  {
    "row": 15,
    "field": "code",
    "message": "Duplicate value: code 'ABC123' already exists",
    "error_code": "DUPLICATE",
    "data": {
      "name": "Test Item",
      "code": "ABC123"
    }
  },
  {
    "row": 23,
    "field": "data.category_id",
    "message": "Reference not found: 'Unknown Category'",
    "error_code": "REFERENCE_NOT_FOUND",
    "data": {
      "name": "Another Item",
      "category": "Unknown Category"
    }
  },
  {
    "row": 45,
    "field": "name",
    "message": "Required field is empty",
    "error_code": "REQUIRED_EMPTY",
    "data": {
      "code": "XYZ789",
      "name": ""
    }
  },
  {
    "row": 67,
    "field": "data.price",
    "message": "Invalid number format",
    "error_code": "INVALID_FORMAT",
    "data": {
      "name": "Some Item",
      "price": "not-a-number"
    }
  }
]
```

---

## 15. import_jobs.preview_data

```json
[
  {
    "row": 2,
    "values": {
      "A": "Coca-Cola 0.5L",
      "B": "CC05",
      "C": "Напитки",
      "D": "5000"
    },
    "mapped": {
      "name": "Coca-Cola 0.5L",
      "code": "CC05",
      "data.category_id": "Напитки",
      "data.price": 5000
    },
    "action": "CREATE",
    "status": "OK"
  },
  {
    "row": 3,
    "values": {
      "A": "Pepsi 0.5L",
      "B": "PP05",
      "C": "Напитки",
      "D": "4800"
    },
    "mapped": {
      "name": "Pepsi 0.5L",
      "code": "PP05",
      "data.category_id": "Напитки",
      "data.price": 4800
    },
    "action": "UPDATE",
    "status": "OK",
    "existing_id": "550e8400-e29b-41d4-a716-446655440099"
  },
  {
    "row": 4,
    "values": {
      "A": "",
      "B": "XX01",
      "C": "Unknown",
      "D": "abc"
    },
    "mapped": {
      "name": "",
      "code": "XX01",
      "data.category_id": "Unknown",
      "data.price": null
    },
    "action": null,
    "status": "ERROR",
    "errors": [
      { "field": "name", "message": "Required field is empty" },
      { "field": "data.category_id", "message": "Category not found" },
      { "field": "data.price", "message": "Invalid number format" }
    ]
  }
]
```

---

## 16. webhooks.headers

```json
{
  "X-Custom-Header": "custom-value",
  "X-Webhook-Version": "1.0",
  "X-Source": "vhm24-directory-system"
}
```

---

## 17. Webhook Payload (полный пример)

```json
{
  "id": "evt_550e8400-e29b-41d4-a716-446655440000",
  "event_type": "ENTRY_UPDATED",
  "timestamp": "2024-01-15T10:30:00.123Z",
  "directory": {
    "id": "dir_550e8400-e29b-41d4-a716-446655440001",
    "slug": "goods",
    "name": "Товары"
  },
  "entry": {
    "id": "ent_550e8400-e29b-41d4-a716-446655440002",
    "name": "Coca-Cola 0.5L",
    "code": "CC05",
    "origin": "LOCAL",
    "status": "ACTIVE",
    "version": 3
  },
  "changes": {
    "data.price": {
      "old": 4500,
      "new": 5000
    }
  },
  "actor": {
    "id": "usr_550e8400-e29b-41d4-a716-446655440003",
    "name": "Иванов Иван Иванович",
    "email": "ivanov@example.com"
  },
  "organization": {
    "id": "org_550e8400-e29b-41d4-a716-446655440004",
    "name": "Головной офис"
  },
  "batch_id": null,
  "sequence_num": null,
  "metadata": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
  }
}
```

---

**Конец Appendix B**
