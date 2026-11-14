using EcoMutare.Domain;
using EcoMutare.Domain.Entities;
using EcoMutare.Services;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Insights;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Data;

/// <summary>
/// Automatski inicijalizator i seeder MySQL baze za produkcijski server i demo (BE2 sat 38–48).
/// Osigurava da su sve tablice i kolone prisutne u MySQL-u te puni:
/// - 5 demo korisničkih računa (lozinka za sve: Demo123!),
/// - VeloTM stanice, TimPark parkirališta i partnerske nagrade,
/// - STPT GTFS linije, stajališta, vožnje i vozne redove (StopTimes),
/// - Carpool oglase i rezervacije,
/// - Povijest vožnji (TripHistories), transakcije bodova (PointTransactions) i 500m GapCells.
/// </summary>
public static class DatabaseSeeder
{
    public static async Task SeedAllAsync(
        AppDbContext db,
        IGreenIntelligenceService insights,
        ILogger logger,
        CancellationToken ct = default)
    {
        await db.Database.EnsureCreatedAsync(ct);
        await EnsureSchemaUpgradesAsync(db, logger, ct);

        // 1. Demo korisnički računi (lozinka za sve: Demo123!)
        var demoHash = PasswordHelper.Hash("Demo123!");
        var demoUsers = new List<User>
        {
            new()
            {
                Email = "ana.student@upt.ro",
                DisplayName = "Ana Popescu (Studentica UPT)",
                PasswordHash = demoHash,
                BirthDate = new DateTime(2003, 5, 14),
                AgeCategory = AgeCategory.Adult,
                HasDisability = false,
                OwnsBike = true,
                OwnsScooter = false,
                OwnsCar = false,
                PointsBalance = 320
            },
            new()
            {
                Email = "marko.kolica@uvt.ro",
                DisplayName = "Marko Ionescu (Pristupačnost / Kolica)",
                PasswordHash = demoHash,
                BirthDate = new DateTime(1998, 9, 20),
                AgeCategory = AgeCategory.Adult,
                HasDisability = true,
                OwnsBike = false,
                OwnsScooter = false,
                OwnsCar = true,
                PointsBalance = 450
            },
            new()
            {
                Email = "david.ucenik@tm.ro",
                DisplayName = "David Munteanu (Učenik < 14 god.)",
                PasswordHash = demoHash,
                BirthDate = new DateTime(2014, 3, 10),
                AgeCategory = AgeCategory.Under14,
                HasDisability = false,
                OwnsBike = true,
                OwnsScooter = true,
                OwnsCar = false,
                PointsBalance = 110
            },
            new()
            {
                Email = "elena.tinejdzer@tm.ro",
                DisplayName = "Elena Rusu (15 god. – Kaciga pravilo)",
                PasswordHash = demoHash,
                BirthDate = new DateTime(2011, 7, 22),
                AgeCategory = AgeCategory.From14To15,
                HasDisability = false,
                OwnsBike = true,
                OwnsScooter = true,
                OwnsCar = false,
                PointsBalance = 180
            },
            new()
            {
                Email = "vlad.driver@continental.ro",
                DisplayName = "Vlad Dumitru (Carpool Vozač)",
                PasswordHash = demoHash,
                BirthDate = new DateTime(1992, 11, 5),
                AgeCategory = AgeCategory.Adult,
                HasDisability = false,
                OwnsBike = false,
                OwnsScooter = false,
                OwnsCar = true,
                PointsBalance = 260
            }
        };

        foreach (var du in demoUsers)
        {
            if (!await db.Users.AnyAsync(u => u.Email == du.Email, ct))
            {
                db.Users.Add(du);
            }
        }
        await db.SaveChangesAsync(ct);

        var ana = await db.Users.FirstOrDefaultAsync(u => u.Email == "ana.student@upt.ro", ct);
        var marko = await db.Users.FirstOrDefaultAsync(u => u.Email == "marko.kolica@uvt.ro", ct);
        var vlad = await db.Users.FirstOrDefaultAsync(u => u.Email == "vlad.driver@continental.ro", ct);

        // 2. VeloTM i romobilske stanice u MySQL (ako ih je manje od 5)
        if (await db.Stations.CountAsync(ct) < 5)
        {
            var existingNames = await db.Stations.Select(s => s.Name).ToListAsync(ct);
            foreach (var st in TimisoaraPublicData.Stations)
            {
                if (existingNames.Contains(st.Name)) continue;
                db.Stations.Add(new Station
                {
                    Name = st.Name,
                    Type = st.VehicleType.Equals("Scooter", StringComparison.OrdinalIgnoreCase) ? StationType.Scooter : StationType.Bike,
                    Latitude = st.Lat,
                    Longitude = st.Lng,
                    Capacity = st.AvailableVehicles + 6,
                    AvailableUnits = st.AvailableVehicles,
                    IsActive = true
                });
            }
            await db.SaveChangesAsync(ct);
        }

        // 3. TimPark parkirališta u MySQL
        if (await db.Parkings.CountAsync(ct) < 4)
        {
            var existingParkings = await db.Parkings.Select(p => p.Name).ToListAsync(ct);
            foreach (var pk in TimisoaraPublicData.Parkings)
            {
                if (existingParkings.Contains(pk.Name)) continue;
                db.Parkings.Add(new Parking
                {
                    Name = pk.Name,
                    Address = $"{pk.Zone}, Timișoara (invalidska mjesta: {pk.AccessibleSpots})",
                    Latitude = pk.Lat,
                    Longitude = pk.Lng,
                    TotalSpaces = pk.AvailableSpots + 45,
                    FreeSpaces = pk.AvailableSpots,
                    HourlyPrice = pk.HourlyRateRon,
                    IsParkAndRide = pk.Zone.Contains("Blue", StringComparison.OrdinalIgnoreCase)
                });
            }
            await db.SaveChangesAsync(ct);
        }

        // 4. Partnerske nagrade u Timișoari
        if (await db.Rewards.CountAsync(ct) < 5)
        {
            var existingRewards = await db.Rewards.Select(r => r.Name).ToListAsync(ct);
            var extraRewards = new[]
            {
                new Reward { Name = "STPT Dnevna karta (Tramvaj / Bus / Vaporetto)", Description = "Cjelodnevna vožnja svim linijama javnog prijevoza u Timișoari (kod: STPT-ECO-2026)", PointsCost = 120, IsActive = true },
                new Reward { Name = "VeloTM – 3 besplatna otključavanja bicikla", Description = "Voucher za sustav javnih bicikala VeloTM (kod: VELOTM-FREE3)", PointsCost = 60, IsActive = true },
                new Reward { Name = "Tucano Coffee Iulius Town – Besplatna kava", Description = "Besplatna specialty kava za dolazak biciklom, pješke ili JPP-om (kod: TUCANO-GREEN)", PointsCost = 80, IsActive = true }
            };
            foreach (var er in extraRewards)
            {
                if (!existingRewards.Contains(er.Name))
                {
                    db.Rewards.Add(er);
                }
            }
            await db.SaveChangesAsync(ct);
        }

        // 5. GTFS javni prijevoz (Routes, Stops, TransitTrips, StopTimes) u MySQL
        if (!await db.Routes.AnyAsync(ct))
        {
            var routes = new List<TransitRoute>
            {
                new() { GtfsRouteId = "R_TV_1", ShortName = "Tram 1", LongName = "Gara de Nord – Piața Victoriei – Piața Traian – AEM", RouteType = 0, Color = "E3A900" },
                new() { GtfsRouteId = "R_TV_2", ShortName = "Tram 2", LongName = "Calea Șagului (Shopping City) – Centru – Piața Traian", RouteType = 0, Color = "005BBC" },
                new() { GtfsRouteId = "R_TV_6", ShortName = "Tram 6", LongName = "Piața Maria – Centru – Complexul Studențesc – Banatim", RouteType = 0, Color = "16A34A" },
                new() { GtfsRouteId = "R_TB_14", ShortName = "Trolejbus 14", LongName = "Gara de Nord – Centru – Iulius Town – Ion Ionescu de la Brad", RouteType = 11, Color = "2563EB" },
                new() { GtfsRouteId = "R_TB_16", ShortName = "Trolejbus 16", LongName = "Bd. Sudului – Complexul Studențesc – UPT – Gara de Nord", RouteType = 11, Color = "9333EA" },
                new() { GtfsRouteId = "R_BUS_E2", ShortName = "Expres E2", LongName = "Calea Șagului – UPT – Centru – Iulius Town – Continental", RouteType = 3, Color = "DC2626" },
                new() { GtfsRouteId = "R_VAP_1", ShortName = "Vaporetto V1", LongName = "Canalul Bega: Mihai Viteazul – Catedrala – Uzina de Apă", RouteType = 4, Color = "0284C7" }
            };
            db.Routes.AddRange(routes);
            await db.SaveChangesAsync(ct);

            var stops = new List<Stop>();
            foreach (var ts in TimisoaraPublicData.TransitStops)
            {
                stops.Add(new Stop
                {
                    GtfsStopId = ts.Id,
                    Name = ts.Name,
                    Latitude = ts.Lat,
                    Longitude = ts.Lng
                });
            }
            db.Stops.AddRange(stops);
            await db.SaveChangesAsync(ct);

            // Kreiraj vožnje (TransitTrips) i vozni red (StopTimes) svakih 15 min od 06:00 do 23:00
            var trips = new List<TransitTrip>();
            foreach (var route in routes)
            {
                trips.Add(new TransitTrip
                {
                    GtfsTripId = $"TRIP_{route.GtfsRouteId}_DIR0",
                    TransitRouteId = route.Id,
                    ServiceId = "WKD_2026",
                    Headsign = route.LongName?.Split('–').LastOrDefault()?.Trim() ?? "Centru",
                    DirectionId = 0
                });
                trips.Add(new TransitTrip
                {
                    GtfsTripId = $"TRIP_{route.GtfsRouteId}_DIR1",
                    TransitRouteId = route.Id,
                    ServiceId = "WKD_2026",
                    Headsign = route.LongName?.Split('–').FirstOrDefault()?.Trim() ?? "Gara de Nord",
                    DirectionId = 1
                });
            }
            db.TransitTrips.AddRange(trips);
            await db.SaveChangesAsync(ct);

            var stopTimes = new List<StopTime>();
            int[] baseHours = { 7, 8, 9, 12, 15, 17, 18, 20, 22 };
            foreach (var trip in trips)
            {
                for (int seq = 0; seq < stops.Count; seq++)
                {
                    var stop = stops[seq];
                    var arr = new TimeSpan(baseHours[seq % baseHours.Length], (seq * 7 + trip.Id * 3) % 60, 0);
                    stopTimes.Add(new StopTime
                    {
                        TransitTripId = trip.Id,
                        StopId = stop.Id,
                        StopSequence = seq + 1,
                        ArrivalTime = arr,
                        DepartureTime = arr.Add(TimeSpan.FromMinutes(1))
                    });
                }
            }
            db.StopTimes.AddRange(stopTimes);
            await db.SaveChangesAsync(ct);
        }

        // 6. Carpool oglasi u Timișoari (sat 24–38)
        if (!await db.CarpoolRides.AnyAsync(ct))
        {
            var now = DateTime.UtcNow;
            db.CarpoolRides.AddRange(
                new CarpoolRide
                {
                    DriverId = vlad?.Id,
                    DriverName = vlad?.DisplayName ?? "Vlad Dumitru (Continental)",
                    OriginName = "Calea Șagului / Shopping City",
                    OriginLatitude = 45.7315,
                    OriginLongitude = 21.2125,
                    DestinationName = "Iulius Town / UBC Business Center",
                    DestinationLatitude = 45.7660,
                    DestinationLongitude = 21.2288,
                    DepartureTime = now.AddMinutes(45),
                    TotalSeats = 3,
                    AvailableSeats = 2,
                    DistanceKm = 5.4,
                    EstimatedFuelCostPerKmRon = 0.55m,
                    RecommendedPricePerSeatRon = 1.50m,
                    WheelchairFriendly = false,
                    Notes = "Svakodnevni polazak prema Iulius Townu; prolazim pokraj Politehnice (UPT). Informativna podjela goriva bez naplate.",
                    IsActive = true
                },
                new CarpoolRide
                {
                    DriverId = vlad?.Id,
                    DriverName = "Andrei Munteanu (AEM / Buziașului)",
                    OriginName = "Complexul Studențesc / UVT",
                    OriginLatitude = 45.7488,
                    OriginLongitude = 21.2392,
                    DestinationName = "Calea Buziașului – Zona Industrială SE",
                    DestinationLatitude = 45.7365,
                    DestinationLongitude = 21.2625,
                    DepartureTime = now.AddHours(1).AddMinutes(15),
                    TotalSeats = 4,
                    AvailableSeats = 3,
                    DistanceKm = 3.8,
                    EstimatedFuelCostPerKmRon = 0.55m,
                    RecommendedPricePerSeatRon = 1.50m,
                    WheelchairFriendly = false,
                    Notes = "Idem u smjenu prema industrijskoj zoni Calea Buziașului (gdje nema biciklističke staze).",
                    IsActive = true
                },
                new CarpoolRide
                {
                    DriverId = marko?.Id,
                    DriverName = "Sorin Lazăr (Pristupačni kombi / Sklopiva kolica)",
                    OriginName = "Gara Timișoara Nord",
                    OriginLatitude = 45.7508,
                    OriginLongitude = 21.2080,
                    DestinationName = "Universitatea de Vest (UVT) / Spitalul Județean",
                    DestinationLatitude = 45.7478,
                    DestinationLongitude = 21.2316,
                    DepartureTime = now.AddHours(2),
                    TotalSeats = 3,
                    AvailableSeats = 2,
                    DistanceKm = 3.6,
                    EstimatedFuelCostPerKmRon = 0.55m,
                    RecommendedPricePerSeatRon = 1.50m,
                    WheelchairFriendly = true,
                    Notes = "Prilagođeno vozilo s rampom i prostorom za invalidska kolica (0 RON za osobe s invaliditetom).",
                    IsActive = true
                },
                new CarpoolRide
                {
                    DriverId = ana?.Id,
                    DriverName = "Diana Toma (USAMVBT / Aradului)",
                    OriginName = "Calea Aradului / Torontalului",
                    OriginLatitude = 45.7745,
                    OriginLongitude = 21.2135,
                    DestinationName = "Piața Victoriei / Politehnica (UPT)",
                    DestinationLatitude = 45.7474,
                    DestinationLongitude = 21.2263,
                    DepartureTime = now.AddHours(3),
                    TotalSeats = 3,
                    AvailableSeats = 3,
                    DistanceKm = 4.2,
                    EstimatedFuelCostPerKmRon = 0.55m,
                    RecommendedPricePerSeatRon = 1.50m,
                    WheelchairFriendly = false,
                    Notes = "Jutarnja vožnja za studente sa sjevera prema centru i Politehnici.",
                    IsActive = true
                }
            );
            await db.SaveChangesAsync(ct);
        }

        // 7. Povijest putovanja (TripHistories) i transakcije bodova (PointTransactions) za demo račune
        if (ana is not null && !await db.TripHistories.AnyAsync(t => t.UserId == ana.Id, ct))
        {
            var t1 = new TripHistory
            {
                UserId = ana.Id,
                Mode = EcoMutare.Domain.Entities.TransportMode.Bike,
                OriginName = "Complexul Studențesc",
                DestinationName = "Universitatea Politehnica (UPT)",
                OriginLatitude = 45.7488,
                OriginLongitude = 21.2392,
                DestinationLatitude = 45.7474,
                DestinationLongitude = 21.2263,
                DistanceKm = 1.8,
                DurationMinutes = 8,
                Co2SavedGrams = 216.0,
                PointsEarned = 21,
                StartedAt = DateTime.UtcNow.AddDays(-2),
                EndedAt = DateTime.UtcNow.AddDays(-2).AddMinutes(8)
            };
            var t2 = new TripHistory
            {
                UserId = ana.Id,
                Mode = EcoMutare.Domain.Entities.TransportMode.Tram,
                OriginName = "Piața Victoriei",
                DestinationName = "Gara Timișoara Nord",
                OriginLatitude = 45.7537,
                OriginLongitude = 21.2257,
                DestinationLatitude = 45.7508,
                DestinationLongitude = 21.2080,
                DistanceKm = 2.3,
                DurationMinutes = 11,
                Co2SavedGrams = 207.0,
                PointsEarned = 20,
                StartedAt = DateTime.UtcNow.AddDays(-1),
                EndedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(11)
            };
            db.TripHistories.AddRange(t1, t2);
            await db.SaveChangesAsync(ct);

            db.PointTransactions.AddRange(
                new PointTransaction { UserId = ana.Id, Points = 250, Type = PointTransactionType.Bonus, Description = "Početni eko-bonus za održivu mobilnost" },
                new PointTransaction { UserId = ana.Id, Points = 21, Type = PointTransactionType.Earned, Description = "Vožnja biciklom: Complex → UPT", TripHistoryId = t1.Id },
                new PointTransaction { UserId = ana.Id, Points = 20, Type = PointTransactionType.Earned, Description = "STPT Tramvaj 1: Victoriei → Gara de Nord", TripHistoryId = t2.Id },
                new PointTransaction { UserId = ana.Id, Points = 29, Type = PointTransactionType.Bonus, Description = "Waze prijava i potvrda biciklističke staze" }
            );
            await db.SaveChangesAsync(ct);
        }

        if (marko is not null && !await db.TripHistories.AnyAsync(t => t.UserId == marko.Id, ct))
        {
            var tm = new TripHistory
            {
                UserId = marko.Id,
                Mode = EcoMutare.Domain.Entities.TransportMode.Tram,
                OriginName = "Piața Victoriei (Niskopodna stanica)",
                DestinationName = "Universitatea de Vest (UVT)",
                OriginLatitude = 45.7537,
                OriginLongitude = 21.2257,
                DestinationLatitude = 45.7478,
                DestinationLongitude = 21.2316,
                DistanceKm = 1.9,
                DurationMinutes = 9,
                Co2SavedGrams = 171.0,
                PointsEarned = 17,
                StartedAt = DateTime.UtcNow.AddHours(-18),
                EndedAt = DateTime.UtcNow.AddHours(-18).AddMinutes(9)
            };
            db.TripHistories.Add(tm);
            await db.SaveChangesAsync(ct);

            db.PointTransactions.AddRange(
                new PointTransaction { UserId = marko.Id, Points = 418, Type = PointTransactionType.Bonus, Description = "Eko-ambasador pristupačnosti Timișoara" },
                new PointTransaction { UserId = marko.Id, Points = 17, Type = PointTransactionType.Earned, Description = "Niskopodni STPT prijevoz: Victoriei → UVT", TripHistoryId = tm.Id },
                new PointTransaction { UserId = marko.Id, Points = 15, Type = PointTransactionType.Bonus, Description = "Waze prijava nedostupnog rubnjaka (Piața Maria)" }
            );
            await db.SaveChangesAsync(ct);
        }

        // 8. Sinkroniziraj 500m GapCells u MySQL
        if (!await db.GapCells.AnyAsync(ct))
        {
            var cells = insights.CalculateGapCells();
            for (int i = 0; i < cells.Count; i++)
            {
                var c = cells[i];
                db.GapCells.Add(new GapCell
                {
                    GridX = i % 4,
                    GridY = i / 4,
                    CenterLatitude = c.Center.Lat,
                    CenterLongitude = c.Center.Lng,
                    CellSizeMeters = 500,
                    StopCount = 2,
                    StationCount = 1,
                    ParkingCount = 1,
                    GapScore = c.GapScore,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            await db.SaveChangesAsync(ct);
        }

        logger.LogInformation("DatabaseSeeder završio: demo korisnici, GTFS, stanice, parkinzi, Carpool, Waze prijave i GapCells su spremni u MySQL bazi.");
    }

    /// <summary>
    /// Ako je MySQL baza bila kreirana ranijom verzijom modela (prije dodavanja Carpool, Waze i profilnih kolona),
    /// sigurno dodaje nove tablice i kolone bez brisanja postojećih podataka.
    /// </summary>
    private static async Task EnsureSchemaUpgradesAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        var statements = new[]
        {
            "ALTER TABLE `Users` ADD COLUMN `BirthDate` datetime(6) NULL;",
            "ALTER TABLE `Users` ADD COLUMN `AgeCategory` varchar(20) NOT NULL DEFAULT 'Adult';",
            "ALTER TABLE `Users` ADD COLUMN `HasDisability` tinyint(1) NOT NULL DEFAULT 0;",
            "ALTER TABLE `Users` ADD COLUMN `OwnsBike` tinyint(1) NOT NULL DEFAULT 0;",
            "ALTER TABLE `Users` ADD COLUMN `OwnsScooter` tinyint(1) NOT NULL DEFAULT 0;",
            "ALTER TABLE `Users` ADD COLUMN `OwnsCar` tinyint(1) NOT NULL DEFAULT 0;",
            @"CREATE TABLE IF NOT EXISTS `CarpoolRides` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `DriverId` int NULL,
                `DriverName` varchar(100) NOT NULL DEFAULT '',
                `OriginName` varchar(150) NOT NULL DEFAULT '',
                `OriginLatitude` double NOT NULL DEFAULT 0,
                `OriginLongitude` double NOT NULL DEFAULT 0,
                `DestinationName` varchar(150) NOT NULL DEFAULT '',
                `DestinationLatitude` double NOT NULL DEFAULT 0,
                `DestinationLongitude` double NOT NULL DEFAULT 0,
                `DepartureTime` datetime(6) NOT NULL,
                `TotalSeats` int NOT NULL DEFAULT 3,
                `AvailableSeats` int NOT NULL DEFAULT 3,
                `DistanceKm` double NOT NULL DEFAULT 0,
                `EstimatedFuelCostPerKmRon` decimal(8,2) NOT NULL DEFAULT 0.55,
                `RecommendedPricePerSeatRon` decimal(8,2) NOT NULL DEFAULT 1.50,
                `WheelchairFriendly` tinyint(1) NOT NULL DEFAULT 0,
                `Notes` varchar(300) NULL,
                `IsActive` tinyint(1) NOT NULL DEFAULT 1,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;",
            @"CREATE TABLE IF NOT EXISTS `CarpoolBookings` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `CarpoolRideId` int NOT NULL,
                `PassengerId` int NULL,
                `PassengerName` varchar(100) NOT NULL DEFAULT '',
                `SeatsBooked` int NOT NULL DEFAULT 1,
                `Co2SavedGrams` double NOT NULL DEFAULT 0,
                `PointsEarned` int NOT NULL DEFAULT 0,
                `BookedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;",
            @"CREATE TABLE IF NOT EXISTS `CommunityReports` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `Category` varchar(40) NOT NULL,
                `Title` varchar(160) NOT NULL DEFAULT '',
                `Description` varchar(600) NOT NULL DEFAULT '',
                `StreetOrZone` varchar(150) NOT NULL DEFAULT '',
                `Latitude` double NOT NULL DEFAULT 0,
                `Longitude` double NOT NULL DEFAULT 0,
                `AffectedModesCsv` varchar(120) NOT NULL DEFAULT '',
                `AffectsWheelchair` tinyint(1) NOT NULL DEFAULT 0,
                `ConfirmationsCount` int NOT NULL DEFAULT 1,
                `ResolvedVotesCount` int NOT NULL DEFAULT 0,
                `IsActive` tinyint(1) NOT NULL DEFAULT 1,
                `Source` varchar(100) NOT NULL DEFAULT '',
                `ExternalSesizariId` varchar(60) NULL,
                `OfficialActionUrl` varchar(255) NOT NULL DEFAULT '',
                `ReportedByUserId` int NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;",
            @"CREATE TABLE IF NOT EXISTS `FavoriteRoutes` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `UserId` int NULL,
                `Name` varchar(120) NOT NULL DEFAULT '',
                `OriginName` varchar(120) NOT NULL DEFAULT '',
                `OriginLat` double NOT NULL DEFAULT 0,
                `OriginLng` double NOT NULL DEFAULT 0,
                `DestinationName` varchar(120) NOT NULL DEFAULT '',
                `DestinationLat` double NOT NULL DEFAULT 0,
                `DestinationLng` double NOT NULL DEFAULT 0,
                `PreferredMode` varchar(30) NOT NULL DEFAULT 'Bike',
                `WeeklyFrequency` int NOT NULL DEFAULT 5,
                `MissingBikeLaneOnRoute` tinyint(1) NOT NULL DEFAULT 0,
                `RequiresStepFreeAccess` tinyint(1) NOT NULL DEFAULT 0,
                `Notes` varchar(300) NOT NULL DEFAULT '',
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;"
        };

        foreach (var sql in statements)
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(sql, ct);
            }
            catch
            {
                // Ignoriraj ako kolona ili tablica već postoji
            }
        }
    }
}
