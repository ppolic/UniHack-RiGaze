# 🌱 BeGreen — Smart Sustainable Urban Mobility, Waze-Style Crowd Shield & Green Intelligence for Timișoara

**UniHack 8 — The Bloom (Green Mobility Track) · Partner: Primăria Municipiului Timișoara**

**BeGreen** is a full-stack sustainable urban mobility platform designed for **Timișoara**. It combines a **multimodal route planner** (Walk, VeloTM Bike, e-Scooter, STPT Public Transport, Bike + Transit Combined, Carpool, and Park & Ride), a **Waze-style real-time crowd hazard & accessibility shield**, **EcoChallenges gamification** (personal challenges + neighborhood vs. neighborhood competition), and a **Green Intelligence 500×500m civic analytics engine** for **Primăria Municipiului Timișoara**.

---

## 1. Why BeGreen? (Comparison with *Timișoara CityApp*)

While the official **Timișoara CityApp** focuses on municipal news, static tourism info, parking payments, and administrative issue tickets, **BeGreen** acts as a **smart daily mobility companion and civic data engine**:

| Capability | Timișoara CityApp | **BeGreen** |
| :--- | :--- | :--- |
| **Multimodal Route Planning** | No active route planner | Compares **Walk, Bike (VeloTM), Scooter, STPT Transit, Combined (Bike+Transit), Carpool & Car (Park & Ride)** ranked by $\text{CO}_2$, EcoPoints, duration, and cost |
| **Real-Time Weather, AQI & Slope Shield** | Static info only | Live **Open-Meteo** weather, wind, precipitation, PM2.5/PM10 air quality & **OpenRouteService** elevation/slope evaluation |
| **Legal Age & Accessibility Rules Engine** | None | Enforces **Romanian traffic law** (blocks scooters/bikes on roads for `< 14` yrs, mandatory helmet warning `< 16` yrs) & **step-free routing** (`cycling-electric` / `wheelchair`) for users with disabilities (`hasDisability: true`) |
| **Waze-Style Crowd Reports & Sesizări Live** | One-way form submission | Live map & route warnings for **road blockades, blocked bike lanes, and wheelchair barriers**, synced with **`https://sesizari.primariatm.ro/api/sesizari`** + community confirmations (`👍` / `👎`) |
| **Citizen Demand for Missing Bike Lanes** | No spatial gap analytics | Citizens report corridors where they commute daily without a bike lane (`POST /hazards/missing-bike-lane`) + saved **Favorite Routes** feed a **500×500m Green Intelligence Grid (`GapCells`)** |
| **EcoChallenges & District Competition** | No daily retention loop | Personal weekly challenges (auto-adapted for wheelchair users) + **Timișoara District Green Challenge** (*Centar* vs. *Complexul Studențesc* vs. *Iulius Town* vs. *Zona Industrială*) |
| **Actionable Civic Output for City Hall** | Tickets only | Generates Top 3 infrastructure investment priorities with ready-to-publish project drafts for **`https://decidem.primariatm.ro`** |

---

## 2. Tech Stack & Architecture

- **Backend:** ASP.NET Core 9 Web API (`net9.0`)
- **Database:** **MySQL 8.0** via **Entity Framework Core** (`Pomelo.EntityFrameworkCore.MySql`)
- **Authentication:** **JWT Bearer Authentication** (`HS256`, PBKDF2-SHA256 password hashing)
- **External Integrations:**
  - **OpenRouteService API v2** (`foot-walking`, `wheelchair`, `cycling-regular`, `cycling-electric`, `driving-car` with 3D elevation)
  - **Open-Meteo Forecast & Air Quality API** (Timișoara real-time temperature, rain, snow, wind, PM2.5, PM10, European AQI)
  - **Primăria Timișoara Sesizări API** (`https://sesizari.primariatm.ro/api/sesizari` — cached for 15 minutes and GDPR-sanitized)
  - **Primăria Timișoara Decidem Portal** (`https://decidem.primariatm.ro` — participatory budgeting proposal generator)

---

## 3. Server Deployment & MySQL Database Setup

**BeGreen** runs directly as a deployable server application connected to a **MySQL 8.0** database. On startup, `Program.cs` and `DatabaseSeeder.cs` **automatically create/upgrade all 15 MySQL tables and seed all Timișoara catalog, GTFS transit, and demo data**.

### Step 1: Create the MySQL Database
Ensure MySQL 8.0 is running and create the database schema (or let EF Core create it automatically on startup):
```sql
CREATE DATABASE IF NOT EXISTS ecomutare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Configure Connection String & Environment Variables
Set the MySQL connection string via User Secrets (for local development) or environment variables (for production servers):

**Option A — .NET User Secrets (Local Development):**
```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=ecomutare;User=root;Password=YOUR_MYSQL_PASSWORD;" --project EcoMutare/EcoMutare/EcoMutare.csproj
```

**Option B — Environment Variables (Linux / Windows Server):**
```bash
export ASPNETCORE_ENVIRONMENT="Production"
export ASPNETCORE_URLS="http://0.0.0.0:5000"
export ConnectionStrings__DefaultConnection="Server=YOUR_MYSQL_HOST;Port=3306;Database=ecomutare;User=begreen_user;Password=YOUR_PASSWORD;"
export Jwt__Key="BeGreenTimisoaraUniHack2026SuperSecretJwtKeyMin32Bytes!"
export OpenRouteService__ApiKey="YOUR_ORS_API_KEY"
```

### Step 3: Build & Run
```bash
dotnet publish EcoMutare/EcoMutare/EcoMutare.csproj -c Release -o ./publish
dotnet ./publish/EcoMutare.dll
```
- **Swagger UI** is available in both Development and Production at `/swagger`.
- **Health & MySQL Status Check:** Open `GET /health` (or `GET /debug/tests/db-status`) to verify MySQL connectivity and row counts across all **15 tables**.

---

## 4. Pre-Seeded Demo Accounts (Password for all: `Demo123!`)

The MySQL seeder (`DatabaseSeeder.cs`) automatically creates **5 ready-to-use BeGreen demo personas** for testing all legal, accessibility, and multimodal scenarios:

| # | Email | Password | Persona & Routing Behavior | Initial Balance |
| :-: | :--- | :--- | :--- | :-: |
| 1 | `ana.student@upt.ro` | `Demo123!` | **Ana Popescu** — 21 yrs (`Adult`), UPT student, owns a bike (`ownsBike: true`) | `340` EcoPoints |
| 2 | `marko.kolica@uvt.ro` | `Demo123!` | **Marko Ionescu** — 26 yrs (`Adult`), wheelchair user (`hasDisability: true`) — step-free ORS routing, low-floor STPT transit, disabled parking spots & inclusive EcoChallenges | `280` EcoPoints |
| 3 | `david.ucenik@tm.ro` | `Demo123!` | **David Munteanu** — 13 yrs (`Under14`) — Romanian law blocks e-scooters and road cycling; offers safe walking & STPT transit | `150` EcoPoints |
| 4 | `elena.tinejdzer@tm.ro` | `Demo123!` | **Elena Rusu** — 15 yrs (`From14To15`) — permitted to ride bikes & e-scooters (`< 25 km/h`) with mandatory helmet warning (`< 16 yrs`) | `195` EcoPoints |
| 5 | `vlad.driver@continental.ro` | `Demo123!` | **Vlad Dumitrescu** — 31 yrs (`Adult`), owns a car (`ownsCar: true`), active Carpool driver & Park & Ride commuter | `420` EcoPoints |

> **Tip:** In Swagger UI, simply run `POST /auth/login` with any of the accounts above — a built-in Swagger script automatically stores the JWT token in `localStorage` and attaches `Authorization: Bearer <token>` to all subsequent requests!

---

## 5. Complete API Endpoints Reference

### 🔐 Authentication & User Profile (`AuthController`)
- `POST /auth/register` — Register a new user (automatically derives `AgeCategory` from `birthDate` and issues a JWT)
- `POST /auth/login` — Authenticate and receive a JWT token + full profile
- `GET /auth/me` (alias `GET /me`) — Get current authenticated user's profile and `pointsBalance`
- `PUT /auth/me` (alias `PUT /me`) — Update user profile (`hasDisability`, `ownsBike`, `ownsScooter`, `ownsCar`, `birthDate`)
- `GET /auth/demo-accounts` — List all 5 pre-seeded demo accounts for instant testing

### 🧭 Multimodal Route Planner (`RoutesController`)
- `POST /routes/plan` — Computes, filters, and ranks all mobility options (`Walk`, `Bike`, `Scooter`, `PublicTransport`, `Combined`, `Car`) using real-time weather, air quality, terrain slope, legal age/disability rules, and **active Waze road hazards along the route geometry**

### ⚠️ Waze-Style Crowd Reports & Sesizări Integration (`CommunityReportsController`)
- `GET /hazards` (alias `GET /reports`) — Returns active Waze community reports (road blockades, wheelchair barriers, blocked bike lanes, missing bike lanes) merged with **live reports from `https://sesizari.primariatm.ro/api/sesizari`**
- `POST /hazards` — Submit a new Waze-style field report (`+15` EcoPoints; immediately warns commuters on `POST /routes/plan`)
- `POST /hazards/missing-bike-lane` — Citizen report: *"I commute here frequently and a bike lane is missing!"* (`+20` EcoPoints; feeds the Green Intelligence `GapCells` grid and generates a `decidem.primariatm.ro` proposal)
- `POST /hazards/{id}/confirm` — Waze community upvote: **"Still there / I need this bike lane too 👍"** (`+5` EcoPoints)
- `POST /hazards/{id}/resolve` — Waze community vote: **"Resolved / Cleared 👎"**

### ⭐ User Favorite Routes & Smart Commute (`FavoriteRoutesController`)
- `GET /favorites` — List saved favorite routes with a live **Waze Commute Hazard Alert** (`activeHazardsOnRouteCount`)
- `POST /favorites` — Save a favorite route (with `missingBikeLaneOnRoute: true` to register recurring weekly demand in Green Intelligence)
- `GET /favorites/{id}/plan` — **1-Click Smart Commute** route calculation for a saved favorite route
- `DELETE /favorites/{id}` — Remove a favorite route

### 🏆 EcoChallenges & District Green Challenge (`ChallengesController`)
- `GET /challenges` (alias `GET /challenges/overview`) — Complete overview returning both **Personal Weekly Challenges** and the **Timișoara District Green Challenge Leaderboard** in a single call
- `GET /challenges/my` — Personal weekly challenges (*3 Bike Rides This Week*, *1 Car-Free Day*, *10 km Walk / Step-Free*, *Try a New STPT Transit Line*, *Save 5 kg $\text{CO}_2$*, *Waze Community Guardian*) with live progress calculated from MySQL `TripHistories` and automatic adaptation for wheelchair users (`hasDisability: true`)
- `GET /challenges/zones` (alias `GET /challenges/leaderboard/zones`) — **Green Challenge – This Week** neighborhood competition (*Centar / Cetate* vs. *Complexul Studențesc* vs. *Iulius Town / Aradului* vs. *Zona Industrială SE* vs. *Calea Șagului*), dynamically updated whenever a user logs a green trip
- `POST /challenges/{id}/claim` — Claim bonus EcoPoints (`+100`, `+50`, `+80`, `+60`, `+150`, `+40`) for a completed challenge and record a `Bonus` transaction in MySQL

### 🚗 Carpool Ride Sharing (`CarpoolController`)
- `GET /carpool/rides` — Search available rides by origin/destination proximity (`radiusKm`), departure time, available seats, and `wheelchairFriendly` filter
- `POST /carpool/rides` — Offer a new Carpool ride with automatic fuel cost estimation (`0.55 RON/km` split per passenger — informational only, no in-app payment)
- `POST /carpool/rides/{id}/join` — Book a seat inside a MySQL transaction, record a `TripHistory` entry, and award EcoPoints to both passenger and driver
- `GET /carpool/my-bookings` — List all rides booked by the authenticated user

### 🏙️ Green Intelligence for Primăria Timișoara (`InsightsController`)
- `GET /insights/gaps` — Returns the **500×500m Timișoara Grid (`GapCells`)**, existing bike corridors, citizen missing-lane reports, favorite-route demand, and calculated `GapScore` (`0–100`)
- `GET /insights/summary` — Executive summary for City Hall: total $\text{CO}_2$ saved, modal split, and **Top 3 High-Priority Zones** with ready-to-submit participatory budget proposals for **`https://decidem.primariatm.ro`**
- `POST /insights/recalculate` — Explicitly recalculates and persists all `GapCells` into MySQL
- `GET /insights/proximity` — Computes orthogonal point-to-segment distance from any coordinate to the nearest bike lane and STPT stop

### 🚋 Catalog, STPT GTFS Transit, Trips, Points & Rewards
- `GET /stations` (alias `GET /catalog/stations`) — VeloTM bike & scooter stations (with proximity search)
- `GET /parkings` (alias `GET /catalog/parkings`) — TimPark parkings (including accessible spaces for disabled drivers)
- `GET /transit/routes`, `GET /transit/stops`, `GET /transit/trips`, `GET /transit/stop-times`, `GET /transit/departures` — STPT GTFS public transport schedule from MySQL
- `POST /trips`, `GET /trips` (alias `GET /trips/history`) — Record a completed trip, award EcoPoints, update `GreenIntelligenceService`, and view user trip history
- `GET /points` — Current EcoPoints balance and paginated `PointTransactions` history
- `GET /rewards` & `POST /rewards/{id}/redeem` — Partner rewards catalog and atomic point redemption with unique `DiscountCode` generation

### 🛡️ Diagnostics & Demo Guardian (`DiagnosticsController`)
- `GET /health` (alias `GET /debug/tests/db-status`) — Live MySQL connectivity check and row counts across all 15 tables
- `POST /admin/seed-demo` (alias `POST /debug/tests/seed-demo`) — 1-click idempotent reset/re-seed of all MySQL demo data before jury presentation
- `GET /debug/tests/run-all` — Automated verification suite for `RulesEngine`, `EcoScoreCalculator`, and `GreenIntelligenceService`

---

## 6. License
**BeGreen** is released under the **MIT License** — open-source and ready for integration into the **Primăria Municipiului Timișoara** digital ecosystem (*Timișoara CityApp / SMTT / Direcția Generală de Mobilitate Urbană*).
