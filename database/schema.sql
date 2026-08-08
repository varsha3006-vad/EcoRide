-- ====================================================================
-- DROP EXISTING TABLES AND TYPES TO ENSURE CLEAN RE-RUNS
-- ====================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS ride_requests CASCADE;
DROP TABLE IF EXISTS ride_participants CASCADE;
DROP TABLE IF EXISTS rides CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS office_locations CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

DROP TYPE IF EXISTS vehicle_fuel_type CASCADE;
DROP TYPE IF EXISTS ride_status CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS audit_action_type CASCADE;

-- 1. ENUMS & DOMAINS
CREATE TYPE vehicle_fuel_type AS ENUM ('Electric', 'Hybrid', 'ICE_Gasoline', 'ICE_Diesel');
CREATE TYPE ride_status AS ENUM ('Created', 'Published', 'Started', 'Completed', 'Cancelled');
CREATE TYPE request_status AS ENUM ('Pending', 'Accepted', 'Rejected');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'request');
CREATE TYPE audit_action_type AS ENUM ('Create', 'Update', 'Delete', 'Deactivate', 'ConfigureSettings', 'OverrideCredits');

-- 2. OFFICE LOCATIONS
CREATE TABLE office_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geofence_radius_meters INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DEPARTMENTS
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. EMPLOYEES
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL, -- Enterprise ID e.g. EMP-1092
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL, -- Restricted to verified SSO domains
    avatar_url VARCHAR(255),
    designation VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id),
    business_unit VARCHAR(100),
    office_id UUID REFERENCES office_locations(id),
    manager_name VARCHAR(150),
    phone_number VARCHAR(30),
    emergency_contact VARCHAR(255) NOT NULL,
    home_latitude DOUBLE PRECISION,
    home_longitude DOUBLE PRECISION,
    esg_score INTEGER DEFAULT 80 CHECK (esg_score BETWEEN 0 AND 100),
    carbon_saved_kg NUMERIC(10, 2) DEFAULT 0.00,
    credits_balance INTEGER DEFAULT 0 CHECK (credits_balance >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. VEHICLES
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    model VARCHAR(100) NOT NULL,
    fuel_type vehicle_fuel_type NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 8),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. RIDES (COMMUTE PATTERNS / TRIPS MAPPED)
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_latitude DOUBLE PRECISION NOT NULL,
    pickup_longitude DOUBLE PRECISION NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    destination_latitude DOUBLE PRECISION NOT NULL,
    destination_longitude DOUBLE PRECISION NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_arrival_time TIMESTAMP WITH TIME ZONE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    seats_total INTEGER NOT NULL CHECK (seats_total >= 1),
    seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_cron VARCHAR(50), -- Cron string for weekly carpools
    detour_radius_km NUMERIC(4, 2) DEFAULT 3.00,
    co2_saved_est NUMERIC(8, 2) NOT NULL, -- Calculated by ESG engine
    esg_credits_est INTEGER NOT NULL,
    gender_preference VARCHAR(20),
    dept_preference VARCHAR(100),
    music_preference VARCHAR(100),
    smoking_preference VARCHAR(100),
    luggage_allowed BOOLEAN DEFAULT TRUE,
    route_polyline TEXT, -- Google Maps encoded path
    status ride_status DEFAULT 'Published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. RIDE PARTICIPANTS (COMMUTERS CONFIRMED ON THE CARPOOL)
CREATE TABLE ride_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ride_id, passenger_id)
);

-- 8. RIDE REQUESTS (JOIN OFFERS SUBMITTED BY COLLEAGUES)
CREATE TABLE ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_latitude DOUBLE PRECISION NOT NULL,
    pickup_longitude DOUBLE PRECISION NOT NULL,
    status request_status DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. RATINGS (SUBMITTED POST COMMUTE FOR TRUST SCORE AND ESG CREDITS MULTIPLIER)
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
    rater_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    ratee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    safety_rating INTEGER CHECK (safety_rating BETWEEN 1 AND 5),
    punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
    comfort_rating INTEGER CHECK (comfort_rating BETWEEN 1 AND 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    overall_rating NUMERIC(2, 1) GENERATED ALWAYS AS (
        (safety_rating + punctuality_rating + comfort_rating + cleanliness_rating + communication_rating)::numeric / 5.0
    ) STORED,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. CHAT MESSAGES
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_location BOOLEAN DEFAULT FALSE,
    location_latitude DOUBLE PRECISION,
    location_longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action audit_action_type NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(50),
    previous_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- DATABASE INDEXES FOR HORIZONTAL PERFORMANCE & SCALING
-- ====================================================================
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_vehicles_employee ON vehicles(employee_id);
CREATE INDEX idx_rides_host ON rides(host_id);
CREATE INDEX idx_rides_departure ON rides(departure_time);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_ride_requests_ride ON ride_requests(ride_id);
CREATE INDEX idx_chat_messages_ride ON chat_messages(ride_id);
CREATE INDEX idx_notifications_employee_read ON notifications(employee_id, read);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);

-- ====================================================================
-- INITIAL SEED DATA FOR REAL USER PERSONAS
-- ====================================================================

-- 1. Insert Departments
INSERT INTO departments (id, name, code) VALUES
('ddddd111-d111-d111-d111-dddddddddddd', 'Engineering', 'ENG') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO departments (id, name, code) VALUES
('ddddd222-d222-d222-d222-dddddddddddd', 'Human Resources', 'HR') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO departments (id, name, code) VALUES
('ddddd333-d333-d333-d333-dddddddddddd', 'Operations', 'OPS') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO departments (id, name, code) VALUES
('ddddd444-d444-d444-d444-dddddddddddd', 'Product Design', 'DESIGN') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO departments (id, name, code) VALUES
('ddddd555-d555-d555-d555-dddddddddddd', 'Product Management', 'PM') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

-- 2. Insert Office Locations
INSERT INTO office_locations (id, name, address, latitude, longitude) VALUES
('aaaaa111-a111-a111-a111-aaaaaaaaaaaa', 'Building A Office', 'San Francisco Office HQ A, CA', 37.7749, -122.4194) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO office_locations (id, name, address, latitude, longitude) VALUES
('aaaaa222-a222-a222-a222-aaaaaaaaaaaa', 'Building B Office', 'San Francisco Office HQ B, CA', 37.7891, -122.4014) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO office_locations (id, name, address, latitude, longitude) VALUES
('aaaaa333-a333-a333-a333-aaaaaaaaaaaa', 'Building C Office', 'San Francisco Office HQ C, CA', 37.7599, -122.4350) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

-- 3. Insert Employees (Rahul, Shail, Leo, Naveen, Varsha)
INSERT INTO employees (id, employee_id, full_name, email, avatar_url, designation, department_id, office_id, emergency_contact, esg_score, carbon_saved_kg, credits_balance) VALUES
('eeeee111-e111-e111-e111-eeeeeeeeeeee', 'EMP-RAHUL', 'Rahul', 'rahul@company.com', '👨‍💻', 'Principal Architect', 'ddddd111-d111-d111-d111-dddddddddddd', 'aaaaa222-a222-a222-a222-aaaaaaaaaaaa', 'Emergency Contact 1', 85, 120.40, 640) ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employees (id, employee_id, full_name, email, avatar_url, designation, department_id, office_id, emergency_contact, esg_score, carbon_saved_kg, credits_balance) VALUES
('eeeee222-e222-e222-e222-eeeeeeeeeeee', 'EMP-SHAIL', 'Shail', 'shail@company.com', '👨‍🎨', 'Lead Designer', 'ddddd444-d444-d444-d444-dddddddddddd', 'aaaaa333-a333-a333-a333-aaaaaaaaaaaa', 'Emergency Contact 2', 80, 75.20, 410) ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employees (id, employee_id, full_name, email, avatar_url, designation, department_id, office_id, emergency_contact, esg_score, carbon_saved_kg, credits_balance) VALUES
('eeeee333-e333-e333-e333-eeeeeeeeeeee', 'EMP-LEO', 'Leo', 'leo@company.com', '👨‍💼', 'Ops Coordinator', 'ddddd333-d333-d333-d333-dddddddddddd', 'aaaaa222-a222-a222-a222-aaaaaaaaaaaa', 'Emergency Contact 3', 78, 45.10, 320) ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employees (id, employee_id, full_name, email, avatar_url, designation, department_id, office_id, emergency_contact, esg_score, carbon_saved_kg, credits_balance) VALUES
('eeeee444-e444-e444-e444-eeeeeeeeeeee', 'EMP-NAVEEN', 'Naveen', 'naveen@company.com', '👨‍💻', 'Senior PM', 'ddddd555-d555-d555-d555-dddddddddddd', 'aaaaa111-a111-a111-a111-aaaaaaaaaaaa', 'Emergency Contact 4', 88, 160.80, 780) ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employees (id, employee_id, full_name, email, avatar_url, designation, department_id, office_id, emergency_contact, esg_score, carbon_saved_kg, credits_balance) VALUES
('eeeee555-e555-e555-e555-eeeeeeeeeeee', 'EMP-VARSHA', 'Varsha', 'varsha@company.com', '👩‍💼', 'HR Director', 'ddddd222-d222-d222-d222-dddddddddddd', 'aaaaa111-a111-a111-a111-aaaaaaaaaaaa', 'Emergency Contact 5', 92, 95.50, 510) ON CONFLICT (employee_id) DO NOTHING;

-- 4. Insert Vehicles for driver employees
INSERT INTO vehicles (employee_id, model, fuel_type, capacity, plate_number) VALUES
('eeeee111-e111-e111-e111-eeeeeeeeeeee', 'Tesla Model S', 'Electric', 4, 'CA-770EV') ON CONFLICT (plate_number) DO NOTHING;
INSERT INTO vehicles (employee_id, model, fuel_type, capacity, plate_number) VALUES
('eeeee222-e222-e222-e222-eeeeeeeeeeee', 'Toyota Prius', 'Hybrid', 4, 'CA-102HY') ON CONFLICT (plate_number) DO NOTHING;
INSERT INTO vehicles (employee_id, model, fuel_type, capacity, plate_number) VALUES
('eeeee333-e333-e333-e333-eeeeeeeeeeee', 'Honda Accord', 'Hybrid', 5, 'CA-338OP') ON CONFLICT (plate_number) DO NOTHING;
INSERT INTO vehicles (employee_id, model, fuel_type, capacity, plate_number) VALUES
('eeeee444-e444-e444-e444-eeeeeeeeeeee', 'Rivian R1T', 'Electric', 5, 'CA-990EV') ON CONFLICT (plate_number) DO NOTHING;
INSERT INTO vehicles (employee_id, model, fuel_type, capacity, plate_number) VALUES
('eeeee555-e555-e555-e555-eeeeeeeeeeee', 'Tesla Model Y', 'Electric', 4, 'CA-889XG') ON CONFLICT (plate_number) DO NOTHING;
