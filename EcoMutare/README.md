# EcoMutare – Timișoara Green Mobility & Civic Intelligence API (UniHack 8)

> **"Getting from A to B shouldn't cost the planet."**
> Multimodalni održivi planer ruta, Waze-style građanski štit za pristupačnost i blokade u stvarnom vremenu te **Green Intelligence** analitička platforma za **Primăria Municipiului Timișoara** (*Direcția Generală de Mobilitate Urbană & SMTT*).

---

## 1. Arhitektura i Tehnologije
- **Backend:** .NET 9.0 Web API (`ASP.NET Core`), Swashbuckle Swagger/OpenAPI
- **Baza podataka:** MySQL 8.0+ (`EntityFrameworkCore` + `Pomelo.EntityFrameworkCore.MySql`) uz automatsku inicijalizaciju, nadogradnju sheme i *DatabaseSeeder* pri pokretanju
- **Vanjski servisi i javni podaci Grada Temišvara (s ugrađenim cachingom i offline fallbackom):**
  - **OpenRouteService (ORS):** `foot-walking`, `cycling-regular`, `driving-car`, `wheelchair`
  - **Open-Meteo:** prognoza vremena (kiša, snijeg, vjetar, temperatura) + digitalni model visina (*Elevation*) za izračun nagiba
  - **Primăria Timișoara Live API (`sesizari.primariatm.ro`):** čitanje stvarnih prijava građana na ulicama i nogostupima te povezivanje s portalima `sesizari.primariatm.ro` i `decidem.primariatm.ro`
  - **STPT GTFS & VeloTM & TimPark:** stanice javnog prijevoza (uklj. niskopodne/pristupačne stanice), javni bicikli i zone parkiranja (uklj. besplatna invalidska mjesta).

---

## 2. Pokretanje i Deploy na Server (MySQL)

### A. Izravno pokretanje na serveru (Linux / Windows + MySQL)
1. Osigurajte aktivan MySQL 8.0+ server i postavite connection string u `appsettings.json` ili kao varijablu okruženja:
   ```bash
   export ConnectionStrings__DefaultConnection="Server=localhost;Port=3306;Database=ecomutare;User=root;Password=VASA_LOZINKA;"
   export Jwt__Key="EcoMutareTimisoaraUniHack2026SuperSecretJwtKeyMin32Bytes!"
   export OpenRouteService__ApiKey="VAS_ORS_KLJUC"
   ```
2. Pokrenite aplikaciju:
   ```bash
   dotnet publish -c Release -o ./publish
   cd ./publish
   dotnet EcoMutare.dll --urls "http://0.0.0.0:5080"
   ```
3. Pri pokretanju aplikacija automatski izvršava `DatabaseSeeder.SeedAllAsync`:
   - Kreira sve tablice u MySQL bazi (`Users`, `Stations`, `Parkings`, `Routes`, `Stops`, `TransitTrips`, `StopTimes`, `CarpoolRides`, `CarpoolBookings`, `CommunityReports`, `FavoriteRoutes`, `GapCells`, `Rewards`, `TripHistories`, `PointTransactions`).
   - Puni bazu s **5 demo korisničkih računa**, STPT voznim redom, VeloTM stanicama, TimPark parkinzima, Carpool oglasima, Waze prijavama i 500m `GapCells` mrežom.
4. Otvorite **Swagger UI** na: `http://<SERVER_IP>:5080/swagger`
5. Provjerite zdravlje sustava i broj redaka u MySQL tablicama na: `GET /health`

---

## 3. Spremni Demo Računi (Lozinka za sve: `Demo123!`)

| Email | Lozinka | Profil / Uloga u demou pred žirijem | Početni bodovi |
| :--- | :--- | :--- | :---: |
| `ana.student@upt.ro` | `Demo123!` | **Studentica UPT-a** (`Adult`, `ownsBike: true`) – vlastiti bicikl bez naplate najma | `320` |
| `marko.kolica@uvt.ro` | `Demo123!` | **Osoba s invaliditetom** (`Adult`, `hasDisability: true`) – isključivo niskopodni STPT i besplatna invalidska TimPark mjesta + Waze barijere | `450` |
| `david.ucenik@tm.ro` | `Demo123!` | **Učenik < 14 god.** (`Under14`) – zakonska zabrana romobila, bicikla na kolniku i vožnje auta | `110` |
| `elena.tinejdzer@tm.ro` | `Demo123!` | **Srednjoškolka 15 god.** (`From14To15`) – obavezno zakonsko upozorenje za zaštitnu kacigu | `180` |
| `vlad.driver@continental.ro` | `Demo123!` | **Vozač (Continental)** (`Adult`, `ownsCar: true`) – objavljuje Carpool vožnje | `260` |

*(Svi računi vidljivi su i putem endpointa `GET /auth/demo-accounts`.)*

---

## 4. Pregled API Endpointa (Swagger)

### 🔐 Autentikacija i Profil (`AuthController`)
- `POST /auth/register` – Registracija s datumom rođenja (automatski izračun `AgeCategory`), invaliditetom i vozilima (+50 bonus bodova)
- `POST /auth/login` – Prijava i izdavanje JWT tokena
- `GET /auth/me` (alias `GET /me`) – Dohvat profila prijavljenog korisnika
- `PUT /auth/me` (alias `PUT /me`) – Ažuriranje postavki profila (`hasDisability`, `ownsBike`, `ownsScooter`, `ownsCar`, `birthDate`)
- `GET /auth/demo-accounts` – Popis spremnih demo računa za brzi test

### 🧭 Multimodalni Planer Ruta (`RoutesController`)
- `POST /routes/plan` – Računa i rangira sve opcije (`Walk`, `Bike`, `Scooter`, `PublicTransport`, `Combined`, `Car`) uz Open-Meteo prognozu, nagib terena, pravila za dob i invaliditet te **aktivne Waze blokade na ruti**.

### ⚠️ Waze-Style Građanske Prijave & Sesizări (`CommunityReportsController`)
- `GET /hazards` (alias `GET /reports`) – Sve aktivne Waze prijave (blokade cesta, nedostupna područja za kolica, blokirane staze, nedostajuće biciklističke staze) + **žive prijave sa `sesizari.primariatm.ro`**
- `POST /hazards` – Nova prijava blokade/prepreke (+15 eko-bodova, utječe na `POST /routes/plan`)
- `POST /hazards/missing-bike-lane` – Građani prijavljuju: *"Ovdje redovito prolazim, a nema biciklističke staze!"* (+20 eko-bodova, hrani Green Intelligence i generira prijedlog za `decidem.primariatm.ro`)
- `POST /hazards/{id}/confirm` – Waze potvrda **"Još je tamo / Potvrđujem 👍"**
- `POST /hazards/{id}/resolve` – Waze oznaka **"Riješeno / uklonjeno 👎"**

### ⭐ Favorite Rute Korisnika (`FavoriteRoutesController`)
- `GET /favorites` – Dohvat omiljenih ruta uz trenutni **Live Waze Commute Alarm** (ima li danas blokada na toj ruti)
- `POST /favorites` – Spremanje omiljene rute (uz `missingBikeLaneOnRoute: true` automatski bilježi potražnju za biciklističkom stazom)
- `GET /favorites/{id}/plan` – **1-Click Smart Commute** izračun rute za spremljenu omiljenu relaciju
- `DELETE /favorites/{id}` – Brisanje omiljene rute

### 🚗 Carpool Dijeljenje Vožnje (`CarpoolController`)
- `GET /carpool/rides` – Pretraga aktivnih vožnji po blizini polazišta/odredišta, vremenu, slobodnim sjedalima i pristupačnosti (`wheelchairFriendly`)
- `POST /carpool/rides` – Objava nove Carpool vožnje uz automatski izračun procijenjenog troška goriva po km (`0.55 RON/km`) i udjela po sjedalu (bez naplate u aplikaciji)
- `POST /carpool/rides/{id}/join` – Rezervacija sjedala, zapis u `TripHistories` i dodjela eko-bodova putniku i vozaču
- `GET /carpool/my-bookings` – Pregled mojih rezervacija

### 🏙️ Green Intelligence za Grad Temišvar (`InsightsController`)
- `GET /insights/gaps` – 500×500m mreža grada (`GapCells`), biciklistički koridori, Waze prijave nedostajućih staza, tjedna potražnja iz Favorite ruta i `GapScore`
- `GET /insights/summary` – Tri ključna broja za gradski dashboard (ušteđeni CO₂, modalni split, **Top 3 zone za ulaganje** s gotovim nacrtom prijedloga za **`https://decidem.primariatm.ro`**)
- `POST /insights/recalculate` – Eksplicitni preračun i spremanje `GapCells` u MySQL bazu
- `GET /insights/proximity` – Izračun ortogonalne udaljenosti bilo koje točke do najbliže biciklističke staze i STPT stanice

### 🚋 Katalog, Javni Prijevoz (GTFS), Vožnje, Bodovi i Nagrade
- `GET /stations` i `GET /catalog/stations` – VeloTM biciklističke i romobilske stanice
- `GET /parkings` i `GET /catalog/parkings` – TimPark parkirališta (s invalidskim mjestima)
- `GET /transit/routes`, `GET /transit/stops`, `GET /transit/trips`, `GET /transit/stop-times`, `GET /transit/departures` – STPT GTFS vozni red iz MySQL baze
- `POST /trips` i `GET /trips/history` – Završetak putovanja, dodjela eko-bodova i povijest putovanja
- `GET /points` – Stanje eko-bodova i povijest transakcija (`PointTransactions`)
- `GET /rewards` i `POST /rewards/{id}/redeem` – Partnerski kuponi i zamjena eko-bodova

### 🛡️ Dijagnostika i Čuvar Demoa (`DiagnosticsController`)
- `GET /health` (i `GET /debug/tests/db-status`) – Status MySQL baze i broj zapisa po svim tablicama
- `POST /admin/seed-demo` – 1-click punjenje/reset svih demo podataka u MySQL bazi
- `GET /debug/tests/run-all` – Izvršavanje ugrađenih verifikacijskih testova za `RulesEngine`, `EcoScoreCalculator` i `GreenIntelligenceService`

---

## 5. Licenca
Projekt je otvorenog koda pod **MIT licencom** – spreman za preuzimanje i integraciju u ekosustav **Primăria Municipiului Timișoara** (*Timișoara CityApp / SMTT / Direcția Generală de Mobilitate Urbană*).
