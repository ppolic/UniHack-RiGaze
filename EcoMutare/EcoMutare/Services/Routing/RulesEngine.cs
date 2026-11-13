using EcoMutare.Domain;
using EcoMutare.Dtos;

namespace EcoMutare.Services.Routing;

public class RuleEvaluationResult
{
    public bool Allowed { get; init; } = true;
    public string? DeniedReason { get; init; }
    public List<RouteWarningDto> Warnings { get; init; } = new();

    public static RuleEvaluationResult Deny(string reason) => new()
    {
        Allowed = false,
        DeniedReason = reason
    };
}

public interface IRulesEngine
{
    RuleEvaluationResult Evaluate(
        UserProfileDto profile,
        TransportMode mode,
        WeatherInfoDto weather,
        RoutingResult? route = null);
}

/// <summary>
/// Čisti servis bez mrežnih poziva koji provodi prometne zakone, dobna ograničenja,
/// pravila za osobe s invaliditetom, pokrivenost biciklističkim stazama te vremenske i reljefne uvjete.
/// </summary>
public class RulesEngine : IRulesEngine
{
    public RuleEvaluationResult Evaluate(
        UserProfileDto profile,
        TransportMode mode,
        WeatherInfoDto weather,
        RoutingResult? route = null)
    {
        // 1. Zakonska dobna ograničenja
        if (profile.AgeCategory == AgeCategory.Under14)
        {
            if (mode is TransportMode.Bike or TransportMode.Scooter or TransportMode.Combined)
            {
                return RuleEvaluationResult.Deny("Zakon: Osobe mlađe od 14 godina ne smiju voziti bicikl ni e-romobil na javnim prometnicama.");
            }
            if (mode == TransportMode.Car && !profile.HasDisability)
            {
                return RuleEvaluationResult.Deny("Zakon: Osobe mlađe od 18 godina ne smiju upravljati osobnim vozilom.");
            }
        }

        if (profile.AgeCategory == AgeCategory.From14To15 && mode == TransportMode.Car && !profile.HasDisability)
        {
            return RuleEvaluationResult.Deny("Zakon: Maloljetne osobe (14–15 god.) ne smiju upravljati osobnim vozilom.");
        }

        // 2. Pristupačnost za osobe s invaliditetom: preskače pješačenje cijelom rutom, bicikl i romobil;
        // nudi samo javni prijevoz s pristupom za invalide i vožnje (uklj. invalidska parkirna mjesta).
        if (profile.HasDisability && mode is TransportMode.Walk or TransportMode.Bike or TransportMode.Scooter or TransportMode.Combined)
        {
            return RuleEvaluationResult.Deny("Pristupačnost: Za osobe s invaliditetom nude se isključivo pristupačni javni prijevoz i prilagođene vožnje.");
        }

        // 3. Ekstremni vremenski uvjeti (snijeg isključuje bicikl i romobil)
        if (weather.Condition == WeatherCondition.Snow && mode is TransportMode.Bike or TransportMode.Scooter)
        {
            return RuleEvaluationResult.Deny("Sigurnost: Zbog snijega na kolniku vožnja biciklom i romobilom nije sigurna.");
        }

        var warnings = new List<RouteWarningDto>();

        // 4. Obavezna kaciga za 14–15 godina
        if (profile.AgeCategory == AgeCategory.From14To15 &&
            mode is TransportMode.Bike or TransportMode.Scooter or TransportMode.Combined)
        {
            warnings.Add(new RouteWarningDto
            {
                Type = WarningType.Helmet,
                Message = "Zakon (14–15 god.): Nošenje zaštitne kacige je obavezno tijekom vožnje bicikla ili romobila."
            });
        }

        // 5. Vremenska upozorenja (kiša, hladnoća, vjetar) za otvorena prijevozna sredstva
        if (mode is TransportMode.Bike or TransportMode.Scooter)
        {
            switch (weather.Condition)
            {
                case WeatherCondition.Rain:
                    warnings.Add(new RouteWarningDto
                    {
                        Type = WarningType.Rain,
                        Message = $"Kiša ({weather.PrecipitationMm:F1} mm/h): kolnik je mokar i sklizak, preporučujemo javni prijevoz ili kombiniranu rutu."
                    });
                    break;
                case WeatherCondition.Cold:
                    warnings.Add(new RouteWarningDto
                    {
                        Type = WarningType.Cold,
                        Message = $"Niska temperatura ({weather.TemperatureC:F1} °C): nepovoljni uvjeti za vožnju bicikla ili romobila."
                    });
                    break;
                case WeatherCondition.Windy:
                    warnings.Add(new RouteWarningDto
                    {
                        Type = WarningType.Windy,
                        Message = "Jak vjetar: otežana stabilnost na biciklu i romobilu."
                    });
                    break;
            }
        }

        // 6. Provjera nagiba / uzbrdica i biciklističkih staza iz geometrije rute
        if (route is not null)
        {
            if (mode is TransportMode.Bike or TransportMode.Scooter or TransportMode.Walk &&
                (route.AverageGradePercent > 5.0 || route.AscentMeters > 60.0))
            {
                warnings.Add(new RouteWarningDto
                {
                    Type = WarningType.Slope,
                    Message = $"Zahtjevna ruta: ukupan uspon {route.AscentMeters:F0} m (prosječni nagib {route.AverageGradePercent:F1}%)."
                });
            }

            if (mode is TransportMode.Bike or TransportMode.Scooter && route.BikeLaneShare.HasValue)
            {
                var share = route.BikeLaneShare.Value;
                var pct = (int)Math.Round(share * 100);
                if (share < 0.30)
                {
                    warnings.Add(new RouteWarningDto
                    {
                        Type = WarningType.NoBikeLane,
                        Message = $"Green Intelligence: Samo {pct}% rute ima označenu biciklističku stazu (piste de biciclete). Preporučujemo kombinaciju bicikla i STPT prijevoza."
                    });
                }
                else if (share < 0.65)
                {
                    warnings.Add(new RouteWarningDto
                    {
                        Type = WarningType.NoBikeLane,
                        Message = $"Dio rute ({100 - pct}%) nema označenu biciklističku stazu – obavezno korištenje dostupnih bike lane koridora."
                    });
                }
            }
        }

        return new RuleEvaluationResult
        {
            Allowed = true,
            Warnings = warnings
        };
    }
}
