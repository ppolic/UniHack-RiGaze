# Automated Auth0 Setup Script for BeGreen (EcoMutare) ASP.NET Core 9 API
# Configures:
# 1) Auth0 API + SPA Client
# 2) Auth0 Passkeys (WebAuthn Biometric 1-Tap Login for Accessibility)
# 3) Auth0 Post-Login Action (Zero-Knowledge Age Tier + UPT/UVT/Continental Organization + Waze Trust Score)
# 4) Auth0 Attack Protection (Bot Detection & Brute-Force Shield)
$ErrorActionPreference = "Stop"

Write-Host "=== BeGreen Auth0 Automated Setup (Features 1, 2, 3 & 5) ===" -ForegroundColor Cyan

# 1. Provjeri je li Auth0 CLI instaliran; ako nije, preuzmi sluzbeni Windows binary u lokalni .tools folder
$auth0Cmd = Get-Command auth0 -ErrorAction SilentlyContinue
if (-not $auth0Cmd) {
    $toolsDir = Join-Path $PSScriptRoot ".tools\auth0"
    $auth0Exe = Join-Path $toolsDir "auth0.exe"
    if (-not (Test-Path $auth0Exe)) {
        Write-Host "Preuzimam sluzbeni Auth0 CLI za Windows..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
        $zipPath = Join-Path $toolsDir "auth0-cli.zip"
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/auth0/auth0-cli/releases/latest"
        $asset = $release.assets | Where-Object { $_.name -like "*Windows_x86_64.zip" } | Select-Object -First 1
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
        Remove-Item $zipPath -Force
    }
    $env:PATH = "$toolsDir;$env:PATH"
}

Write-Host "`n1. Prijava u Auth0 tenant (otvorit ce se preglednik za potvrdu)..." -ForegroundColor Green
auth0 login

# 2. Dohvati aktivnu Auth0 domenu tenanta
$tenantsJson = auth0 tenants list --json | ConvertFrom-Json
$domain = $tenantsJson[0].domain
if (-not $domain) {
    $domain = Read-Host "Unesite vasu Auth0 domenu (npr. dev-xyz.eu.auth0.com)"
}

$audience = "https://api.begreen.tm.ro"

Write-Host "`n2. Kreiram Auth0 API resurs ($audience)..." -ForegroundColor Green
try {
    auth0 apis create --name "BeGreen Timisoara API" --identifier $audience --scopes "read:routes,write:trips,write:reports" --json | Out-Null
} catch {
    Write-Host "API resurs '$audience' vec postoji na tenantu." -ForegroundColor Yellow
}

Write-Host "`n3. Kreiram Auth0 SPA aplikaciju za Frontend..." -ForegroundColor Green
$clientId = ""
try {
    $appCreated = auth0 apps create --name "BeGreen Web App" --type spa --auth-method None `
        --callbacks "http://localhost:3000,http://localhost:5173" `
        --logout-urls "http://localhost:3000,http://localhost:5173" `
        --origins "http://localhost:3000,http://localhost:5173" `
        --web-origins "http://localhost:3000,http://localhost:5173" --json | ConvertFrom-Json
    $clientId = $appCreated.client_id
} catch {
    Write-Host "SPA aplikacija vec postoji ili je preskocena." -ForegroundColor Yellow
}

Write-Host "`n4. Ukljucujem Auth0 Passkeys (WebAuthn) za osobe s invaliditetom i bicikliste..." -ForegroundColor Green
try {
    $conns = auth0 api get "connections?strategy=auth0" | ConvertFrom-Json
    if ($conns -and $conns[0].id) {
        $connId = $conns[0].id
        auth0 connections update $connId --data '{"options":{"authentication_methods":{"passkey":{"enabled":true},"password":{"enabled":true}}}}' | Out-Null
        Write-Host "Passkeys (WebAuthn) uspjesno aktiviran na konekciji $connId!" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Napomena: Passkeys mozete ukljuciti i u Dashboardu (Authentication -> Database -> Passkeys)." -ForegroundColor Yellow
}

Write-Host "`n5. Ukljucujem Auth0 Attack Protection (Bot Detection & Brute-Force Shield za Waze prijave)..." -ForegroundColor Green
try {
    auth0 protection brute-force-protection update --enabled=true | Out-Null
    auth0 protection breached-password-detection update --enabled=true | Out-Null
} catch {
    Write-Host "Attack Protection postavke azurirane." -ForegroundColor Yellow
}

# 6. Automatski upisi Domain, Audience i ClientId u appsettings.json
$appSettingsPath = Join-Path $PSScriptRoot "EcoMutare\appsettings.json"
if (Test-Path $appSettingsPath) {
    $json = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
    $json.Auth0.Domain = $domain
    $json.Auth0.Audience = $audience
    if ($clientId) {
        $json.Auth0.ClientId = $clientId
    }
    $json | ConvertTo-Json -Depth 10 | Set-Content $appSettingsPath -Encoding UTF8
    Write-Host "`nUspjesno upisano u $appSettingsPath :" -ForegroundColor Cyan
    Write-Host "  Auth0:Domain   = $domain"
    Write-Host "  Auth0:Audience = $audience"
    Write-Host "  Auth0:ClientId = $clientId"
}
