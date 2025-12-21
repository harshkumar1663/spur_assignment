# Test Production Routes

# This script helps you test the production build locally before deploying

Write-Host "🧪 Testing Production Build Locally" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if build exists
if (-not (Test-Path "backend/dist/index.js")) {
    Write-Host "❌ Backend not built. Running build..." -ForegroundColor Red
    npm run build
}

if (-not (Test-Path "frontend/build/index.html")) {
    Write-Host "❌ Frontend not built. Running build..." -ForegroundColor Red
    npm run build:frontend
}

Write-Host "✅ Build files exist" -ForegroundColor Green
Write-Host ""

# Set production environment
$env:NODE_ENV = "production"
$env:PORT = "3000"

Write-Host "🚀 Starting server in production mode..." -ForegroundColor Yellow
Write-Host "   - NODE_ENV=production" -ForegroundColor Gray
Write-Host "   - PORT=3000" -ForegroundColor Gray
Write-Host ""

# Start the server in background
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:NODE_ENV = "production"
    $env:PORT = "3000"
    $env:GEMINI_API_KEY = $using:env:GEMINI_API_KEY
    npm start
}

Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🔍 Testing Routes..." -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan
Write-Host ""

# Test health endpoint
Write-Host "1️⃣  Testing /health endpoint..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ /health returns 200 OK" -ForegroundColor Green
        Write-Host "   Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ /health failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test root endpoint (should serve frontend)
Write-Host "2️⃣  Testing / (root - should serve frontend HTML)..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing
    if ($response.StatusCode -eq 200 -and $response.Content -match "<!DOCTYPE html>") {
        Write-Host "   ✅ / returns 200 OK and serves HTML" -ForegroundColor Green
        Write-Host "   Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Gray
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "   ⚠️  / returns 200 but not HTML (might be JSON)" -ForegroundColor Yellow
        Write-Host "   Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ / failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test chat message endpoint
Write-Host "3️⃣  Testing /chat/message endpoint..." -ForegroundColor White
try {
    $body = @{
        message = "Hello, test message"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/chat/message" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ /chat/message returns 200 OK" -ForegroundColor Green
        Write-Host "   Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ /chat/message failed: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "-------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Open your browser and test:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to stop the server..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop the server
Stop-Job -Job $job
Remove-Job -Job $job

Write-Host ""
Write-Host "✅ Server stopped" -ForegroundColor Green
