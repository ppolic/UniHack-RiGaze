using EcoMutare.Domain.Entities;

namespace EcoMutare.Services.Meetups;

/// Tko smije organizirati ili se prijaviti na zajedničku vožnju/šetnju.
/// Pravila su ista kao u RulesEngine-u planera ruta:
///   - osobe s invaliditetom (HasDisability, npr. korisnici invalidskih kolica): bez bicikla i bez pješačenja,
///   - osobe mlađe od 14 godina: bez bicikla (zakon).
/// Vraća tekst razloga ako je zabranjeno, a null ako je dopušteno.
public static class MeetupEligibility
{
    public const string DisabilityMessage =
        "Pristupačnost: Za osobe s invaliditetom nude se isključivo pristupačni javni prijevoz i prilagođene vožnje.";

    public const string UnderFourteenBikeMessage =
        "Zakon: Osobe mlađe od 14 godina ne smiju voziti bicikl ni e-romobil na javnim prometnicama.";

    public static string? BikeShareDenial(User user)
    {
        if (user.HasDisability) return DisabilityMessage;
        if (user.AgeCategory == EcoMutare.Domain.AgeCategory.Under14) return UnderFourteenBikeMessage;
        return null;
    }

    public static string? WalkBuddyDenial(User user) =>
        user.HasDisability ? DisabilityMessage : null;
}
