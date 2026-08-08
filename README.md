# EcoRide Enterprise – Corporate Ride Sharing & ESG Platform

EcoRide Enterprise is a modern, premium carpooling and ESG engagement platform designed exclusively for verified corporate employees. The platform optimizes commuting routes, reduces corporate parking congestion, fosters workplace collaboration, and generates audits of carbon reduction metrics for CSR/ESG reporting.

---

## 🚀 System Architecture

EcoRide utilizes a monorepo structure separating the high-fidelity Next.js Employee/Admin Portal from the reference NestJS Node.js Backend, PostgreSQL schemas, and Docker/Kubernetes container orchestration manifests:

```
├── frontend/                     # Next.js App Router (TypeScript, Tailwind v4, Lucide)
│   ├── app/                      # Main views: Employee Dashboard, Admin Executive Panel
│   ├── components/               # Navbars, Interactive Commute Map, Ride Chat & SOS
│   └── context/                  # Global client state provider and interactive actions
├── backend/                      # Production NestJS Reference Code
│   └── src/                      
│       ├── auth/                 # Azure AD / Google Workspace SSO domain validation strategies
│       ├── esg/                  # Carbon metrics & points multiplier engine
│       └── rides/                # Live WebSocket updates & geofencing thresholds
├── database/                     # Production SQL migrations
│   └── schema.sql                # Complete PostgreSQL tables, enums, checks & indexes
├── docker/                       # Multi-container orchestration (Postgres, Redis, Apps)
│   └── docker-compose.yml        
└── k8s/                          # Production cluster configs (rolling-updates, ingress, health checks)
```

---

## ⚡ Core Design Principles

### 1. Unified Employee Profile (Zero Switch Roles)
EcoRide has only two application permissions: **Employee** and **Administrator**. There is no separate passenger/driver login. Every worker logs in as an Employee. Depending on their action, they dynamically become:
* **Ride Host**: When clicking **Offer Ride**, entering route specs, detour limits, and car details.
* **Ride Participant**: When clicking **Search / Join Ride**, filtering options, and sending a Join Request.

### 2. Verified Corporate SSO
Only employees with verified corporate emails (e.g. `@company.com`) are permitted. The backend strategies in `backend/src/auth/sso.strategy.ts` block personal domains (e.g. `gmail.com`, `yahoo.com`, `hotmail.com`).

---

## 📈 ESG Calculations & Rewards Engine

### 1. Carbon Savings Formula
The platform computes environmental offsets using:
$$\text{CO}_2\text{ Saved (kg)} = (\text{Single Occupancy Emissions} \times N) - \text{Carpool Emissions}$$
Where:
* **Single Occupancy Emissions**: Assumed average standard vehicle emission: $0.171\text{ kg CO}_2\text{ per km}$ per individual.
* **Carpool Emissions**: Baseline standard vehicle emission: $0.052\text{ kg CO}_2\text{ per km}$.
* **Propulsion Modifiers**: 
  * Electric Vehicle (EV): $0.0 \times \text{Carpool Baseline}$ (Zero direct emissions)
  * Hybrid: $0.35 \times \text{Carpool Baseline}$ (65% reduction)
  * ICE Gasoline: $1.0 \times \text{Carpool Baseline}$

### 2. Gamified ESG Credits
* **Host Bonuses**: Drivers earn credits per km traveled plus bonuses for:
  * Electric propulsion (+25 credits)
  * Capacity optimization (+10 credits if hosting 3+ passengers)
  * Recurring weekly carpools (+15 credits)
* **Violation Penalties**: Automated credit deductions are enforced to ensure reliability:
  * Late Cancellation (&lt; 1 hr): -25 credits
  * No-show: -50 credits

---

## 💻 Developer Setup Guide

### Running Frontend Local Server
1. Navigate to the frontend workspace:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the portal at `http://localhost:3000`. You can click the **Admin / Employee** toggler in the header to preview both workflows dynamically.

### Running with Docker Compose
To run the full stack including PostgreSQL databases, Redis cache, backend NestJS API routes, and Next.js frontend pages:
```bash
cd docker
docker-compose up --build
```

---

## 🛡️ Enterprise Security Hardening
* **SSO Integrations**: OAuth2 validation with Azure AD ID Tokens & Google Workspace.
* **Database Isolation**: PostgreSQL schema contains granular foreign keys, cascading constraints, checks for negative balances, and indexing for queries on email, departure, and notifications.
* **Real-time Safety**: Live socket broadcasts feature geofencing alerts, location sync, and an automated SOS panic trigger notifying corporate HR security.
