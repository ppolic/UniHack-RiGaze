using System.Text.RegularExpressions;

namespace EcoMutare.Services.Community;

/// Pohrana fotografija uz građanske prijave (kamera u aplikaciji). Datoteke se spremaju na disk
/// (zadano: &lt;content root&gt;/uploads/reports, ili Uploads:ReportPhotosPath), a u bazi se čuva samo relativni URL.
///
/// Sigurnost: dopušteni su samo JPEG i PNG (provjera stvarnog sadržaja, ne samo naziva ni Content-Typea),
/// najviše 5 MB, a ime datoteke generira server (nasumični GUID), pa klijent ne može utjecati na putanju.
/// Napomena: metapodaci slike (EXIF, uključujući moguću GPS lokaciju) ostaju u datoteci; aplikacija ih
/// uklanja prije slanja (expo-image-manipulator), vidi dokumentaciju endpointa.

public class ReportPhotoStore
{
    public const long MaxBytes = 5 * 1024 * 1024;
    public const string UrlPrefix = "/reports/photos/";

    private static readonly Regex SafeName = new(@"^[a-f0-9]{32}\.(jpg|png)$", RegexOptions.Compiled);

    private readonly string _directory;
    private readonly ILogger<ReportPhotoStore> _logger;

    public ReportPhotoStore(IWebHostEnvironment env, IConfiguration config, ILogger<ReportPhotoStore> logger)
    {
        _logger = logger;
        var configured = config["Uploads:ReportPhotosPath"];
        _directory = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "uploads", "reports")
            : configured;
    }

    /// <summary>Provjerava veličinu i stvarni tip datoteke. Vraća null ako je u redu, inače poruku greške.</summary>
    public async Task<(string? Error, string Extension)> ValidateAsync(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return ("Fotografija nedostaje ili je prazna.", string.Empty);
        if (file.Length > MaxBytes)
            return ($"Fotografija je prevelika (najviše {MaxBytes / (1024 * 1024)} MB). Smanji kvalitetu prije slanja.", string.Empty);

        var header = new byte[8];
        await using (var stream = file.OpenReadStream())
        {
            int read = 0;
            while (read < header.Length)
            {
                int n = await stream.ReadAsync(header.AsMemory(read, header.Length - read), ct);
                if (n == 0) break;
                read += n;
            }
            if (read < header.Length)
                return ("Datoteka nije valjana slika.", string.Empty);
        }

        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return (null, ".jpg");
        if (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
            return (null, ".png");

        return ("Podržani su samo JPEG i PNG (HEIC/WebP nisu podržani).", string.Empty);
    }

    /// <summary>Sprema već provjerenu datoteku i vraća relativni URL (npr. /reports/photos/ab12....jpg).</summary>
    public async Task<string> SaveAsync(IFormFile file, string extension, CancellationToken ct)
    {
        Directory.CreateDirectory(_directory);
        var name = Guid.NewGuid().ToString("N") + extension;
        var path = Path.Combine(_directory, name);
        await using (var target = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(target, ct);
        }
        return UrlPrefix + name;
    }

    /// <summary>Briše datoteku na koju pokazuje URL (greške se samo zapisuju u log).</summary>
    public void TryDelete(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith(UrlPrefix, StringComparison.Ordinal)) return;
        var name = url[UrlPrefix.Length..];
        if (!SafeName.IsMatch(name)) return;
        try
        {
            var path = Path.Combine(_directory, name);
            if (File.Exists(path)) File.Delete(path);
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Brisanje stare fotografije prijave nije uspjelo: {Msg}", ex.Message);
        }
    }

    /// <summary>Pronalazi datoteku po nazivu (samo naziv oblika &lt;32 hex&gt;.jpg|png, bez putanja).</summary>
    public bool TryGetFile(string fileName, out string path, out string contentType)
    {
        path = string.Empty;
        contentType = string.Empty;
        if (!SafeName.IsMatch(fileName)) return false;

        var candidate = Path.Combine(_directory, fileName);
        if (!File.Exists(candidate)) return false;

        path = candidate;
        contentType = fileName.EndsWith(".png", StringComparison.Ordinal) ? "image/png" : "image/jpeg";
        return true;
    }
}
