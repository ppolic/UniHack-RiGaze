namespace EcoMutare.Domain.Entities;

/// <summary>Stanje zajedničke vožnje (BikeShare) ili šetnje (WalkBuddy).</summary>
public enum MeetupStatus { Scheduled, Completed, Cancelled }

/// <summary>Razina vožnje: za koga je tura prikladna.</summary>
public enum RideLevel { Beginner, Intermediate, Advanced }

/// <summary>Tempo šetnje.</summary>
public enum WalkPace { Slow, Normal, Fast }
