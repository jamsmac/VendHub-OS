# VendHub Database Schema

## Core Entities

### organizations
- id, name, slug, type (HQ/FRANCHISE/BRANCH)
- parent_id (hierarchy)
- settings (jsonb)

### users
- id, email, phone, password_hash
- organization_id, role
- telegram_id, telegram_username

### employees
- id, user_id, organization_id
- first_name, last_name, position
- hire_date, status

## Machines

### machines
- id, organization_id, location_id
- machine_number, serial_number
- name, address
- latitude, longitude
- status (active/inactive/maintenance)
- last_sync_at

### locations
- id, organization_id
- name, address, city
- latitude, longitude
- type (warehouse/office/point)

## Products

### products
- id, organization_id
- sku, name, description
- category_id, unit
- cost_price, sell_price
- image_url

### product_categories
- id, organization_id
- name, parent_id
- sort_order

## Inventory

### inventory
- id, organization_id
- product_id, location_id, machine_id
- quantity, min_quantity
- last_counted_at

### inventory_movements
- id, organization_id
- product_id, from_location_id, to_location_id
- quantity, type (in/out/transfer)
- reference_type, reference_id

## Trips (VendtripBot)

### trips
- id, organization_id, employee_id, vehicle_id
- task_type (filling/collection/repair/maintenance/inspection/merchandising/other)
- status (active/completed/cancelled/auto_closed)
- started_at, ended_at
- start_odometer, end_odometer
- start_latitude, start_longitude
- end_latitude, end_longitude
- calculated_distance_meters
- total_points, total_stops, total_anomalies
- visited_machines_count
- live_location_active
- telegram_message_id

### trip_points
- id, trip_id
- latitude, longitude
- accuracy_meters, speed_mps, heading, altitude
- distance_from_prev_meters
- is_filtered, filter_reason
- recorded_at

### trip_stops
- id, trip_id
- latitude, longitude
- machine_id, machine_name, machine_address
- distance_to_machine_meters
- started_at, ended_at, duration_seconds
- is_verified, is_anomaly
- notes

### trip_anomalies
- id, trip_id
- type (long_stop/speed_violation/route_deviation/gps_jump/missed_location/unplanned_stop/mileage_discrepancy)
- severity (info/warning/critical)
- latitude, longitude
- details (jsonb)
- resolved, resolved_by_id, resolved_at

### trip_task_links
- id, trip_id, task_id
- status (pending/in_progress/completed/skipped)
- verified_by_gps, verified_at
- started_at, completed_at
- notes

### trip_reconciliations
- id, organization_id, vehicle_id
- actual_odometer, expected_odometer
- difference_km, threshold_km
- is_anomaly
- performed_by_id, performed_at
- notes

## Routes

### routes
- id, organization_id, operator_id
- name, type (refill/collection/maintenance/mixed)
- status (planned/in_progress/completed/cancelled)
- planned_date
- started_at, completed_at
- estimated_duration_minutes, actual_duration_minutes
- estimated_distance_km, actual_distance_km

### route_stops
- id, route_id, machine_id, task_id
- sequence
- status (pending/arrived/in_progress/completed/skipped)
- estimated_arrival, actual_arrival, departed_at
- latitude, longitude

## Vehicles

### vehicles
- id, organization_id
- plate_number, model, brand
- type (car/van/truck)
- current_odometer
- last_odometer_update

## Directories (MDM)

### directories
- id, organization_id
- name, slug, description
- type (manual/external/param/template)
- scope (hq/organization/location)
- is_hierarchical, is_system
- settings (jsonb)

### directory_fields
- id, directory_id
- name, display_name, field_type
- is_required, show_in_list
- sort_order, default_value
- validation_rules (jsonb)

### directory_entries
- id, directory_id, parent_id
- name, code, description
- origin (official/local)
- status (draft/pending_approval/active/deprecated/archived)
- data (jsonb)
- sort_order

## Common Fields (BaseEntity)
All entities inherit:
- id (uuid)
- created_at, updated_at, deleted_at
- created_by_id, updated_by_id
