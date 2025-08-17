Write-Host "Starting REC-KIOSK Backend Server with WebSocket Support..." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: This server supports WebSockets for real-time updates" -ForegroundColor Yellow
Write-Host "DO NOT use 'python manage.py runserver' - it won't work with WebSockets" -ForegroundColor Yellow
Write-Host ""

# Change to the script's directory first
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "rec_kiosk")) {
    Write-Host "ERROR: rec_kiosk directory not found!" -ForegroundColor Red
    Write-Host "Make sure this script is in the backend folder." -ForegroundColor Yellow
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host "✅ Found rec_kiosk directory - starting server..." -ForegroundColor Green
Write-Host ""

try {
    daphne -b 127.0.0.1 -p 8000 rec_kiosk.asgi:application
}
catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
    Write-Host "Make sure Daphne is installed: pip install daphne" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
