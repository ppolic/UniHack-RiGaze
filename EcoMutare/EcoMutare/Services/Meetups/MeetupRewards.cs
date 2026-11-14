using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Services.Meetups;

/// Zajednička pravila bodovanja za BikeShare i WalkBuddy.
/// Bodovi i CO₂ računaju se kao za običnu vožnju/šetnju (CarbonCalculator), uz bonuse za druženje:
///   sudionik: + ParticipantBonusPoints; organizator: + OrganizerBonusPerParticipant po sudioniku (najviše OrganizerBonusCap).
/// Dodjeljuje se samo pri završetku (complete) i samo ako je bar jedan sudionik došao — vožnja/šetnja sama ne donosi bodove.

public static class MeetupRewards
{
    public const int ParticipantBonusPoints = 10;
    public const int OrganizerBonusPerParticipant = 5;
    public const int OrganizerBonusCap = 25;

    /// Dodaje TripHistory i PointTransaction te atomarno povećava PointsBalance.
    /// Poziva se unutar transakcije pozivatelja; poziv SaveChangesAsync ostaje na pozivatelju.

    public static async Task AwardAsync(
        AppDbContext db, int userId, TransportMode mode,
        string originName, double originLat, double originLng,
        string destinationName, double destLat, double destLng,
        double distanceKm, int durationMinutes, double co2SavedGrams, int points,
        DateTime startedAt, string description, CancellationToken ct)
    {
        var trip = new TripHistory
        {
            UserId = userId,
            Mode = mode,
            OriginName = originName,
            DestinationName = destinationName,
            OriginLatitude = originLat,
            OriginLongitude = originLng,
            DestinationLatitude = destLat,
            DestinationLongitude = destLng,
            DistanceKm = distanceKm,
            DurationMinutes = durationMinutes,
            Co2SavedGrams = co2SavedGrams,
            PointsEarned = points,
            StartedAt = startedAt,
            EndedAt = startedAt.AddMinutes(durationMinutes)
        };
        db.TripHistories.Add(trip);

        if (points > 0)
        {
            db.PointTransactions.Add(new PointTransaction
            {
                UserId = userId,
                Points = points,
                Type = PointTransactionType.Earned,
                Description = description,
                TripHistory = trip
            });

            await db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.PointsBalance, u => u.PointsBalance + points), ct);
        }
    }
}
