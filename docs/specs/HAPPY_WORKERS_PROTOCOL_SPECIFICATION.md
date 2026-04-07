# Happy Workers Vending Machine Protocol Specification

**Source:** PHP backup at `VHD/FULL_BACKUP/vending.alg/App/`
**Purpose:** Reference for implementing these endpoints in VendHub OS (NestJS)
**Date:** 2026-04-05
**Database:** MySQL `vending` (InnoDB, utf8mb4)
**Base URL (legacy):** `https://vending.alg.yasam.top`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Machine-to-Server Protocol](#2-machine-to-server-protocol)
3. [Payment Flow](#3-payment-flow)
4. [Payment Operator Integrations](#4-payment-operator-integrations)
5. [Office/Admin API](#5-officeadmin-api)
6. [Data Model](#6-data-model)
7. [Complete API Endpoint Registry](#7-complete-api-endpoint-registry)
8. [Error Codes](#8-error-codes)
9. [Migration Notes for VendHub OS](#9-migration-notes-for-vendhub-os)

---

## 1. Architecture Overview

### 1.1 System Components

```
+---------------------+        +--------------------+        +---------------------+
|  Happy Workers      |        |   PHP Server       |        |  Payment Operators  |
|  Vending Machines   |------->|  (vending.alg)     |<------>|  Click / Payme /    |
|  (GJ Vending HW)   |<-------|                    |        |  Uzum               |
+---------------------+        +--------------------+        +---------------------+
        |                              |    |                          |
        |                              |    |                          |
        v                              v    v                          v
+---------------------+        +--------------------+        +---------------------+
|  Customer's Phone   |        |  Telegram Bot      |        |  MultiKassa         |
|  (scans QR)         |------->|  (@DostavkaOk_bot) |        |  (Fiscal/Tax)       |
+---------------------+        +--------------------+        +---------------------+
```

### 1.2 Routing Mechanism

The PHP app uses file-system routing. Each `index.php` under `App/public/` maps to a URL path:

| File Path | URL |
|-----------|-----|
| `public/api/v1/qrParameter/index.php` | `POST /api/v1/qrParameter/` |
| `public/api/v1/vendingCash/index.php` | `POST /api/v1/vendingCash/` |
| `public/api/v1/finishDeliver/index.php` | `GET /api/v1/finishDeliver/` |
| `public/api/v1/payment/index.php` | `GET/POST /api/v1/payment/` |
| `public/api/v1/payment/paymeUz/index.php` | `POST /api/v1/payment/paymeUz/` |
| `public/api/v1/payment/clickUz/prepare/index.php` | `POST /api/v1/payment/clickUz/prepare/` |
| `public/api/v1/payment/clickUz/complete/index.php` | `POST /api/v1/payment/clickUz/complete/` |
| `public/api/v1/operators/clickUz/prepare/index.php` | `POST /api/v1/operators/clickUz/prepare/` |
| `public/api/v1/operators/clickUz/complete/index.php` | `POST /api/v1/operators/clickUz/complete/` |
| `public/api/v1/payment/uzumUz_old/check/index.php` | `POST /api/v1/payment/uzumUz_old/check/` |
| `public/api/v1/payment/uzumUz_old/create/index.php` | `POST /api/v1/payment/uzumUz_old/create/` |
| `public/api/v1/payment/uzumUz_old/confirm/index.php` | `POST /api/v1/payment/uzumUz_old/confirm/` |
| `public/office/goods/index.php` | `GET/POST /office/goods/` |
| `public/office/vendingMashine/index.php` | `GET/POST /office/vendingMashine/` |
| `public/office/reports/index.php` | `GET/POST /office/reports/` |

### 1.3 Authentication Mechanisms

| Context | Mechanism | Details |
|---------|-----------|---------|
| Machine callbacks (qrParameter, vendingCash, finishDeliver) | **None** | Open endpoints, machine IP not validated |
| Click.uz | **MD5 signature** | `md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + [merchant_prepare_id +] amount + action + sign_time)` |
| Payme.uz | **HTTP Basic Auth** | Login: `Paycom`, Password: merchant key (test or prod) |
| Uzum Bank | **HTTP Basic Auth** | Login: `uzumBilling`, Password: `ZpaTNC8YY7ZjCd69arr5GwAAAJg` |
| Office (Admin Panel) | **Session via header** | `X-Session: <session_id>` checked against `SessionOffice` table |

### 1.4 Base API Class Hierarchy

```
FenixBaseApi (lib/core/FenixBaseApi.php)
  - uses Utility trait
  - provides: initCore(), initRequestBase(), initCRUD(), OutPutResult(), OutPutResultException()
  - provides: existsAndValid(), jsonEncode(), saveLog(), Class2Array(), Array2Class()
  - $this->Inputs = parsed request body (JSON or form-urlencoded)
  - $this->crud = database CRUD wrapper (mDB)
  - $this->runTime->humans = "Y-m-d H:i:s"
  - $this->runTime->microtime = millisecond timestamp

Response envelope (CompiledOut pattern):
{
    "success": 0,           // 0 = success, >0 = error code
    "resultCode": "200",    // HTTP-like status code as string
    "resultMsg": "ok",      // human message
    "result": "ok",         // "ok" or "error-{code}"
    ...payload fields...
}
```

---

## 2. Machine-to-Server Protocol

The vending machines (Happy Workers / GJ Vending hardware) communicate with the server via three primary callbacks. The machine firmware makes HTTP requests to preconfigured server URLs.

### 2.1 QR Parameter Request (Machine requests QR for customer payment)

This is the PRIMARY protocol entry point. When a customer selects a product on the vending machine screen, the machine calls this endpoint to get a QR code image URL. The customer scans the QR to pay.

**Endpoint:** `POST /api/v1/qrParameter/`
**PHP Class:** `qrParameter` / `qrParameter_new`
**HTTP Methods:** GET, POST
**Content-Type:** `application/json` or `application/x-www-form-urlencoded`

**Request Body (from machine):**

```json
{
    "machineCode": "039ec91c0000",
    "goodsID": 436,
    "goodsName": "Plus 18 CAN 0,45",
    "goodsCode": 0,
    "goodsProtocol": "111",
    "totalFee": "10000.00",
    "orderNo": "ud1719300304698383963",
    "date": "2024-06-25 10:25:05"
}
```

**Request Body (cart/basket mode - multiple items):**

```json
{
    "tasteId": -1,
    "orderNo": "cart72ac18117488487133341",
    "machineCode": "72ac181f0000",
    "goodsProtocol": -1,
    "totalFee": "40000.00",
    "tasteName": "...",
    "goodsID": -1,
    "packInfoList": [],
    "goodsCode": -1,
    "goodsName": "...",
    "cartInfoList": [
        {
            "tasteId": 0,
            "goodsProtocol": 77,
            "tasteName": "Americano with sugar",
            "goodsId": 381,
            "goodsPrice": "20000.00",
            "goodsTotalMoney": "20000.00",
            "goodsName": "Americano",
            "goodsNum": 1
        }
    ]
}
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `machineCode` | string | 12-char hex machine identifier (e.g., `039ec91c0000`) |
| `goodsID` | int | Product ID in the machine's internal system. `-1` for cart mode |
| `goodsName` | string | Product display name |
| `goodsCode` | int | Product code |
| `goodsProtocol` | string | Machine protocol code for the product. `-1` for cart mode |
| `totalFee` | string | Total price in UZS (sum), formatted as decimal string `"10000.00"` |
| `orderNo` | string | Machine-generated unique order number |
| `date` | string | Optional. Machine timestamp `Y-m-d H:i:s` |
| `tasteId` | int | Taste/variant ID. `0` or `-1` for none |
| `tasteName` | string | Taste/variant name |
| `cartInfoList` | array | Only present in cart mode; list of individual items |

**Business Logic:**

1. Validate `totalFee >= 1000` UZS (minimum price)
2. Check `isServiceRun` flag (can disable the whole service)
3. Look up product in `Goods` table by `goodsID`, joined with `Ikpu` for tax code
4. If product not found or IKPU missing: generate error QR with text message, send Telegram bot alert
5. Look up bonus configuration from `Bonus` table (joined with `VendingMashine` by `machineCode`)
6. Calculate savings amount based on bonus type (`percent` or `amount`)
7. Create order record in `Orders` table with:
   - `order` = `orderNo` from machine
   - `orderData` = full JSON of request inputs
   - `date` = current server time
   - `goodsAttribute` = JSON containing base64-encoded goods data with IKPU and savings
8. Generate QR code image containing Telegram bot deeplink: `https://t.me/DostavkaOk_bot?start={base64(salt#timestamp#orderID)}`
   - Alternative (disabled): direct payment URL `{SERVER_API_V1}/payment/?orderID={id}`
9. Save QR image to filesystem

**Response:**

```json
{
    "success": 0,
    "resultCode": "200",
    "resultMsg": "ok",
    "result": "ok",
    "extInfo": {
        "qrCode": "https://mediafiles.example.com/vending-qr-parameter/qr-ud1719300304698383963-1719300305.png"
    }
}
```

**Error Response (embedded in QR image, not in HTTP response):**
The QR image itself contains the error text (not a URL). The HTTP response always returns 200 with the QR image URL. Errors are encoded INTO the QR content as plaintext.

**goodsAttribute Format (stored in Orders table):**

```json
{
    "data": "<base64-encoded JSON>"
}
```

Decoded `data` contains:
```json
{
    "id": 5,
    "title": "Plus 18 CAN 0,45",
    "amount": "10000.00",
    "ikpu": "02202002001000000",
    "goodsID": 436,
    "savings": "{\"type\":\"percent\",\"value\":5,\"amount\":500}"
}
```

**Tables Involved:** `Goods`, `Ikpu`, `Bonus`, `VendingMashine`, `Orders`

---

### 2.2 Finish Deliver (Machine confirms delivery)

After the vending machine physically dispenses the product, it calls this endpoint to confirm delivery.

**Endpoint:** `GET /api/v1/finishDeliver/`
**PHP Class:** `finishDeliver`
**HTTP Method:** GET

**Request Parameters (query string):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderNo` | string | Order number (e.g., `operator20160227205621138Q`) |
| `orderGoodsNo` | string | Goods order number (e.g., `operator20170302135729344Q_XDTC02135729`) |
| `machineCode` | string | Machine code (e.g., `30A89A0A0000`) |
| `salesStatus` | string | Delivery status: `"2"` = success |
| `remark` | string | Error message if failed (e.g., `"Drop cup failed"`) |

**Response:**

```json
{
    "success": 0,
    "resultCode": 200,
    "resultMsg": "ok",
    "result": "ok",
    "extlnfo": null,
    "random": 456
}
```

**Business Logic:**
Currently a stub - always returns success. The response is hardcoded and the endpoint does not store the delivery status. The `random` field is `mt_rand(111,999)`.

**Tables Involved:** None (stub implementation)

---

### 2.3 Vending Cash Report (Machine reports cash/card payment completion)

When a customer pays directly at the machine (cash or card reader), the machine calls this endpoint. This is the most complex machine callback, handling payment recording AND fiscal receipt generation.

**Endpoint:** `POST /api/v1/vendingCash/`
**PHP Class:** `VendingCash`
**HTTP Methods:** GET, POST

**Request Body:**

```json
{
    "orderNo": "ff00000e3820241125201921039ec91c0000",
    "orderGoodsNo": "",
    "salesStatus": "2",
    "machineCode": "039ec91c0000",
    "remark": "",
    "goodsId": 436,
    "tasteId": 0,
    "orderType": "normal",
    "orderSource": "cash",
    "goodsName": "Plus 18 CAN 0,45",
    "tasteName": "...",
    "orderPrice": 10000
}
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `orderNo` | string | Machine-generated unique order identifier |
| `orderGoodsNo` | string | Machine goods order reference (often empty) |
| `salesStatus` | string | `"2"` = successful sale, `"10"` = other states |
| `machineCode` | string | 12-char hex machine identifier |
| `remark` | string | Error description if sale failed |
| `goodsId` | int | Product ID in machine's system |
| `tasteId` | int | Taste/variant ID |
| `orderType` | string | `"normal"` |
| `orderSource` | string | Payment source (see below) |
| `goodsName` | string | Product name |
| `tasteName` | string | Taste/variant name |
| `orderPrice` | int | Price in UZS (sum, integer, no decimals) |

**orderSource Values:**

| Value | Description | Recorded? | Fiscal? |
|-------|-------------|-----------|---------|
| `cash` | Cash payment at machine | Yes (if salesStatus=2) | Yes |
| `credit` | Card payment at machine | Yes (if salesStatus=2) | Yes |
| `vip` | VIP customer | Yes (if salesStatus=2) | No |
| `testShipment` | Test dispensing | Yes (if salesStatus=2) | No |
| `userDefined` | Telegram bot order (QR payment) | **No** (skipped, handled by payment operators) | N/A |
| `test` | Test mode | **No** (silently ignored) | N/A |

**Business Logic (runF - current active version):**

1. Parse request (GET or POST)
2. Filter by `orderSource`:
   - Skip `test`, `userDefined` orders
   - For `cash`, `credit`, `vip`, `testShipment`: require `salesStatus == 2` (successful sale)
3. **Deduplication gate**: Check `PaymentGateKeeper` table for existing `orderNo`. If found, reject as duplicate. Otherwise, insert into gatekeeper.
4. Look up goods data via `Goods` model (by `goodsId`)
5. Look up operator via `Operators` table (by `shortName` matching `orderSource`)
6. Look up vending machine via `VendingMashine` table (by `number` matching `machineCode`)
7. **Fiscal receipt generation** (for `cash` and `credit` only):
   - Resolve product IKPU code, barcode, VAT percent, package code, marking
   - Send to **MultiKassa** virtual fiscal module (`POST http://localhost:8080/api/v1/operations`)
   - If product marking exists, mark it as used (set `payment_id` in `GoodsMark`)
   - If fewer than 5 markings remain, alert via Telegram bot
8. Save payment record in `Payment` table with JSON `attributes` containing:
   ```json
   {
       "alerts": [...],
       "good": {"id": 5, "title": "..."},
       "fiscal": {"sendData": {...}, "receipt_gnk_qrcodeurl": "...", "receipt_gnk_receiptseq": "..."},
       "order": {<original request data>},
       "operator": {<from Operators table>},
       "vendingMashine": {<from VendingMashine table>},
       "payer": null
   }
   ```
9. Commit transaction
10. If any alerts accumulated, send summary to Telegram bot

**Response:** No explicit HTTP response body defined for the machine. The machine does not expect a response.

**Tables Involved:** `Payment`, `PaymentGateKeeper`, `Goods`, `Ikpu`, `GoodsBarCode`, `GoodsPackage`, `GoodsVatPercent`, `GoodsMark`, `Operators`, `VendingMashine`

---

### 2.4 Delivery Command (Server sends dispense command to machine)

The server initiates product dispensing by calling the machine's API after payment confirmation.

**Called BY the server (not an endpoint):**

```
POST http://www.gjvending.net:8003/api/qrscan
Content-Type: application/json

{
    "orderNo": "ud1719300304698383963",
    "paymentTime": "2024-06-25 10:25:05"
}
```

**Machine Response:**
```json
{
    "success": 0,
    ...
}
```

Where `success == 0` means the machine accepted the dispense command.

**Brewing Status Check (Server polls machine):**

```
POST http://www.gjvending.net:8004/api/brewingStatus
Content-Type: application/json

{
    "orderGoodsNo": "ud1719300304698383963"
}
```

---

## 3. Payment Flow

### 3.1 Complete Payment Lifecycle

```
FLOW A: QR/Online Payment (via Telegram Bot)
============================================

1. Customer selects product on vending machine screen
2. Machine --> Server: POST /api/v1/qrParameter/
   - Server creates Order (status=0), returns QR image URL
   - QR contains: https://t.me/DostavkaOk_bot?start={base64(salt#time#orderID)}
3. Machine displays QR code image to customer
4. Customer scans QR with phone camera
5. Customer opens Telegram bot, bot shows payment options (Click/Payme/Uzum)
6. Customer selects payment method
7. Payment operator processes payment:
   - Click: prepare -> complete callback
   - Payme: CheckPerformTransaction -> CreateTransaction -> PerformTransaction
   - Uzum: check -> create -> confirm
8. On successful payment:
   a. Server updates Order.status = 1 (paid)
   b. Server saves Payment record with operator data
   c. Server manages savings/bonus account (UserSavingAccount)
   d. Server --> Machine: POST http://www.gjvending.net:8003/api/qrscan
      (sends dispense command with orderNo + paymentTime)
   e. Server sends Telegram notification to user
9. Machine dispenses product
10. Machine --> Server: GET /api/v1/finishDeliver/ (delivery confirmation)


FLOW B: Direct Cash/Card Payment at Machine
============================================

1. Customer inserts cash or swipes card at machine
2. Machine dispenses product
3. Machine --> Server: POST /api/v1/vendingCash/
   - orderSource = "cash" or "credit"
   - salesStatus = "2" (success)
4. Server records payment in Payment table
5. Server sends fiscal receipt to MultiKassa (for cash/credit)
6. Server marks product marking as used (if applicable)
```

### 3.2 Order Status Lifecycle

| Status | Meaning | Set By |
|--------|---------|--------|
| `0` | New/Created (awaiting payment) | qrParameter endpoint |
| `1` | Paid (payment confirmed) | Payment operator callback |

### 3.3 Payment Operators (operators_id mapping)

| operators_id | Operator | shortName |
|-------------|----------|-----------|
| 1 | Click.uz | `clickUz` |
| 2 | Payme.uz | `paymeUZ` |
| 3 | Uzum Bank | `uzumUz` |
| 4 | Bonus Card | `bonusCard` |
| - | Cash (machine) | `cash` |
| - | Card (machine) | `credit` |
| - | VIP | `vip` |

### 3.4 Amount Conventions

| Context | Unit | Example |
|---------|------|---------|
| Machine `totalFee` / `orderPrice` | UZS (som) as string/int | `"10000.00"` or `10000` |
| Payme amounts | Tiyin (1 som = 100 tiyin) | `1000000` = 10,000 som |
| Click amounts | UZS (som) as float | `10000.00` |
| Uzum amounts | Tiyin | `1000000` = 10,000 som |
| MultiKassa `receipt_sum` | Tiyin | `1000000` = 10,000 som |
| Database `Goods.amount` | UZS (som) as decimal | `10000.00` |

---

## 4. Payment Operator Integrations

### 4.1 Click.uz

**Service Credentials:**

| Key | Value | Business |
|-----|-------|----------|
| SERVICE_ID | 68235 | Hub VENDING |
| MERCHANT_ID | 36486 | Hub VENDING |
| SECRET_KEY | `Z5qEEs3S3at6` | Hub VENDING |

(Legacy Globerent Finance: SERVICE_ID=34427, SECRET_KEY=`j6WV81VYv3Cf`)

#### 4.1.1 Prepare (Click verifies order exists)

**Endpoint:** `POST /api/v1/operators/clickUz/prepare/` (also at `/api/v1/payment/clickUz/prepare/`)
**PHP Class:** `ClickUz::requestPrepare()`

**Request:**
```json
{
    "click_trans_id": 123456789,
    "service_id": 68235,
    "click_paydoc_id": 111,
    "merchant_trans_id": 73,
    "amount": 10000.00,
    "action": 0,
    "sign_time": "2024-01-01 12:00:00",
    "sign_string": "<md5_hash>",
    "error": 0,
    "error_note": ""
}
```

**Signature Verification:**
```
sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
```
For prepare: `merchant_prepare_id` = `merchant_trans_id`

**Validation Steps:**
1. `service_id` must match configured value (68235)
2. `action` must be `0` for prepare
3. `error` must be >= 0
4. `merchant_trans_id` must be a valid order ID in `Orders` table
5. Order must have `status == 0` (unpaid)
6. `amount` must match `Orders.paymentInfo.amount` (som, float comparison)
7. `sign_string` must match computed MD5

**Response:**
```json
{
    "click_trans_id": 123456789,
    "merchant_trans_id": 73,
    "merchant_prepare_id": 73,
    "error": 0,
    "error_note": "ok"
}
```

#### 4.1.2 Complete (Click confirms payment)

**Endpoint:** `POST /api/v1/operators/clickUz/complete/` (also at `/api/v1/payment/clickUz/complete/`)
**PHP Class:** `ClickUz::requestComplete()`

**Request:**
```json
{
    "click_trans_id": 123456789,
    "service_id": 68235,
    "click_paydoc_id": 111,
    "merchant_trans_id": 73,
    "merchant_prepare_id": 73,
    "amount": 10000.00,
    "action": 1,
    "sign_time": "2024-01-01 12:00:05",
    "sign_string": "<md5_hash>",
    "error": 0,
    "error_note": ""
}
```

**Validation Steps:**
1. Same as prepare, but `action` must be `1`
2. `merchant_prepare_id` comes from the request body

**On Success:**
1. Calls `deliveryAndSavePayment(merchant_trans_id, 1, inputs)`
   - Sends dispense command to machine (`POST http://www.gjvending.net:8003/api/qrscan`)
   - If dispense fails, throws error 301
   - Manages savings account (`plus` type - adds bonus)
   - Saves payment record (operators_id=1)
   - Updates Order.status = 1
   - Sends Telegram notification

**Response (includes fiscal data for Click):**
```json
{
    "click_trans_id": 123456789,
    "merchant_trans_id": 73,
    "merchant_prepare_id": 73,
    "error": 0,
    "error_note": "ok",
    "received_ecash": 1000000,
    "received_cash": 0,
    "received_card": 0,
    "fiscal_items": [
        {
            "Name": "Plus 18 CAN 0,45",
            "SPIC": "02202002001000000",
            "PackageCode": "1378895",
            "Price": 1000000,
            "Amount": 1,
            "VAT": 120000,
            "VATPercent": 12,
            "CommissionInfo": {
                "TIN": "303736663"
            }
        }
    ]
}
```

---

### 4.2 Payme.uz (JSON-RPC 2.0)

**Credentials:**

| Key | Value |
|-----|-------|
| Merchant ID (VENDHUB) | `682af8225a11e938e9a1f877` |
| Production Key (VENDHUB) | `hkZAFPsSP5nKTb36fC3It?gKC@rDAFQaZUEK` |
| Test Key | `%cXnsa@4mfx2JN4X7O?VZzm4E7KEwkrpjqzU` |
| Login | `Paycom` |

(Legacy Globerent: Merchant ID `6666c787d13de2e3282ab541`, Prod Key `uMXPBXre0FqoJ&8pmOCuzROVu?VVSB1R7o1y`)

**Endpoint:** `POST /api/v1/payment/paymeUz/`
**Auth:** `Authorization: Basic {base64(Paycom:{key})}`
**Content-Type:** `application/json`
**PHP Class:** `Operators\paymeUz\Application`
**Protocol:** JSON-RPC 2.0

All requests share a common format:
```json
{
    "method": "MethodName",
    "params": { ... },
    "id": 1
}
```

All responses:
```json
{
    "id": 1,
    "result": { ... },
    "error": null
}
```
Or on error:
```json
{
    "id": 1,
    "result": null,
    "error": {
        "code": -31050,
        "message": "Error description",
        "data": "field_name"
    }
}
```

#### 4.2.1 CheckPerformTransaction

Payme asks: "Can this order be paid?"

**Request:**
```json
{
    "method": "CheckPerformTransaction",
    "params": {
        "amount": 1000000,
        "account": {
            "orderID": 100
        }
    },
    "id": 1
}
```

**Validation:**
1. `account.orderID` must exist in `Orders` table
2. Order `status` must be `0` (unpaid)
3. `amount` (tiyin) must match `OrderInfo.paymentInfo.amountTiins`

**Success Response:**
```json
{
    "id": 1,
    "result": {
        "allow": true,
        "detail": {
            "receipt_type": 0,
            "items": [
                {
                    "title": "Plus 18 CAN 0,45",
                    "price": 1000000,
                    "count": 1,
                    "code": "02202002001000000",
                    "vat_percent": 12,
                    "package_code": "1378895"
                }
            ]
        }
    }
}
```

#### 4.2.2 CreateTransaction

Payme creates a pending transaction.

**Request:**
```json
{
    "method": "CreateTransaction",
    "params": {
        "id": "65bfaa7b12c6b88a4c1c2c34",
        "time": 1620322277000,
        "amount": 1000000,
        "account": {
            "orderID": 100
        }
    },
    "id": 2
}
```

**Business Logic:**
1. Validate order (same as CheckPerformTransaction)
2. Search `PaymeTransactions` for existing transactions by `order_id` or `paycom_transaction_id`
3. If no existing transaction:
   - Validate transaction time (must be within TIMEOUT = 43,200,000ms = 12 hours)
   - Insert new record with `state = 1` (STATE_CREATED)
4. If existing transaction found:
   - If same `paycom_transaction_id` and `state == 1`: return existing (idempotent)
   - If different `paycom_transaction_id`: error 152 (order already has transaction)
   - If `state != 1`: error "not active"

**PaymeTransactions record:**
```
paycom_transaction_id: "65bfaa7b12c6b88a4c1c2c34"
paycom_time: 1620322277000
paycom_time_datetime: "2021-05-06 16:31:17"
create_time: "2024-06-25 10:25:05"
state: 1
amount: 1000000
order_id: 100
```

**Response:**
```json
{
    "id": 2,
    "result": {
        "create_time": 1719300305000,
        "state": 1,
        "transaction": "65bfaa7b12c6b88a4c1c2c34"
    }
}
```

#### 4.2.3 PerformTransaction

Payme confirms the payment is complete.

**Request:**
```json
{
    "method": "PerformTransaction",
    "params": {
        "id": "65bfaa7b12c6b88a4c1c2c34"
    },
    "id": 3
}
```

**Business Logic:**
1. Find transaction by `paycom_transaction_id`
2. If `state == 1` (CREATED):
   - Check expiration (12 hours from create_time)
   - If expired: cancel transaction (state = -1, reason = 4), return error
   - Set `state = 2` (COMPLETED), record `perform_time`
   - Call `deliveryAndSavePayment(order_id, 2, request_data)`:
     - Dispense command to machine
     - Save payment record (operators_id=2)
     - Manage bonus account
     - Update Order.status = 1
     - Telegram notification
3. If `state == 2` (already COMPLETED): return existing data (idempotent)

**Response:**
```json
{
    "id": 3,
    "result": {
        "transaction": "65bfaa7b12c6b88a4c1c2c34",
        "perform_time": 1719300310000,
        "state": 2
    }
}
```

#### 4.2.4 CancelTransaction

**Request:**
```json
{
    "method": "CancelTransaction",
    "params": {
        "id": "65bfaa7b12c6b88a4c1c2c34",
        "reason": 3
    },
    "id": 4
}
```

**Cancel Reasons:**
| Reason | Constant | Description |
|--------|----------|-------------|
| 1 | REASON_RECEIVERS_NOT_FOUND | Receivers not found |
| 2 | REASON_PROCESSING_EXECUTION_FAILED | Processing failed |
| 3 | REASON_EXECUTION_FAILED | Execution failed |
| 4 | REASON_CANCELLED_BY_TIMEOUT | Timeout |
| 5 | REASON_FUND_RETURNED | Fund returned |
| 10 | REASON_UNKNOWN | Unknown |

**State Transitions:**
- `STATE_CREATED (1)` -> `STATE_CANCELLED (-1)`
- `STATE_COMPLETED (2)` -> `STATE_CANCELLED_AFTER_COMPLETE (-2)`
- `STATE_CANCELLED (-1)` -> return existing (idempotent)
- `STATE_CANCELLED_AFTER_COMPLETE (-2)` -> return existing (idempotent)

#### 4.2.5 CheckTransaction

**Request:**
```json
{
    "method": "CheckTransaction",
    "params": {
        "id": "65bfaa7b12c6b88a4c1c2c34"
    },
    "id": 5
}
```

**Response (for completed):**
```json
{
    "id": 5,
    "result": {
        "create_time": 1719300305000,
        "transaction": "65bfaa7b12c6b88a4c1c2c34",
        "perform_time": 1719300310000,
        "state": 2,
        "receivers": 0,
        "reason": null,
        "cancel_time": 0
    }
}
```

#### 4.2.6 GetStatement

Returns list of transactions in a time period.

**Request:**
```json
{
    "method": "GetStatement",
    "params": {
        "from": 1620322277000,
        "to": 1620408677000
    },
    "id": 6
}
```

**Response:**
```json
{
    "id": 6,
    "result": {
        "transactions": [
            {
                "id": "65bfaa7b12c6b88a4c1c2c34",
                "time": 1620322277000,
                "amount": 1000000,
                "account": { "order_id": 100 },
                "create_time": 1719300305000,
                "perform_time": 1719300310000,
                "cancel_time": 0,
                "transaction": 1,
                "state": 2,
                "reason": null,
                "receivers": null
            }
        ]
    }
}
```

#### 4.2.7 ChangePassword

**Currently blocked** (`Admin blocked this method`). Not implemented.

---

### 4.3 Uzum Bank

**Credentials:**

| Key | Value |
|-----|-------|
| Auth Login | `uzumBilling` |
| Auth Password | `ZpaTNC8YY7ZjCd69arr5GwAAAJg` |

**Service IDs (per machine):**

| Machine Type | Service ID | Machine Codes |
|-------------|------------|---------------|
| Drinks (beverages) | `498617184` | `039ec91c0000` |
| Coffee machines | `498619491` | `3be8c71e0000`, `c7a6181f0000`, `17b7181f0000`, `1dce181f0000`, `24a8181f0000`, `2c67181f0000`, `3266181f0000`, `4f9c181f0000`, `5b7b181f0000`, `6620191f0000`, `72ac181f0000`, `8da1181f0000`, `9457181f0000`, `a5aa181f0000`, `a7ca181f0000` |

**PHP Class:** `Operators\uzumUz\Application`
**Auth:** HTTP Basic Auth on all endpoints

#### 4.3.1 Check

Uzum asks: "Is this account/order valid?"

**Endpoint:** `POST /api/v1/payment/uzumUz_old/check/`

**Request:**
```json
{
    "serviceId": 498617184,
    "action": "check",
    "params": {
        "account": 100
    }
}
```

**Validation:**
1. Authenticate via HTTP Basic Auth
2. Validate `serviceId` exists in configured services list
3. Look up order by `params.account` (= orderID)
4. Order must have `status == 0`

**Response:**
```json
{
    "serviceId": 498617184,
    "timestamp": 1719300305123,
    "status": "OK",
    "data": {
        "amount": {
            "value": 10000
        }
    }
}
```

Amount returned is `floor(paymentInfo.amount)` in som (not tiyin).

**Error Response:**
```json
{
    "serviceId": 498617184,
    "timestamp": 1719300305123,
    "status": "FAILED",
    "errorCode": 99999,
    "message": "Error description"
}
```

#### 4.3.2 Create

Uzum creates a pending transaction.

**Endpoint:** `POST /api/v1/payment/uzumUz_old/create/`

**Request:**
```json
{
    "serviceId": 498617184,
    "action": "create",
    "transId": "5c398d7e-76b6-11ee-96da-f3a095c6289d",
    "amount": 1000000,
    "params": {
        "account": 100
    }
}
```

**Validation:**
1. Auth + serviceId validation
2. `transId` must not already exist in `UzumTransactions`
3. `params.account` = valid order with `status == 0`
4. `amount` (tiyin) must match `OrderInfo.paymentInfo.amountTiins`

**Business Logic:**
1. Create `UzumTransactions` record: `orderID`, `status='created'`, `transId`

**Response:**
```json
{
    "serviceId": 498617184,
    "timestamp": 1719300305123,
    "status": "CREATED",
    "transId": "5c398d7e-76b6-11ee-96da-f3a095c6289d",
    "transTime": 1719300305123,
    "amount": 1000000
}
```

#### 4.3.3 Confirm

Uzum confirms the payment.

**Endpoint:** `POST /api/v1/payment/uzumUz_old/confirm/`

**Request:**
```json
{
    "serviceId": 498617184,
    "action": "confirm",
    "transId": "5c398d7e-76b6-11ee-96da-f3a095c6289d",
    "paymentSource": "CARD"
}
```

**Validation:**
1. Auth + serviceId validation
2. `transId` must exist in `UzumTransactions` with `status == 'created'`
3. Look up order from the transaction's `orderID`

**Business Logic:**
1. Update `UzumTransactions.status = 'paySuccess'`
2. Call `deliveryAndSavePayment(orderID, 3, inputs)`:
   - Dispense command to machine
   - Save Payment record (operators_id=3)
   - Manage bonus account
   - Update Order.status = 1
   - Telegram notification

**Response:**
```json
{
    "serviceId": 498617184,
    "timestamp": 1719300305123,
    "status": "CONFIRMED",
    "transId": "5c398d7e-76b6-11ee-96da-f3a095c6289d",
    "confirmTime": 1719300310123,
    "amount": 1000000
}
```

---

### 4.4 MultiKassa (Fiscal/Tax Integration)

Internal server-side integration. NOT an external-facing endpoint. Called by VendingCash when processing cash/credit sales.

**MultiKassa API Base:** `http://localhost:8080/api/v1/`
**PHP Class:** `Operators\multiKassa\Application`

#### 4.4.1 Create Fiscal Receipt

**Called internally by:** `VendingCash.runF()` for `cash` and `credit` orderSource

```
POST http://localhost:8080/api/v1/operations
Content-Type: application/json

{
    "module_operation_type": "3",
    "receipt_sum": 1000000,
    "receipt_cashier_name": "VendiHub Online",
    "receipt_gnk_receivedcash": 1000000,
    "receipt_gnk_receivedcard": 0,
    "receipt_gnk_time": "2024-06-25 10:25:05",
    "items": [
        {
            "classifier_class_code": "02202002001000000",
            "product_name": "Plus 18 CAN 0,45",
            "product_mark": false,
            "product_price": 10000.00,
            "total_product_price": 10000.00,
            "product_without_vat": true,
            "product_vat_percent": 0,
            "product_discount": 0,
            "count": 1,
            "other": 0,
            "product_barcode": "1234567890",
            "product_barcodes": [{"type": null, "barcode": "1234567890"}],
            "product_package": "1378895",
            "product_package_name": "dona",
            "product_label": "<marking_code>"
        }
    ],
    "location": {
        "Latitude": 41.272753915155704,
        "Longitude": 69.34977132678648
    }
}
```

**Key Fields:**
- `module_operation_type`: `"3"` = Sale
- `receipt_sum`: Total in tiyin (amount * 100)
- `receipt_gnk_receivedcash`: Cash amount in tiyin (for cash payments)
- `receipt_gnk_receivedcard`: Card amount in tiyin (for credit payments)
- `product_mark`: `true` if product has marking/labeling
- `product_label`: The actual marking code (from GoodsMark table)
- `location`: Machine GPS coordinates (from VendingMashine table, fallback to Tashkent default)

**Response:**
```json
{
    "success": true,
    "message": "...",
    "data": {
        "receipt_gnk_qrcodeurl": "https://ofd.soliq.uz/check?t=LG420230630322&r=3&c=20250527122056&s=513327148656",
        "receipt_gnk_receiptseq": "..."
    }
}
```

#### 4.4.2 Other MultiKassa Methods (Read-Only)

| Method | URL | Description |
|--------|-----|-------------|
| Info | `GET /api/v1/info` | Module info |
| Driver Versions | `GET /api/v1/fiscal/get_all_drivers_versions` | Fiscal driver versions |
| FM List | `GET /api/v1/fiscal/get_fm_list` | Fiscal module hardware list |
| Receipts | `GET /api/v1/receipts?start=0&limit=15` | Receipt history |
| Unsent Receipts | `GET /api/v1/receipts_notsended` | Failed/pending receipts |

---

## 5. Office/Admin API

### 5.1 Authentication

**Session-based via `X-Session` header.**

Login creates a session in `SessionOffice` table. The `checkAuthorised()` method in `BaseController` verifies the session and updates `last` timestamp on each request.

### 5.2 CRUD Pattern

All office entities follow the same Controller/Model/View MVC pattern:

**Actions determined by request parameters:**

| Parameter | Action | HTTP | Description |
|-----------|--------|------|-------------|
| (none) | `list` | GET | List all records |
| `edit={id}` | `edit` | GET | Get single record for editing |
| `add=1` + fields | `add` | POST | Show add form / create new |
| `save=1` + fields | `save` | POST | Save (insert or update) |
| `delete={id}` | `delete` | POST | Delete record |
| `push=1` + fields | `push` | POST | Special action (e.g., reports filter) |
| `entity={tableName}` | - | - | Override target table (for sub-entities) |

**Insert vs Update determination:**
- If `data.id` is present and non-empty: UPDATE
- If `data.id` is absent or empty: INSERT

### 5.3 Vending Machine CRUD

**Endpoint:** `GET/POST /office/vendingMashine/`
**Table:** `VendingMashine`

**Fields:**
| Field | Type | Validation |
|-------|------|------------|
| `title` | string | Required - machine name |
| `number` | string | Required - unique machine code (12-char hex) |
| `latitude` | decimal(10,8) | GPS latitude |
| `longitude` | decimal(11,8) | GPS longitude |
| `address` | text | Physical address |
| `goodsClassifier_id` | array | Array of classifier IDs (many-to-many via `VendingGoodsClassifier`) |

**Special Save Logic:**
- Manages `VendingGoodsClassifier` junction table: diffs loaded vs existing classifiers, adds new, removes old.

**Special Delete Logic:**
- Deletes from `VendingGoodsClassifier` first (by `vending_id`), then from `VendingMashine`.

### 5.4 Goods (Products) CRUD

**Endpoint:** `GET/POST /office/goods/`
**Table:** `Goods`

**Fields:**
| Field | Type | Validation |
|-------|------|------------|
| `title` | string | Required - product name |
| `goodsID` | number | Required - ID matching machine's internal product ID |
| `amount` | decimal | Required - price in UZS |
| `goodsClassifier_id` | number | FK to GoodsClassifier |
| `ikpu_id` | string | FK to Ikpu (tax classification code) |
| `goodsPackage_id` | string | FK to GoodsPackage |
| `vatPercent_id` | number | FK to GoodsVatPercent |
| `barCodes_id` | int | FK to GoodsBarCode |

**Element View (edit mode) enriches with:**
- `ikpu`: from Ikpu table
- `goodsClassifier`: from GoodsClassifier table
- `goodsPackage`: from GoodsPackage table
- `barCodes`: from GoodsBarCode table
- `vatPercents`: from GoodsVatPercent table
- `goodsMark`: from GoodsMark table (current/old markings, remaining count)

**Save Addon:** Processes `GoodsMarkNew` field - splits by newline, inserts each as new marking record in `GoodsMark`.

### 5.5 Reports

**Endpoint:** `GET/POST /office/reports/`
**Table:** `Payment`

**List (default):** Last 7 days of payments.

**Push (filtered):**
```
POST /office/reports/
push=1&calendarStart=2024-01-01&calendarEnd=2024-01-31
```

**Download Excel:**
```
POST /office/reports/
push=1&calendarStart=...&calendarEnd=...&download=1
```

**Report Record Structure (compiled from Payment.attributes JSON):**

```json
{
    "id": 6371,
    "paymentTime": "2025-05-29 21:39:43",
    "order": {
        "orderNo": "ff00000042202505300038373266181f0000",
        "goodsId": 395,
        "goodsName": "MacCoffee 3in1",
        "amount": 10000
    },
    "operator": {
        "title": "Cash",
        "shortName": "cash",
        "type": "cash"
    },
    "vendingMashine": {
        "title": "Machine Name",
        "number": "3266181f0000"
    },
    "payer": {
        "fio": "John Doe",
        "savings": {
            "amount": 500
        }
    }
}
```

---

## 6. Data Model

### 6.1 Core Tables

#### Orders
```sql
CREATE TABLE `Orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order` VARCHAR(100) UNIQUE NOT NULL,      -- machine's orderNo
    `orderData` JSON,                           -- full machine request JSON
    `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `status` TINYINT DEFAULT 0,                 -- 0=new, 1=paid
    `goodsAttribute` JSON,                      -- {data: base64(goods+ikpu+savings)}
    `user_id` INT                               -- FK to Users (set by Telegram bot)
);
```

#### Payment
```sql
CREATE TABLE `Payment` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT,                             -- FK to Orders (for QR payments)
    `orderNo` VARCHAR(100),                     -- machine's orderNo (for cash/card)
    `paymentTime` DATETIME NOT NULL,
    `attributes` JSON,                          -- {order, operator, vendingMashine, payer, fiscal, alerts}
    `fiscal_url` VARCHAR(500)                   -- GNK receipt URL
);
```

#### PaymentGateKeeper
```sql
CREATE TABLE `PaymentGateKeeper` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `orderNo` VARCHAR(100) UNIQUE NOT NULL,     -- dedup key
    `paymentTime` DATETIME NOT NULL
);
```

### 6.2 Product Tables

#### Goods
```sql
CREATE TABLE `Goods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `goodsID` INT UNIQUE NOT NULL,              -- machine's internal product ID
    `amount` DECIMAL(12, 2) NOT NULL,           -- price in UZS
    `goodsClassifier_id` INT,                   -- FK to GoodsClassifier
    `ikpu_id` INT,                              -- FK to Ikpu
    `goodsPackage_id` INT,                      -- FK to GoodsPackage
    `barCodes_id` INT,                          -- FK to GoodsBarCode
    `vatPercent_id` INT                         -- FK to GoodsVatPercent
);
```

#### GoodsClassifier
```sql
CREATE TABLE `GoodsClassifier` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `comment` TEXT
);
```

#### Ikpu (Uzbekistan tax classification codes)
```sql
CREATE TABLE `Ikpu` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `value` VARCHAR(50) NOT NULL UNIQUE,        -- e.g. "02202002001000000"
    `comment` TEXT
);
```

#### GoodsPackage
```sql
CREATE TABLE `GoodsPackage` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NOT NULL                 -- e.g. "1378895"
);
```

#### GoodsBarCode
```sql
CREATE TABLE `GoodsBarCode` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(100) NOT NULL,
    `comment` TEXT
);
```

#### GoodsVatPercent
```sql
CREATE TABLE `GoodsVatPercent` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `value` DECIMAL(5, 2) NOT NULL,             -- e.g. 12.00
    `comment` TEXT
);
```

#### GoodsMark (Product markings/labels for fiscal tracking)
```sql
CREATE TABLE `GoodsMark` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `goods_id` INT NOT NULL,                    -- FK to Goods
    `mark` VARCHAR(255) NOT NULL,               -- the marking code
    `payment_id` INT                            -- FK to Payment (NULL = available, set = used)
);
```

### 6.3 Machine Tables

#### VendingMashine
```sql
CREATE TABLE `VendingMashine` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `number` VARCHAR(50) UNIQUE NOT NULL,       -- 12-char hex machine code
    `latitude` DECIMAL(10, 8),
    `longitude` DECIMAL(11, 8),
    `address` TEXT,
    `status` TINYINT DEFAULT 1
);
```

#### VendingGoodsClassifier (junction table)
```sql
CREATE TABLE `VendingGoodsClassifier` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `vending_id` INT NOT NULL,                  -- FK to VendingMashine
    `goodsClassifier_id` INT NOT NULL           -- FK to GoodsClassifier
);
```

#### Bonus
```sql
CREATE TABLE `Bonus` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `vendingMashine_id` INT NOT NULL,           -- FK to VendingMashine
    `goods_id` INT NOT NULL,                    -- FK to Goods
    `bonusType` VARCHAR(20) NOT NULL,           -- 'percent', 'amount', 'notSpecified'
    `value` DECIMAL(10, 2) NOT NULL,
    UNIQUE KEY (`vendingMashine_id`, `goods_id`)
);
```

### 6.4 Payment Operator Tables

#### Operators
```sql
CREATE TABLE `Operators` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(100) NOT NULL,
    `shortName` VARCHAR(50) UNIQUE NOT NULL,    -- 'clickUz', 'paymeUZ', 'uzumUz', 'cash', 'credit', 'bonusCard'
    `status` TINYINT DEFAULT 1
);
```

#### PaymeTransactions
```sql
CREATE TABLE `PaymeTransactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `paycom_transaction_id` VARCHAR(100) UNIQUE NOT NULL,
    `paycom_time` BIGINT,                       -- Payme timestamp (ms)
    `paycom_time_datetime` DATETIME,
    `create_time` DATETIME,
    `perform_time` DATETIME,
    `cancel_time` DATETIME,
    `state` TINYINT NOT NULL,                   -- 1=created, 2=completed, -1=cancelled, -2=cancelled_after_complete
    `reason` TINYINT,                           -- cancellation reason (1-5, 10)
    `amount` BIGINT NOT NULL,                   -- tiyin
    `order_id` INT NOT NULL,                    -- FK to Orders
    `receivers` TEXT
);
```

#### UzumTransactions
```sql
CREATE TABLE `UzumTransactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `orderID` INT NOT NULL,                     -- FK to Orders
    `transId` VARCHAR(100) UNIQUE NOT NULL,     -- Uzum transaction UUID
    `status` VARCHAR(20) NOT NULL,              -- 'created', 'paySuccess', 'payWrong'
    `checkData` JSON
);
```

### 6.5 User Tables

#### Users (Telegram bot users)
```sql
CREATE TABLE `Users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tg_id` BIGINT UNIQUE NOT NULL,
    `tg_username` VARCHAR(255),
    `phone` VARCHAR(20),
    `firstName` VARCHAR(100),
    `lastName` VARCHAR(100),
    `created` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### UserOffice (Admin users)
```sql
CREATE TABLE `UserOffice` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `identifier` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255),
    `role` VARCHAR(50) DEFAULT 'admin'
);
```

#### SessionOffice
```sql
CREATE TABLE `SessionOffice` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session` VARCHAR(64) NOT NULL UNIQUE,
    `identifier_id` INT,                        -- FK to UserOffice
    `start` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `last` DATETIME
);
```

#### UserSavingAccount (Loyalty/bonus balance)
```sql
CREATE TABLE `UserSavingAccount` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,                     -- FK to Users
    `order_id` INT,                             -- FK to Orders
    `type` VARCHAR(10),                         -- 'wait', 'plus', 'minus'
    `amount` DECIMAL(12, 2) DEFAULT 0
);
```

### 6.6 Entity Relationships

```
VendingMashine 1--N VendingGoodsClassifier N--1 GoodsClassifier
VendingMashine 1--N Bonus N--1 Goods
Goods N--1 GoodsClassifier
Goods N--1 Ikpu
Goods N--1 GoodsPackage
Goods N--1 GoodsBarCode
Goods N--1 GoodsVatPercent
Goods 1--N GoodsMark
Orders N--1 Users
Orders 1--N Payment
Orders 1--N PaymeTransactions
Orders 1--N UzumTransactions
Payment 1--1 GoodsMark (via payment_id)
Users 1--N UserSavingAccount
Orders 1--N UserSavingAccount
```

---

## 7. Complete API Endpoint Registry

### 7.1 Machine Communication Endpoints

| # | Method | Path | PHP Class | Description |
|---|--------|------|-----------|-------------|
| 1 | GET/POST | `/api/v1/qrParameter/` | `qrParameter` / `qrParameter_new` | Machine requests QR code for payment |
| 2 | GET | `/api/v1/finishDeliver/` | `finishDeliver` | Machine confirms product delivered |
| 3 | GET/POST | `/api/v1/vendingCash/` | `VendingCash` | Machine reports cash/card sale |

### 7.2 Payment Operator Callbacks

| # | Method | Path | PHP Class | Description |
|---|--------|------|-----------|-------------|
| 4 | POST | `/api/v1/operators/clickUz/prepare/` | `ClickUz::requestPrepare` | Click prepare phase |
| 5 | POST | `/api/v1/operators/clickUz/complete/` | `ClickUz::requestComplete` | Click complete phase |
| 6 | POST | `/api/v1/payment/paymeUz/` | `paymeUz\Application::run` | Payme JSON-RPC (all methods) |
| 7 | POST | `/api/v1/payment/uzumUz_old/check/` | `uzumUz\Application::check` | Uzum check order |
| 8 | POST | `/api/v1/payment/uzumUz_old/create/` | `uzumUz\Application::create` | Uzum create transaction |
| 9 | POST | `/api/v1/payment/uzumUz_old/confirm/` | `uzumUz\Application::confirm` | Uzum confirm payment |

### 7.3 Legacy/Duplicate Endpoints

| # | Method | Path | Notes |
|---|--------|------|-------|
| 10 | POST | `/api/v1/click/complete/` | Duplicate of #4 (calls requestPrepare!) |
| 11 | POST | `/api/v1/payment/clickUz/prepare/` | Duplicate of #4 |
| 12 | POST | `/api/v1/payment/clickUz/complete/` | Duplicate of #5 |
| 13 | GET/POST | `/api/v1/payment/` | Old payment page (HTML) |

### 7.4 Office (Admin) Endpoints

| # | Method | Path | PHP Class | Description |
|---|--------|------|-----------|-------------|
| 14 | GET/POST | `/office/goods/` | `office\controller\Goods` | Products CRUD |
| 15 | GET/POST | `/office/vendingMashine/` | `office\controller\vendingMashine` | Machines CRUD |
| 16 | GET/POST | `/office/reports/` | `office\controller\Reports` | Payment reports |
| 17 | GET/POST | `/office/bonus/` | `office\controller\Bonus` | Bonus config CRUD |
| 18 | GET/POST | `/office/ikpu/` | `office\controller\Ikpu` | IKPU codes CRUD |
| 19 | GET/POST | `/office/translate/` | `office\controller\Translate` | Translations CRUD |
| 20 | GET/POST | `/office/botUsers/` | `office\controller\BotUsers` | Bot users view |
| 21 | GET/POST | `/office/dashboard/` | - | Dashboard |
| 22 | GET/POST | `/office/auth/` | `Auth` | Login/session |

### 7.5 Server-to-Machine API Calls (Outbound)

| # | Method | URL | Description |
|---|--------|-----|-------------|
| A | POST | `http://www.gjvending.net:8003/api/qrscan` | Send dispense command |
| B | POST | `http://www.gjvending.net:8004/api/brewingStatus` | Check brewing status |

### 7.6 Server-to-MultiKassa API Calls (Outbound, local)

| # | Method | URL | Description |
|---|--------|-----|-------------|
| C | POST | `http://localhost:8080/api/v1/operations` | Create fiscal receipt |
| D | GET | `http://localhost:8080/api/v1/receipts` | List receipts |
| E | GET | `http://localhost:8080/api/v1/info` | Module info |

---

## 8. Error Codes

### 8.1 System Error Codes (used in CompiledOut)

| Code | Message Pattern | Used By |
|------|----------------|---------|
| 0 | Success | All |
| 11 | Duplicate key error | CRUD Save |
| 12 | Foreign key constraint (cannot delete) | CRUD Delete |
| 101 | Authorization required | Office |
| 150 | Order `%s` not found | Payment, Payme, Click, Uzum |
| 151 | Order not available for processing | Payment |
| 152 | Order `%s` already paid / duplicate transaction | Payme |
| 153 | Transaction expired for order `%s` | Payme |
| 154 | Payment from different operator | Payment |
| 252 | Invalid data format | BaseModel |
| 253 | Invalid input data `%s` | All validation |
| 254 | Data not found `%s` | All queries |
| 255 | Access denied | Auth |
| 301 | Delivery error for order `%s` | Delivery |
| 302 | Product not ready for order `%s` | Delivery |
| 303 | Minimum amount `%s` | qrParameter |
| 902 | Service temporarily unavailable | qrParameter |
| 903 | Internal server error `%s` | BaseModel |

### 8.2 Payme Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| -32400 | ERROR_INTERNAL_SYSTEM | Internal system error |
| -32504 | ERROR_INSUFFICIENT_PRIVILEGE | Auth failed |
| -32600 | ERROR_INVALID_JSON_RPC_OBJECT | Invalid JSON-RPC |
| -32601 | ERROR_METHOD_NOT_FOUND | Unknown method |
| -31001 | ERROR_INVALID_AMOUNT | Invalid amount |
| -31003 | ERROR_TRANSACTION_NOT_FOUND | Transaction not found |
| -31007 | ERROR_COULD_NOT_CANCEL | Cannot cancel |
| -31008 | ERROR_COULD_NOT_PERFORM | Cannot perform |
| -31050 | ERROR_INVALID_ACCOUNT | Invalid account |

### 8.3 Internal Code to Payme Code Mapping

| Internal | Payme |
|----------|-------|
| 150 | -31099 |
| 151 | -31099 |
| 152 | -31051 |
| 253 | -31001 |
| 254 | -31052 |
| 301 | -31008 |
| 153 | -31008 |

### 8.4 Uzum Error Codes

| Code | Description |
|------|-------------|
| 10005 | Missing required parameters |
| 10007 | Payment attribute not found / amount mismatch |
| 10011 | Invalid amount |
| 99999 | Generic validation error |

---

## 9. Migration Notes for VendHub OS

### 9.1 Critical Architecture Decisions

1. **Multi-tenancy**: The PHP system is single-tenant (one business). VendHub OS must add `org_id` to every table and scope all queries. Machine codes must be unique per organization, not globally.

2. **Machine Communication URL**: Currently hardcoded to `www.gjvending.net:8003`. VendHub OS should make this configurable per machine or per organization. Consider whether to proxy through the server or have machines register their callback URLs.

3. **QR Code Generation**: Currently generates PNG images on the server filesystem. VendHub OS should either:
   - Generate QR codes client-side (in the mobile app or web frontend)
   - Use a QR code service/library that returns base64 or SVG
   - Return the raw URL/data to embed in QR, let the machine handle rendering

4. **Telegram Bot Deeplink**: QR codes currently contain `https://t.me/DostavkaOk_bot?start={encoded}`. VendHub OS should support configurable bot integration or a web-based payment page as the primary flow.

### 9.2 Endpoint Mapping (PHP to NestJS)

| PHP Endpoint | NestJS Module | NestJS Route |
|-------------|---------------|--------------|
| `/api/v1/qrParameter/` | `machine-protocol` | `POST /api/v1/machines/qr-parameter` |
| `/api/v1/finishDeliver/` | `machine-protocol` | `POST /api/v1/machines/finish-deliver` |
| `/api/v1/vendingCash/` | `machine-protocol` | `POST /api/v1/machines/vending-cash` |
| `/api/v1/operators/clickUz/prepare/` | `payment-click` | `POST /api/v1/payments/click/prepare` |
| `/api/v1/operators/clickUz/complete/` | `payment-click` | `POST /api/v1/payments/click/complete` |
| `/api/v1/payment/paymeUz/` | `payment-payme` | `POST /api/v1/payments/payme` |
| `/api/v1/payment/uzumUz_old/check/` | `payment-uzum` | `POST /api/v1/payments/uzum/check` |
| `/api/v1/payment/uzumUz_old/create/` | `payment-uzum` | `POST /api/v1/payments/uzum/create` |
| `/api/v1/payment/uzumUz_old/confirm/` | `payment-uzum` | `POST /api/v1/payments/uzum/confirm` |
| `/office/goods/` | `goods` | `REST /api/v1/admin/goods` |
| `/office/vendingMashine/` | `vending-machines` | `REST /api/v1/admin/machines` |
| `/office/reports/` | `reports` | `GET /api/v1/admin/reports` |

### 9.3 Database Migration Considerations

1. **INT AUTO_INCREMENT to UUID**: Consider using UUIDs for primary keys in VendHub OS for multi-tenancy and distributed systems.

2. **JSON columns**: `Orders.orderData`, `Orders.goodsAttribute`, `Payment.attributes` store rich JSON. In PostgreSQL, use `JSONB` type. Consider whether to normalize some of these structures:
   - `Payment.attributes` stores denormalized copies of operator, machine, payer data. In VendHub OS, use proper foreign keys and join at query time.
   - `Orders.goodsAttribute` stores base64-encoded JSON. Replace with proper JSONB column.

3. **New tables needed**:
   - `Organization` (multi-tenancy)
   - `MachineCallbackConfig` (per-machine API URLs)
   - `FiscalProvider` (abstract MultiKassa into a configurable provider)
   - `PaymentOperatorConfig` (per-org credentials for Click/Payme/Uzum)

4. **Rename tables**: `VendingMashine` -> `VendingMachine` (typo fix), use snake_case consistently.

### 9.4 Security Improvements Required

| Issue | Current State | VendHub OS Requirement |
|-------|--------------|----------------------|
| Machine auth | None (open endpoints) | API key or HMAC signature per machine |
| SQL injection | Raw string concatenation everywhere | Use TypeORM parameterized queries |
| Credentials in code | Hardcoded in PHP classes | Environment variables / secrets manager |
| CORS | Not configured | Proper CORS headers |
| Rate limiting | None | Rate limit all endpoints, especially machine callbacks |
| Input validation | Minimal, inconsistent | DTO validation with class-validator |
| HTTPS | Not enforced | Enforce TLS everywhere |
| Password storage | MySQL `PASSWORD()` function | bcrypt/argon2 |

### 9.5 Business Logic to Extract as Services

| Service | Responsibility |
|---------|---------------|
| `OrderService` | Create orders from machine requests, manage order lifecycle |
| `PaymentService` | Unified payment recording, status updates |
| `DeliveryService` | Send dispense commands to machines, handle callbacks |
| `FiscalService` | Abstract MultiKassa integration, support multiple providers |
| `BonusService` | Savings account management (wait/plus/minus lifecycle) |
| `QrCodeService` | Generate QR codes with payment URLs |
| `NotificationService` | Telegram bot alerts, user notifications |
| `GoodsValidationService` | Validate machine product data against DB, alert on mismatches |

### 9.6 Machine Protocol Backward Compatibility

The vending machines have firmware that cannot be easily updated. VendHub OS MUST maintain backward compatibility with the existing protocol:

1. **Request format**: Machines send the exact field names documented above (`machineCode`, `goodsID`, `totalFee`, etc.). Do not rename these in the API contract.

2. **Response format**: The QR parameter response MUST include `success`, `resultCode`, `resultMsg`, `result`, and `extInfo.qrCode` in exactly this structure. The machine firmware parses this specific JSON shape.

3. **finishDeliver response**: Must return `success`, `resultCode`, `resultMsg`, `result`, `extlnfo` (note: typo `extlnfo` with lowercase L, not `extInfo` - this is in the original protocol and the machine may depend on it).

4. **GJ Vending machine API**: The outbound calls to `www.gjvending.net:8003/api/qrscan` and port `8004/api/brewingStatus` are the machine manufacturer's API. These URLs/ports may change per deployment.

### 9.7 Known Bugs and Technical Debt

1. **Duplicate endpoints**: Click has 3 different URL paths for the same prepare/complete endpoints. Consolidate in VendHub OS.

2. **Uzum `run()` method bug**: The switch statement has duplicate `case 'create':` - the second one (which should be `'confirm'`) never executes. The `confirm()` method works correctly because it is called directly from a separate endpoint.

3. **finishDeliver is a stub**: Never actually records delivery status. Must implement proper delivery tracking.

4. **Race condition in VendingCash**: The PaymentGateKeeper dedup check is not atomic. Under concurrent requests, two identical orderNos could both pass the check. Use database-level unique constraint (which exists) and handle the duplicate error.

5. **Amount comparison inconsistencies**: Click uses float comparison (`(float)$this->Inputs['amount'] !== (float)$this->OrderInfo->paymentInfo->amount`), which can fail due to floating-point precision. Use integer tiyin comparison everywhere.

6. **No idempotency tokens**: VendingCash uses PaymentGateKeeper for dedup, but other endpoints lack idempotency protection.

7. **goodsAttribute encoding**: The triple-encoded structure (JSON -> base64 -> JSON wrapper) is unnecessarily complex. Simplify to plain JSONB in VendHub OS.
