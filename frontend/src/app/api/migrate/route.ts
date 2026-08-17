import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    return NextResponse.json({ error: "POSTGRES_URL environment variable is not configured" }, { status: 500 });
  }

  const client = new Client({
    connectionString: postgresUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const ddl = `
      -- Drop existing tables to ensure clean rebuild with new employee schema
      DROP TABLE IF EXISTS ecoride_audit_logs CASCADE;
      DROP TABLE IF EXISTS ecoride_messages CASCADE;
      DROP TABLE IF EXISTS ecoride_requests CASCADE;
      DROP TABLE IF EXISTS ecoride_rides CASCADE;
      DROP TABLE IF EXISTS ecoride_employees CASCADE;

      -- 1. Employees Table
      CREATE TABLE ecoride_employees (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "avatar" TEXT,
        "department" TEXT,
        "designation" TEXT,
        "office" TEXT,
        "phone" TEXT,
        "vehicle" JSONB DEFAULT NULL,
        "esgScore" NUMERIC DEFAULT 0,
        "carbonSaved" NUMERIC DEFAULT 0,
        "credits" INTEGER DEFAULT 0,
        "rank" INTEGER DEFAULT 0,
        "badgeIds" TEXT[] DEFAULT '{}',
        "gender" TEXT,
        "notificationPrefs" JSONB DEFAULT '{}'::jsonb,
        "isHost" BOOLEAN DEFAULT false,
        "registeredAt" TEXT
      );

      -- 2. Rides Table
      CREATE TABLE ecoride_rides (
        "id" TEXT PRIMARY KEY,
        "hostId" TEXT NOT NULL REFERENCES ecoride_employees("id") ON DELETE CASCADE,
        "hostName" TEXT NOT NULL,
        "hostAvatar" TEXT,
        "hostDept" TEXT,
        "hostRating" NUMERIC DEFAULT 5.0,
        "pickup" TEXT NOT NULL,
        "destination" TEXT NOT NULL,
        "departureTime" TEXT NOT NULL,
        "rideDate" TEXT,
        "vehicleModel" TEXT,
        "vehiclePlate" TEXT,
        "vehicleType" TEXT,
        "seatsAvailable" INTEGER NOT NULL CHECK ("seatsAvailable" >= 0),
        "seatsTotal" INTEGER NOT NULL CHECK ("seatsTotal" >= 1),
        "recurring" BOOLEAN DEFAULT false,
        "detourRadius" NUMERIC DEFAULT 3.0,
        "co2Saved" NUMERIC DEFAULT 0,
        "esgCredits" INTEGER DEFAULT 0,
        "genderPref" TEXT,
        "deptPref" TEXT,
        "musicPref" TEXT,
        "smokingPref" TEXT,
        "luggageAllowed" BOOLEAN DEFAULT true,
        "status" TEXT NOT NULL,
        "passengers" TEXT[] DEFAULT '{}',
        "womenOnly" BOOLEAN DEFAULT false,
        "driverLat" NUMERIC,
        "driverLng" NUMERIC,
        "passengerLocations" JSONB DEFAULT '{}'::jsonb,
        "boardedPassengers" TEXT[] DEFAULT '{}',
        "city" TEXT
      );

      -- 3. Ride Requests Table
      CREATE TABLE ecoride_requests (
        "id" TEXT PRIMARY KEY,
        "rideId" TEXT NOT NULL REFERENCES ecoride_rides("id") ON DELETE CASCADE,
        "requesterId" TEXT NOT NULL REFERENCES ecoride_employees("id") ON DELETE CASCADE,
        "requesterName" TEXT NOT NULL,
        "requesterAvatar" TEXT,
        "requesterDept" TEXT,
        "requesterRating" NUMERIC DEFAULT 5.0,
        "pickup" TEXT NOT NULL,
        "pickupLat" NUMERIC,
        "pickupLng" NUMERIC,
        "dropPoint" TEXT NOT NULL,
        "dropLat" NUMERIC,
        "dropLng" NUMERIC,
        "status" TEXT NOT NULL,
        "timestamp" TEXT NOT NULL,
        "boardingPin" TEXT,
        "deviationKm" NUMERIC
      );

      -- 4. Messages Table
      CREATE TABLE ecoride_messages (
        "id" TEXT PRIMARY KEY,
        "rideId" TEXT NOT NULL REFERENCES ecoride_rides("id") ON DELETE CASCADE,
        "senderId" TEXT NOT NULL REFERENCES ecoride_employees("id") ON DELETE CASCADE,
        "senderName" TEXT NOT NULL,
        "senderAvatar" TEXT,
        "text" TEXT NOT NULL,
        "timestamp" TEXT NOT NULL
      );

      -- 5. Audit Logs Table
      CREATE TABLE ecoride_audit_logs (
        "id" TEXT PRIMARY KEY,
        "eventType" TEXT NOT NULL,
        "severity" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "timestamp" TEXT NOT NULL
      );

      -- Indices for performance optimizations
      CREATE INDEX IF NOT EXISTS idx_ecoride_employees_email ON ecoride_employees("email");
      CREATE INDEX IF NOT EXISTS idx_ecoride_rides_host ON ecoride_rides("hostId");
      CREATE INDEX IF NOT EXISTS idx_ecoride_rides_status ON ecoride_rides("status");
      CREATE INDEX IF NOT EXISTS idx_ecoride_requests_ride ON ecoride_requests("rideId");
      CREATE INDEX IF NOT EXISTS idx_ecoride_requests_requester ON ecoride_requests("requesterId");
      CREATE INDEX IF NOT EXISTS idx_ecoride_messages_ride ON ecoride_messages("rideId");

      -- Seed data
      INSERT INTO ecoride_employees (
        "id", "name", "email", "avatar", "department", "designation", "office", "phone", "vehicle", 
        "esgScore", "carbonSaved", "credits", "rank", "badgeIds", "gender", "isHost", "registeredAt"
      ) VALUES
      (
        'eeeee999-e999-e999-e999-eeeeeeeeeeee', 'System Admin', 'admin@company.com', '🛡️', 'Security & Compliance', 'System Administrator', 'Building A', '+919000000000', 
        NULL, 
        100, 0.0, 1000, 1, '{}', 'Male', false, '2026-08-08T10:00:00Z'
      ),
      (
        'eeeee111-e111-e111-e111-eeeeeeeeeeee', 'Rahul', 'rahul@company.com', '👨‍💻', 'Engineering', 'Principal Architect', 'Building B', '+919687605862', 
        '{"model": "Tesla Model S", "type": "Electric", "capacity": 4, "plateNumber": "CA-770EV"}'::jsonb, 
        85, 120.40, 640, 1, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'eeeee222-e222-e222-e222-eeeeeeeeeeee', 'Shail', 'shail@company.com', '👨‍🎨', 'Product Design', 'Lead Designer', 'Building C', '+919731848848', 
        '{"model": "Toyota Prius", "type": "Hybrid", "capacity": 4, "plateNumber": "CA-102HY"}'::jsonb, 
        80, 75.20, 410, 2, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'eeeee333-e333-e333-e333-eeeeeeeeeeee', 'Leo', 'leo@company.com', '👨‍💼', 'Operations', 'Ops Coordinator', 'Building B', '+919036005050', 
        '{"model": "Honda Accord", "type": "Hybrid", "capacity": 5, "plateNumber": "CA-338OP"}'::jsonb, 
        78, 45.10, 320, 3, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'eeeee444-e444-e444-e444-eeeeeeeeeeee', 'Naveen', 'naveen@company.com', '👨‍💻', 'Product Management', 'Senior PM', 'Building A', '555-0400', 
        '{"model": "Rivian R1T", "type": "Electric", "capacity": 5, "plateNumber": "CA-990EV"}'::jsonb, 
        88, 160.80, 780, 4, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'eeeee555-e555-e555-e555-eeeeeeeeeeee', 'Varsha', 'varsha@company.com', '👩‍💼', 'Human Resources', 'HR Director', 'Building A', '+919687605863', 
        '{"model": "Tesla Model Y", "type": "Electric", "capacity": 4, "plateNumber": "CA-889XG"}'::jsonb, 
        92, 95.50, 510, 5, '{}', 'Female', true, '2026-08-08T10:00:00Z'
      ),
      (
        'e-alex', 'Alex', 'alex@company.com', '👨‍💻', 'Engineering', 'Principal Architect', 'Building B', '555-0600', 
        '{"model": "Tesla Model S", "type": "Electric", "capacity": 4, "plateNumber": "CA-770EV"}'::jsonb, 
        85, 120.40, 640, 6, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'e-chris', 'Chris', 'chris@company.com', '👨‍🎨', 'Product Design', 'Lead Designer', 'Building C', '555-0700', 
        '{"model": "Toyota Prius", "type": "Hybrid", "capacity": 4, "plateNumber": "CA-102HY"}'::jsonb, 
        80, 75.20, 410, 7, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'e-bob', 'Bob', 'bob@company.com', '👨‍💼', 'Operations', 'Ops Coordinator', 'Building B', '555-0800', 
        '{"model": "Honda Accord", "type": "Hybrid", "capacity": 5, "plateNumber": "CA-338OP"}'::jsonb, 
        78, 45.10, 320, 8, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'e-dan', 'Dan', 'dan@company.com', '👨‍💻', 'Product Management', 'Senior PM', 'Building A', '555-0900', 
        '{"model": "Rivian R1T", "type": "Electric", "capacity": 5, "plateNumber": "CA-990EV"}'::jsonb, 
        88, 160.80, 780, 9, '{}', 'Male', true, '2026-08-08T10:00:00Z'
      ),
      (
        'e-elle', 'Elle', 'elle@company.com', '👩‍💼', 'Human Resources', 'HR Director', 'Building A', '555-1000', 
        '{"model": "Tesla Model Y", "type": "Electric", "capacity": 4, "plateNumber": "CA-889XG"}'::jsonb, 
        92, 95.50, 510, 10, '{}', 'Female', true, '2026-08-08T10:00:00Z'
      )
      ON CONFLICT (id) DO NOTHING;

      -- Enable Row Level Security (RLS)
      ALTER TABLE ecoride_employees ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ecoride_rides ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ecoride_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ecoride_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ecoride_audit_logs ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies if not exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read employees') THEN
          CREATE POLICY "Allow public read employees" ON ecoride_employees FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public insert employees') THEN
          CREATE POLICY "Allow public insert employees" ON ecoride_employees FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public update employees') THEN
          CREATE POLICY "Allow public update employees" ON ecoride_employees FOR UPDATE USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read rides') THEN
          CREATE POLICY "Allow public read rides" ON ecoride_rides FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public insert rides') THEN
          CREATE POLICY "Allow public insert rides" ON ecoride_rides FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public update rides') THEN
          CREATE POLICY "Allow public update rides" ON ecoride_rides FOR UPDATE USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read requests') THEN
          CREATE POLICY "Allow public read requests" ON ecoride_requests FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public insert requests') THEN
          CREATE POLICY "Allow public insert requests" ON ecoride_requests FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public update requests') THEN
          CREATE POLICY "Allow public update requests" ON ecoride_requests FOR UPDATE USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read messages') THEN
          CREATE POLICY "Allow public read messages" ON ecoride_messages FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public insert messages') THEN
          CREATE POLICY "Allow public insert messages" ON ecoride_messages FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public update messages') THEN
          CREATE POLICY "Allow public update messages" ON ecoride_messages FOR UPDATE USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read audit_logs') THEN
          CREATE POLICY "Allow public read audit_logs" ON ecoride_audit_logs FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public insert audit_logs') THEN
          CREATE POLICY "Allow public insert audit_logs" ON ecoride_audit_logs FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public update audit_logs') THEN
          CREATE POLICY "Allow public update audit_logs" ON ecoride_audit_logs FOR UPDATE USING (true);
        END IF;
      END $$;

      -- Register for realtime
      DROP PUBLICATION IF EXISTS ecoride_realtime_pub;
      CREATE PUBLICATION ecoride_realtime_pub FOR TABLE
        ecoride_employees,
        ecoride_rides,
        ecoride_requests,
        ecoride_messages,
        ecoride_audit_logs;
    `;

    await client.query(ddl);
    return NextResponse.json({ success: true, message: "Database schema normalized and security RLS policies successfully applied." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await client.end();
  }
}
