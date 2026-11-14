using EcoMutare.Domain;
using EcoMutare.Domain.Entities;
using EcoMutare.Services.Auth;

namespace EcoMutare.Data;

/// <summary>
/// Ugrađeni thread-safe fallback spremnik u memoriji kad MySQL server nije pokrenut.
/// Omogućuje da prijava (/auth/*), spremanje/povijest putovanja (/trips),
/// katalog i otkup nagrada (/rewards) te bodovi (/points) rade end-to-end i bez baze.
/// </summary>
public static class InMemoryFallbackStore
{
    private static readonly object Sync = new();
    private static readonly List<User> Users;
    private static readonly List<Reward> Rewards;
    private static readonly List<TripHistory> Trips;
    private static readonly List<PointTransaction> Transactions;

    private static int _nextUserId = 6;
    private static int _nextTripId = 4;
    private static int _nextTxnId = 8;

    static InMemoryFallbackStore()
    {
        var demoHash = PasswordHelper.Hash("Demo123!");
        Users = new List<User>
        {
            new()
            {
                Id = 1,
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
                Id = 2,
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
                Id = 3,
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
                Id = 4,
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
                Id = 5,
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

        Rewards = new List<Reward>
        {
            new() { Id = 1, Name = "Besplatna karta za javni prijevoz", Description = "Jednokratna karta", PointsCost = 100, IsActive = true },
            new() { Id = 2, Name = "Popust na kavu", Description = "10% popusta kod partnera", PointsCost = 50, IsActive = true },
            new() { Id = 3, Name = "Besplatna vožnja romobilom", Description = "30 minuta", PointsCost = 150, IsActive = true },
            new() { Id = 4, Name = "STPT Dnevna karta (Tramvaj / Bus / Vaporetto)", Description = "Cjelodnevna vožnja svim linijama javnog prijevoza u Timișoari (kod: STPT-ECO-2026)", PointsCost = 120, IsActive = true },
            new() { Id = 5, Name = "VeloTM – 3 besplatna otključavanja bicikla", Description = "Voucher za sustav javnih bicikala VeloTM (kod: VELOTM-FREE3)", PointsCost = 60, IsActive = true },
            new() { Id = 6, Name = "Tucano Coffee Iulius Town – Besplatna kava", Description = "Besplatna specialty kava za dolazak biciklom, pješke ili JPP-om (kod: TUCANO-GREEN)", PointsCost = 80, IsActive = true }
        };

        Trips = new List<TripHistory>
        {
            new()
            {
                Id = 1,
                UserId = 1,
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
            },
            new()
            {
                Id = 2,
                UserId = 1,
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
            },
            new()
            {
                Id = 3,
                UserId = 2,
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
            }
        };

        Transactions = new List<PointTransaction>
        {
            new() { Id = 1, UserId = 1, Points = 250, Type = PointTransactionType.Bonus, Description = "Početni eko-bonus za održivu mobilnost", CreatedAt = DateTime.UtcNow.AddDays(-3) },
            new() { Id = 2, UserId = 1, Points = 21, Type = PointTransactionType.Earned, Description = "Vožnja biciklom: Complex → UPT", TripHistoryId = 1, CreatedAt = DateTime.UtcNow.AddDays(-2) },
            new() { Id = 3, UserId = 1, Points = 20, Type = PointTransactionType.Earned, Description = "STPT Tramvaj 1: Victoriei → Gara de Nord", TripHistoryId = 2, CreatedAt = DateTime.UtcNow.AddDays(-1) },
            new() { Id = 4, UserId = 1, Points = 29, Type = PointTransactionType.Bonus, Description = "Prijava i potvrda biciklističke staze u zajednici", CreatedAt = DateTime.UtcNow.AddHours(-12) },
            new() { Id = 5, UserId = 2, Points = 418, Type = PointTransactionType.Bonus, Description = "Eko-ambasador pristupačnosti Timișoara", CreatedAt = DateTime.UtcNow.AddDays(-3) },
            new() { Id = 6, UserId = 2, Points = 17, Type = PointTransactionType.Earned, Description = "Niskopodni STPT prijevoz: Victoriei → UVT", TripHistoryId = 3, CreatedAt = DateTime.UtcNow.AddHours(-18) },
            new() { Id = 7, UserId = 2, Points = 15, Type = PointTransactionType.Bonus, Description = "Prijava nedostupnog rubnjaka u zajednici (Piața Maria)", CreatedAt = DateTime.UtcNow.AddHours(-10) }
        };
    }

    public static List<User> GetAllUsers()
    {
        lock (Sync) return Users.OrderBy(u => u.Id).ToList();
    }

    public static User? FindUserByEmail(string email)
    {
        var norm = email.Trim().ToLowerInvariant();
        lock (Sync) return Users.FirstOrDefault(u => u.Email == norm);
    }

    public static User? FindUserById(int id)
    {
        lock (Sync) return Users.FirstOrDefault(u => u.Id == id);
    }

    public static User CreateUser(User user)
    {
        lock (Sync)
        {
            user.Id = _nextUserId++;
            Users.Add(user);
            if (user.PointsBalance > 0)
            {
                Transactions.Add(new PointTransaction
                {
                    Id = _nextTxnId++,
                    UserId = user.Id,
                    Points = user.PointsBalance,
                    Type = PointTransactionType.Bonus,
                    Description = "Bonus dobrodošlice za registraciju u BeGreen Timișoara",
                    CreatedAt = DateTime.UtcNow
                });
            }
            return user;
        }
    }

    public static User? UpdateUser(int userId, Action<User> updater)
    {
        lock (Sync)
        {
            var user = Users.FirstOrDefault(u => u.Id == userId);
            if (user is null) return null;
            updater(user);
            return user;
        }
    }

    public static (User user, bool alreadyEnrolled)? EnrollPasskey(int userId)
    {
        lock (Sync)
        {
            var user = Users.FirstOrDefault(u => u.Id == userId);
            if (user is null) return null;

            const string passkeyTag = "[PasskeyEnrolled]";
            bool already = Transactions.Any(t => t.UserId == userId && t.Description != null && t.Description.Contains(passkeyTag));
            if (!already)
            {
                user.PointsBalance += 25;
                Transactions.Add(new PointTransaction
                {
                    Id = _nextTxnId++,
                    UserId = user.Id,
                    Points = 25,
                    Type = PointTransactionType.Bonus,
                    Description = $"{passkeyTag} Aktivirana Auth0 Passkey (WebAuthn) biometrijska prijava bez lozinke",
                    CreatedAt = DateTime.UtcNow
                });
            }
            return (user, already);
        }
    }

    public static List<TripHistory> GetTripsForUser(int userId)
    {
        lock (Sync) return Trips.Where(t => t.UserId == userId).OrderByDescending(t => t.StartedAt).ThenByDescending(t => t.Id).ToList();
    }

    public static (TripHistory? trip, int newBalance) AddTrip(TripHistory trip)
    {
        lock (Sync)
        {
            var user = Users.FirstOrDefault(u => u.Id == trip.UserId);
            if (user is null) return (null, 0);

            trip.Id = _nextTripId++;
            Trips.Add(trip);

            if (trip.PointsEarned > 0)
            {
                user.PointsBalance += trip.PointsEarned;
                Transactions.Add(new PointTransaction
                {
                    Id = _nextTxnId++,
                    UserId = user.Id,
                    Points = trip.PointsEarned,
                    Type = PointTransactionType.Earned,
                    Description = $"Putovanje: {trip.Mode}, {trip.DistanceKm:0.##} km",
                    TripHistoryId = trip.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

            return (trip, user.PointsBalance);
        }
    }

    public static List<Reward> GetRewards(bool includeInactive)
    {
        lock (Sync)
        {
            var q = Rewards.AsEnumerable();
            if (!includeInactive) q = q.Where(r => r.IsActive);
            return q.OrderBy(r => r.PointsCost).ToList();
        }
    }

    public static Reward? GetRewardById(int id)
    {
        lock (Sync) return Rewards.FirstOrDefault(r => r.Id == id);
    }

    public static (string status, int newBalance, PointTransaction? txn) RedeemReward(int userId, Reward reward, TimeSpan duplicateWindow)
    {
        lock (Sync)
        {
            var user = Users.FirstOrDefault(u => u.Id == userId);
            if (user is null) return ("unauthorized", 0, null);

            var since = DateTime.UtcNow - duplicateWindow;
            bool duplicate = Transactions.Any(t =>
                t.UserId == userId && t.RewardId == reward.Id && t.Type == PointTransactionType.Redeemed && t.CreatedAt > since);
            if (duplicate) return ("duplicate", user.PointsBalance, null);

            if (user.PointsBalance < reward.PointsCost) return ("insufficient", user.PointsBalance, null);

            user.PointsBalance -= reward.PointsCost;
            var txn = new PointTransaction
            {
                Id = _nextTxnId++,
                UserId = user.Id,
                Points = -reward.PointsCost,
                Type = PointTransactionType.Redeemed,
                RewardId = reward.Id,
                Description = $"Otkup: {reward.Name}",
                CreatedAt = DateTime.UtcNow
            };
            Transactions.Add(txn);
            return ("ok", user.PointsBalance, txn);
        }
    }

    public static (int balance, List<PointTransaction> txns) GetPointsForUser(int userId)
    {
        lock (Sync)
        {
            var user = Users.FirstOrDefault(u => u.Id == userId);
            var txns = Transactions.Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ThenByDescending(t => t.Id)
                .ToList();
            return (user?.PointsBalance ?? 0, txns);
        }
    }
}
