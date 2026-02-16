-- OptiqoFlow Demo Data Population (v14)

BEGIN;

-- 1. Devices (IoT Tenant: Visera - c5b0b1bc-d54a-46f5-b79f-538a7328d9f4)
WITH new_devices AS (
    INSERT INTO optiqoflow.devices (id, imei, device_type, description, status, battery_percent, last_seen_at, registered_at, created_at, updated_at) VALUES
    (gen_random_uuid(), '354388090123451', 'sensor', 'Lobby Entrance Sensor', 'online', 15, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123452', 'sensor', 'Cafeteria Exit Sensor', 'online', 12, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123453', 'feedback_panel', 'Restroom 1F Feedback', 'online', 95, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123454', 'smart_dispenser', 'Hand Sanitizer L2', 'offline', 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123455', 'sensor', 'Conference Room A Occupancy', 'online', 88, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123456', 'gateway', 'Main Gateway L1', 'online', 99, NOW(), NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123457', 'sensor', 'Warehouse Motion', 'online', 18, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123458', 'feedback_panel', 'Reception Feedback', 'online', 45, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123459', 'smart_dispenser', 'Restroom 2F Soap', 'offline', 8, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '1 year', NOW(), NOW()),
    (gen_random_uuid(), '354388090123460', 'sensor', 'Server Room Temp', 'online', 100, NOW(), NOW() - INTERVAL '1 year', NOW(), NOW())
    RETURNING id
)
INSERT INTO optiqoflow.device_tenants (device_id, tenant_id, is_current_owner, assigned_at, created_at)
SELECT id, 'c5b0b1bc-d54a-46f5-b79f-538a7328d9f4', true, NOW(), NOW()
FROM new_devices;


-- 2. Customers & Sites

-- Beta Facilities (Healthcare)
INSERT INTO optiqoflow.customers (id, tenant_id, name, created_at, updated_at) VALUES 
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Beta Healthcare Group', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO optiqoflow.sites (id, tenant_id, customer_id, name, site_type, status, address, created_at, updated_at) VALUES
('b1000001-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'General Hospital', 'healthcare', 'active', '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Acme Cleaning (Commercial)
INSERT INTO optiqoflow.customers (id, tenant_id, name, created_at, updated_at) VALUES 
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Acme Corporate', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO optiqoflow.sites (id, tenant_id, customer_id, name, site_type, status, address, created_at, updated_at) VALUES
('a1000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Acme HQ', 'commercial', 'active', '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Puhastus (Quality)
INSERT INTO optiqoflow.customers (id, tenant_id, name, created_at, updated_at) VALUES 
('f3333333-3333-3333-3333-333333333333', 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'Puhastus Client A', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO optiqoflow.sites (id, tenant_id, customer_id, name, site_type, status, address, created_at, updated_at) VALUES
('f1000001-0001-0001-0001-000000000001', 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f3333333-3333-3333-3333-333333333333', 'Tallinn Office', 'commercial', 'active', '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- 3. Rooms (Healthcare)
INSERT INTO optiqoflow.rooms (id, tenant_id, site_id, name, patient_status, zone_category_id, created_at, updated_at) VALUES
('b2010000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 101', 'occupied', 'c0000001-0000-0000-0000-000000000001', NOW(), NOW()),
('b2020000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 102', 'discharged', 'c0000001-0000-0000-0000-000000000001', NOW(), NOW()),
('b2030000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 103', 'sterile', 'c0000002-0000-0000-0000-000000000002', NOW(), NOW()),
('b2040000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 104', 'occupied', 'c0000001-0000-0000-0000-000000000001', NOW(), NOW()),
('b2050000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 105', 'discharged', 'c0000001-0000-0000-0000-000000000001', NOW(), NOW()),
('b2060000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 106', 'occupied', 'c0000001-0000-0000-0000-000000000001', NOW(), NOW()),
('b2070000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 107', 'isolation', 'c0000003-0000-0000-0000-000000000003', NOW(), NOW()),
('b2080000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'Room 108', 'discharged', 'c0000001-0000-0000-0000-000000000001', NOW(), NOW()),
('b2090000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'OR 1', 'sterile', 'c0000002-0000-0000-0000-000000000002', NOW(), NOW()),
('b2100000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'ER Bay 4', 'occupied', 'c0000004-0000-0000-0000-000000000004', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET patient_status = EXCLUDED.patient_status;


-- 4. Work Orders 

-- Beta (Healthcare)
INSERT INTO optiqoflow.work_orders (id, tenant_id, site_id, room_id, title, priority, status, created_at, updated_at) VALUES
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'b2020000-0000-0000-0000-000000000000', 'Post-Op Clean', 'high', 'pending', NOW(), NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'b2050000-0000-0000-0000-000000000000', 'Daily Clean', 'medium', 'completed', NOW() - INTERVAL '1 hour', NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'b2050000-0000-0000-0000-000000000000', 'Spill clean', 'urgent', 'in_progress', NOW(), NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'b2080000-0000-0000-0000-000000000000', 'Discharge Service', 'high', 'pending', NOW(), NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'b1000001-0001-0001-0001-000000000001', 'b2080000-0000-0000-0000-000000000000', 'Spot Check', 'low', 'completed', NOW() - INTERVAL '2 hours', NOW());


-- Generic Bulk Work Orders (Acme & Visera)
DO $$
DECLARE
    t_id_acme uuid := '11111111-1111-1111-1111-111111111111';
    site_id_acme uuid := 'a1000001-0001-0001-0001-000000000001';
    t_id_visera uuid := 'c5b0b1bc-d54a-46f5-b79f-538a7328d9f4';
    p text[] := ARRAY['low', 'medium', 'high', 'urgent'];
    s text[] := ARRAY['pending', 'in_progress', 'completed', 'cancelled'];
    titles text[] := ARRAY['Routine Inspection', 'Maintenance Request', 'Cleaning Service', 'Supply Refill', 'Safety Check'];
    days_offset int;
    i int;
BEGIN
    FOR i IN 1..20 LOOP
        days_offset := floor(random() * 30)::int;
        INSERT INTO optiqoflow.work_orders (id, tenant_id, site_id, title, priority, status, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            t_id_acme,
            site_id_acme,
            titles[1 + floor(random() * 5)::int],
            p[1 + floor(random() * 4)::int],
            s[1 + floor(random() * 4)::int],
            NOW() - (days_offset || ' days')::interval,
            NOW()
        );
    END LOOP;

    FOR i IN 1..15 LOOP
        days_offset := floor(random() * 30)::int;
        INSERT INTO optiqoflow.work_orders (id, tenant_id, title, priority, status, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            t_id_visera,
            titles[1 + floor(random() * 5)::int],
            p[1 + floor(random() * 4)::int],
            s[1 + floor(random() * 4)::int],
            NOW() - (days_offset || ' days')::interval,
            NOW()
        );
    END LOOP;
END $$;

-- 5. Quality Inspections (Puhastusekpert OÜ)
-- Added missing columns: inspection_type, quality_method, party_size, sample_size, acceptance_number, rejection_number, passed_units, failed_units
INSERT INTO optiqoflow.quality_inspections (
    id, tenant_id, site_id, inspection_date, overall_result, aql_level, 
    inspection_type, quality_method, party_size, sample_size, acceptance_number, rejection_number, passed_units, failed_units,
    created_at, updated_at
) VALUES
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW(), 'passed', '1.0', 'INSTA 800', 'random_sampling', 100, 10, 1, 2, 10, 0, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW(), 'passed', '1.0', 'INSTA 800', 'random_sampling', 200, 20, 2, 3, 19, 1, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW(), 'failed', '1.0', 'Visual Check', 'continuous', 50, 5, 0, 1, 3, 2, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '1 day', 'passed', '1.5', 'ISO 2859', 'random_sampling', 150, 15, 1, 2, 15, 0, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '1 day', 'passed', '1.5', 'INSTA 800', 'random_sampling', 100, 10, 1, 2, 10, 0, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '2 days', 'passed', '2.5', 'Sanitation Audit', '100%_inspection', 20, 20, 0, 1, 20, 0, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '2 days', 'passed', '2.5', 'INSTA 800', 'random_sampling', 300, 30, 2, 3, 29, 1, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '2 days', 'passed', '2.5', 'Visual Check', 'random_sampling', 50, 5, 0, 1, 5, 0, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '3 days', 'failed', '2.5', 'INSTA 800', 'random_sampling', 120, 12, 1, 2, 10, 2, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '3 days', 'passed', '4.0', 'Surface Test', 'swab_analysis', 10, 10, 0, 1, 10, 0, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '4 days', 'passed', '4.0', 'INSTA 800', 'random_sampling', 200, 20, 2, 3, 20, 0, NOW(), NOW()),
(gen_random_uuid(), 'bf8bed36-b204-4d11-8f7e-12b5125d07d0', 'f1000001-0001-0001-0001-000000000001', NOW() - INTERVAL '5 days', 'passed', '6.5', 'ATP Swab', 'device_reading', 15, 15, 0, 1, 15, 0, NOW(), NOW());

COMMIT;
