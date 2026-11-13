# EcoMutare API ugovor

Base URL (dev): `http://<ip-računala>:5279` · Swagger: `/swagger/v1/swagger.json`, UI na `/swagger`
CORS je otvoren. Enumi se šalju kao **stringovi**, polja su **camelCase**.

## POST `/routes/plan`

Planira opcije puta od A do B prema profilu korisnika, vremenu i pravilima.

### Zahtjev

| Polje | Tip | Obavezno | Opis |
|---|---|---|---|
| `origin` | GeoPoint | da | `lat` (-90..90), `lng` (-180..180) |
| `destination` | GeoPoint | da | isto |
| `departureTime` | ISO 8601 datetime | ne | zadano: trenutno vrijeme |
| `profile` | UserProfile | da | vidi dolje |
| `preferredModes` | TransportMode[] | ne | prazno/izostavljeno = svi modovi |

**UserProfile:** `ageCategory` (`Under14` \| `From14To15` \| `Adult`, zadano `Adult`), `hasDisability`, `ownsBike`, `ownsScooter`, `ownsCar` (bool).

**TransportMode:** `Walk`, `Bike`, `Scooter`, `PublicTransport`, `Car`, `Carpool`, `Combined`
**WeatherCondition:** `Clear`, `Rain`, `Snow`, `Cold`, `Windy`
**WarningType:** `Rain`, `Snow`, `Cold`, `Windy`, `AirQuality`, `Slope`, `Helmet`, `NoBikeLane`, `NotAccessible`, `Estimate`

### Odgovor `200`

| Polje | Opis |
|---|---|
| `weather` | `condition`, `temperatureC`, `precipitationMm`, `europeanAqi`, `pm25`, `pm10`, `airQualityCategory` |
| `options[]` | sortirano po `ecoRank` (1 = najzelenije) |
| `isMock` | `true` dok planer vraća testne podatke (FE prikazuje oznaku "demo") |

**Option:** `id`, `mode`, `title`, `durationMinutes`, `distanceKm`, `costRon`, `co2Grams`, `ecoPoints`, `ecoRank`, `isRecommended`, `segments[]`, `warnings[]`
**Segment:** `mode`, `description`, `durationMinutes`, `distanceKm`, `geometry[]` (lista `{lat,lng}`; FE crta izravno, bez dekodiranja polylinea)
**Warning:** `type`, `message`

Pogreške validacije (npr. `lat` izvan raspona, nedostaje `origin`) vraćaju `400` s ProblemDetails tijelom.

### Primjer zahtjeva

```json
{
  "origin":      { "lat": 45.7537, "lng": 21.2257 },
  "destination": { "lat": 45.7471, "lng": 21.2250 },
  "departureTime": "2026-11-13T08:30:00+01:00",
  "profile": {
    "ageCategory": "From14To15",
    "hasDisability": false,
    "ownsBike": false,
    "ownsScooter": false,
    "ownsCar": false
  },
  "preferredModes": null
}
```

### Primjer odgovora (skraćeno)

```json
{
  "weather": { "condition": "Rain", "temperatureC": 9, "precipitationMm": 1.2 },
  "isMock": true,
  "options": [
    {
      "id": "bike", "mode": "Bike", "title": "Najam bicikla",
      "durationMinutes": 8, "distanceKm": 1.5, "costRon": 3.5,
      "co2Grams": 0, "ecoPoints": 90, "ecoRank": 1, "isRecommended": true,
      "segments": [
        { "mode": "Walk", "description": "Pješke do stanice", "durationMinutes": 2, "distanceKm": 0.1,
          "geometry": [ { "lat": 45.7537, "lng": 21.2257 }, { "lat": 45.7505, "lng": 21.2250 } ] },
        { "mode": "Bike", "description": "Vožnja biciklom", "durationMinutes": 6, "distanceKm": 1.4,
          "geometry": [ { "lat": 45.7505, "lng": 21.2250 }, { "lat": 45.7471, "lng": 21.2250 } ] }
      ],
      "warnings": [
        { "type": "Rain",   "message": "Kiša: vožnja bicikla je manje ugodna i sigurna." },
        { "type": "Helmet", "message": "Kaciga je obavezna za osobe mlađe od 16 godina." }
      ]
    },
    { "id": "walk",    "mode": "Walk",            "title": "Pješke",    "durationMinutes": 17, "co2Grams": 0,   "ecoPoints": 100, "ecoRank": 2, "isRecommended": false },
    { "id": "scooter", "mode": "Scooter",         "title": "Najam romobila", "durationMinutes": 7, "co2Grams": 20,  "ecoPoints": 70,  "ecoRank": 3, "isRecommended": false },
    { "id": "transit", "mode": "PublicTransport", "title": "Tramvaj 8", "durationMinutes": 12, "co2Grams": 112, "ecoPoints": 60,  "ecoRank": 4, "isRecommended": false }
  ]
}
```

(Korisnik `From14To15` ne može voziti auto, pa opcije `Car` nema.)

## Pravila planera

**Dopuštenost prema profilu**

| Pravilo | Efekt |
|---|---|
| `hasDisability = true` | nema `Bike` ni `Scooter`; pješke i javni prijevoz dobivaju pristupačnu rutu/vozilo (naslov se mijenja); auto koristi invalidsko parkirno mjesto |
| `ageCategory = Under14` | nema `Bike`, `Scooter` ni `Car` |
| `ageCategory = From14To15` | `Bike`/`Scooter` dopušteni uz upozorenje `Helmet`; nema `Car` |
| `ageCategory = Adult` | `Car` dopušten; sve ostalo ovisno o invaliditetu |
| `Walk`, `PublicTransport` | uvijek dostupni |

**Vrijeme i kvaliteta zraka:**
- Kiša dodaje upozorenje `Rain` na `Bike` i `Scooter`. Snijeg/hladnoća/vjetar analogno dodaju `Snow`/`Cold`/`Windy`.
- **Kvaliteta zraka (`AirQuality`):** prati se putem javnog Open-Meteo Air Quality API-ja (`european_aqi`, `pm2_5`, `pm10`) te lokalnih RNMCA mjernih postaja u Timișoari (`TM-1 Calea Șagului`, `TM-5 Calea Aradului`, `Pasaj Michelangelo`, `Gara de Nord`, `Calea Buziașului` – dostupno i na `GET /air-quality/stations`). Ako ruta prolazi kroz dionicu s nižom kvalitetom zraka (`EAQI >= 40` ili `PM2.5 >= 15 µg/m³`), opcije `Walk`, `Bike` i `Scooter` dobivaju upozorenje `AirQuality` da kretanje na otvorenom na toj dionici možda neće biti najugodnije.

**Rangiranje i preporuka**
1. `ecoRank`: sortiranje po `co2Grams` rastuće, pa po `durationMinutes`; rang kreće od 1.
2. `isRecommended` je točno jedna opcija: najzelenija čije trajanje nije dulje od **2× trajanja najbrže** opcije (inače prva po rangu).
3. Dopuštene su samo opcije koje prođu pravila iznad, pa je `ecoRank` 1 uvijek najzelenija *dopuštena* opcija.

**Ostalo:** `ecoPoints` je nagrada za odabir te opcije (Walk 100, Bike 90, Scooter 70, PublicTransport 60, Car 0). `costRon` je u RON (0 za vlastiti bicikl/romobil). Planer prilagođava udaljenost, trajanje i geometriju prema unesenim koordinatama `origin` i `destination` te filtrira po `preferredModes` ako su zadani.

---

## Green Intelligence – Gradski podaci (sat 24–30)

### GET `/insights/gaps`
Vraća biciklističke koridore (`bikeCorridors`) i prostornu rešetku grada (`cells`, ćelije ~500 m × 500 m) s izračunatim prazninama (`isInfrastructureGap`), brojem putovanja, udjelom automobila (`carShare`), udaljenošću do najbliže staze (`distanceToNearestBikeLaneMeters`) i stanice JPP-a (`distanceToNearestTransitStopMeters`) te rangom prioriteta (`priorityRank`, `gapScore`).
- Opcionalni query parametar: `?onlyGaps=true` (vraća samo ćelije s infrastrukturnim deficitom).
- Jasno označeno s `isSimulationData: true` i `simulationDisclaimer`.

### GET `/insights/summary`
Vraća tri ključna broja za gradski dashboard:
- `totalSavedCo2Kg` – ukupno ušteđeni CO₂ u kg
- `totalTripsCount` / `greenTripsCount` / `greenModalSplitPercent` – ukupan broj putovanja i udio zelenih opcija
- `topInvestmentZones` – **Top 3 zone** za izgradnju nove biciklističke staze ili uvođenje linije javnog prijevoza (`rank`, `zoneName`, `gapScore`, `reason`, `proposedAction`).

### GET `/insights/proximity?lat=...&lng=...`
Helper za izračun ortogonalne udaljenosti bilo koje točke u gradu do najbliže biciklističke staze, STPT stanice, niskopodne (wheelchair-accessible) stanice i VeloTM stanice.

