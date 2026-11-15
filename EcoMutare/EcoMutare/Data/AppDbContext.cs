using EcoMutare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Station> Stations => Set<Station>();
    public DbSet<Parking> Parkings => Set<Parking>();
    public DbSet<TripHistory> TripHistories => Set<TripHistory>();
    public DbSet<Reward> Rewards => Set<Reward>();
    public DbSet<PointTransaction> PointTransactions => Set<PointTransaction>();
    public DbSet<Stop> Stops => Set<Stop>();
    public DbSet<TransitRoute> Routes => Set<TransitRoute>();
    public DbSet<TransitTrip> TransitTrips => Set<TransitTrip>();
    public DbSet<StopTime> StopTimes => Set<StopTime>();
    public DbSet<GapCell> GapCells => Set<GapCell>();

    // Sat 24–38: Carpool dijeljenje vožnje
    public DbSet<CarpoolRide> CarpoolRides => Set<CarpoolRide>();
    public DbSet<CarpoolBooking> CarpoolBookings => Set<CarpoolBooking>();

    // Waze-style građanske prijave (blokade cesta, nepristupačna područja, nedostajuće biciklističke staze)
    public DbSet<CommunityReport> CommunityReports => Set<CommunityReport>();

    // Favorite rute korisnika (svakodnevni commute + potražnja za biciklističkim stazama)
    public DbSet<FavoriteRoute> FavoriteRoutes => Set<FavoriteRoute>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // Users
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.AgeCategory).HasConversion<string>().HasMaxLength(20);
        });

        // Stations / Parkings
        b.Entity<Station>(e =>
        {
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => new { x.Latitude, x.Longitude });
        });
        b.Entity<Parking>(e =>
        {
            e.Property(x => x.HourlyPrice).HasPrecision(8, 2);
            e.HasIndex(x => new { x.Latitude, x.Longitude });
        });

        // TripHistories
        b.Entity<TripHistory>(e =>
        {
            e.Property(x => x.Mode).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.User).WithMany(u => u.TripHistories)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.StartedAt });
        });

        // PointTransactions
        b.Entity<PointTransaction>(e =>
        {
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.User).WithMany(u => u.PointTransactions)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.TripHistory).WithMany()
                .HasForeignKey(x => x.TripHistoryId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Reward).WithMany()
                .HasForeignKey(x => x.RewardId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
        });

        // Transit (GTFS-ready)
        b.Entity<Stop>(e =>
        {
            e.HasIndex(x => x.GtfsStopId).IsUnique();
            e.HasIndex(x => new { x.Latitude, x.Longitude });
        });
        b.Entity<TransitRoute>(e =>
        {
            e.ToTable("Routes");
            e.HasIndex(x => x.GtfsRouteId).IsUnique();
        });
        b.Entity<TransitTrip>(e =>
        {
            e.HasIndex(x => x.GtfsTripId).IsUnique();
            e.HasOne(x => x.TransitRoute).WithMany(r => r.Trips)
                .HasForeignKey(x => x.TransitRouteId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<StopTime>(e =>
        {
            e.HasOne(x => x.TransitTrip).WithMany(t => t.StopTimes)
                .HasForeignKey(x => x.TransitTripId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Stop).WithMany(s => s.StopTimes)
                .HasForeignKey(x => x.StopId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.TransitTripId, x.StopSequence }).IsUnique();
            e.HasIndex(x => new { x.StopId, x.ArrivalTime });
        });

        // GapCells
        b.Entity<GapCell>().HasIndex(x => new { x.GridX, x.GridY }).IsUnique();

        // CarpoolRides & CarpoolBookings
        b.Entity<CarpoolRide>(e =>
        {
            e.Property(x => x.EstimatedFuelCostPerKmRon).HasPrecision(8, 2);
            e.Property(x => x.RecommendedPricePerSeatRon).HasPrecision(8, 2);
            e.HasOne(x => x.Driver).WithMany()
                .HasForeignKey(x => x.DriverId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.IsActive, x.DepartureTime });
            e.HasIndex(x => new { x.OriginLatitude, x.OriginLongitude });
        });

        b.Entity<CarpoolBooking>(e =>
        {
            e.HasOne(x => x.CarpoolRide).WithMany(r => r.Bookings)
                .HasForeignKey(x => x.CarpoolRideId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Passenger).WithMany()
                .HasForeignKey(x => x.PassengerId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.CarpoolRideId, x.PassengerId });
        });

        // CommunityReports (Waze-style prijave)
        b.Entity<CommunityReport>(e =>
        {
            e.Property(x => x.Category).HasConversion<string>().HasMaxLength(40);
            e.HasIndex(x => new { x.IsActive, x.Category });
            e.HasIndex(x => new { x.Latitude, x.Longitude });
        });

        // FavoriteRoutes
        b.Entity<FavoriteRoute>(e =>
        {
            e.Property(x => x.PreferredMode).HasConversion<string>().HasMaxLength(30);
            e.HasOne(x => x.User).WithMany()
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.UserId);
        });

        // Minimalni seed (okvirne koordinate Timișoare)
        b.Entity<Reward>().HasData(
            new Reward { Id = 1, Name = "Bilet gratuit pentru transportul public", Description = "Bilet pentru o singură călătorie", PointsCost = 100, IsActive = true },
            new Reward { Id = 2, Name = "Reducere la cafea", Description = "10% reducere la parteneri", PointsCost = 50, IsActive = true },
            new Reward { Id = 3, Name = "Cursă gratuită cu trotineta electrică", Description = "30 de minute", PointsCost = 150, IsActive = true });

        b.Entity<Station>().HasData(
            new Station { Id = 1, Name = "Piața Victoriei (bike)", Type = StationType.Bike, Latitude = 45.7537, Longitude = 21.2257, Capacity = 10, AvailableUnits = 6, IsActive = true },
            new Station { Id = 2, Name = "Gara de Nord (scooter)", Type = StationType.Scooter, Latitude = 45.7500, Longitude = 21.2087, Capacity = 8, AvailableUnits = 5, IsActive = true });

        b.Entity<Parking>().HasData(
            new Parking { Id = 1, Name = "Parcare Centru", Address = "Centru, Timișoara", Latitude = 45.7520, Longitude = 21.2290, TotalSpaces = 120, FreeSpaces = 40, HourlyPrice = 3.00m, IsParkAndRide = false });
    }
}
