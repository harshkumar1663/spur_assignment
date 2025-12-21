# Deployment Verification Script (PowerShell)
# Run this script before deploying to verify everything is configured correctly

Write-Host "🔍 Spur Assignment - Deployment Verification" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$script:Passed = 0
$script:Failed = 0
$script:Warnings = 0

function Print-Pass {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
    $script:Passed++
}

function Print-Fail {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    $script:Failed++
}

function Print-Warn {
    param($Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
    $script:Warnings++
}

Write-Host "📋 Checking Prerequisites..." -ForegroundColor White
Write-Host "----------------------------" -ForegroundColor Gray

# Check Node.js
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -ge 18) {
        Print-Pass "Node.js $nodeVersion installed"
    } else {
        Print-Fail "Node.js version should be 18+, found $nodeVersion"
    }
} catch {
    Print-Fail "Node.js not installed"
}

# Check npm
try {
    $npmVersion = npm -v
    Print-Pass "npm $npmVersion installed"
} catch {
    Print-Fail "npm not installed"
}

# Check Git
try {
    $gitVersion = git --version
    Print-Pass "Git installed"
} catch {
    Print-Warn "Git not installed (needed for cloud deployments)"
}

Write-Host ""
Write-Host "📁 Checking Project Structure..." -ForegroundColor White
Write-Host "--------------------------------" -ForegroundColor Gray

# Check if we're in the right directory
if ((Test-Path "package.json") -and (Test-Path "backend") -and (Test-Path "frontend")) {
    Print-Pass "Project structure correct"
} else {
    Print-Fail "Not in project root or structure incorrect"
}

# Check backend files
if ((Test-Path "backend\package.json") -and (Test-Path "backend\tsconfig.json")) {
    Print-Pass "Backend configuration files present"
} else {
    Print-Fail "Backend configuration missing"
}

# Check frontend files
if ((Test-Path "frontend\package.json") -and (Test-Path "frontend\svelte.config.js")) {
    Print-Pass "Frontend configuration files present"
} else {
    Print-Fail "Frontend configuration missing"
}

Write-Host ""
Write-Host "🔐 Checking Environment Configuration..." -ForegroundColor White
Write-Host "----------------------------------------" -ForegroundColor Gray

# Check backend .env
if (Test-Path "backend\.env") {
    Print-Pass "backend\.env exists"
    
    # Check for GEMINI_API_KEY
    $envContent = Get-Content "backend\.env" -Raw
    if ($envContent -match "GEMINI_API_KEY=(.+)") {
        $keyValue = $matches[1].Trim()
        if ($keyValue -eq "your-gemini-api-key-here" -or $keyValue -eq "") {
            Print-Warn "GEMINI_API_KEY not set in backend\.env"
        } else {
            Print-Pass "GEMINI_API_KEY is configured"
        }
    } else {
        Print-Fail "GEMINI_API_KEY not found in backend\.env"
    }
} else {
    Print-Fail "backend\.env not found (copy from backend\.env.example)"
}

# Check .env.example files
if (Test-Path "backend\.env.example") {
    Print-Pass "backend\.env.example exists"
} else {
    Print-Fail "backend\.env.example missing"
}

if (Test-Path "frontend\.env.example") {
    Print-Pass "frontend\.env.example exists"
} else {
    Print-Fail "frontend\.env.example missing"
}

Write-Host ""
Write-Host "🚀 Checking Deployment Files..." -ForegroundColor White
Write-Host "-------------------------------" -ForegroundColor Gray

$deployFiles = @("Dockerfile", ".dockerignore", "Procfile", "railway.json", "render.yaml", "vercel.json", "docker-compose.yml")

foreach ($file in $deployFiles) {
    if (Test-Path $file) {
        Print-Pass "$file present"
    } else {
        Print-Warn "$file missing (optional)"
    }
}

Write-Host ""
Write-Host "📚 Checking Documentation..." -ForegroundColor White
Write-Host "---------------------------" -ForegroundColor Gray

$docFiles = @("README.md", "DEPLOYMENT.md", "QUICKSTART.md", "PRODUCTION_CHECKLIST.md")

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Print-Pass "$file present"
    } else {
        Print-Warn "$file missing"
    }
}

Write-Host ""
Write-Host "🔒 Checking Security..." -ForegroundColor White
Write-Host "----------------------" -ForegroundColor Gray

# Check if .env is in .gitignore
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Print-Pass ".env files in .gitignore"
    } else {
        Print-Fail ".env should be in .gitignore"
    }
} else {
    Print-Fail ".gitignore not found"
}

# Check if node_modules is in .gitignore
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "node_modules") {
        Print-Pass "node_modules in .gitignore"
    } else {
        Print-Fail "node_modules should be in .gitignore"
    }
}

Write-Host ""
Write-Host "📦 Checking Dependencies..." -ForegroundColor White
Write-Host "--------------------------" -ForegroundColor Gray

# Check if node_modules exists
if (Test-Path "node_modules") {
    Print-Pass "Root dependencies installed"
} else {
    Print-Warn "Run 'npm install' to install dependencies"
}

if (Test-Path "backend\node_modules") {
    Print-Pass "Backend dependencies installed"
} else {
    Print-Warn "Backend dependencies not installed"
}

if (Test-Path "frontend\node_modules") {
    Print-Pass "Frontend dependencies installed"
} else {
    Print-Warn "Frontend dependencies not installed"
}

Write-Host ""
Write-Host "🏗️  Testing Build..." -ForegroundColor White
Write-Host "-------------------" -ForegroundColor Gray

# Try to build the backend
Write-Host "Building backend..." -ForegroundColor Gray
Push-Location backend
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Print-Pass "Backend builds successfully"
    } else {
        Print-Fail "Backend build failed (run 'cd backend; npm run build' for details)"
    }
} catch {
    Print-Fail "Backend build failed"
}
Pop-Location

# Try to build the frontend
Write-Host "Building frontend..." -ForegroundColor Gray
Push-Location frontend
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Print-Pass "Frontend builds successfully"
    } else {
        Print-Fail "Frontend build failed (run 'cd frontend; npm run build' for details)"
    }
} catch {
    Print-Fail "Frontend build failed"
}
Pop-Location

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed: $script:Passed" -ForegroundColor Green
Write-Host "Warnings: $script:Warnings" -ForegroundColor Yellow
Write-Host "Failed: $script:Failed" -ForegroundColor Red
Write-Host ""

if ($script:Failed -eq 0) {
    if ($script:Warnings -eq 0) {
        Write-Host "🎉 Perfect! Your project is ready for deployment!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor White
        Write-Host "  1. Commit your changes: git add . && git commit -m 'Ready for deployment'" -ForegroundColor Gray
        Write-Host "  2. Push to repository: git push" -ForegroundColor Gray
        Write-Host "  3. Follow QUICKSTART.md for deployment instructions" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Almost ready! Please review the warnings above." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Most warnings are optional, but ensure:" -ForegroundColor White
        Write-Host "  • GEMINI_API_KEY is configured" -ForegroundColor Gray
        Write-Host "  • Dependencies are installed" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Please fix the failed checks before deploying." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor White
    Write-Host "  • Install dependencies: npm install" -ForegroundColor Gray
    Write-Host "  • Copy .env.example to .env: Copy-Item backend\.env.example backend\.env" -ForegroundColor Gray
    Write-Host "  • Add your GEMINI_API_KEY to backend\.env" -ForegroundColor Gray
    Write-Host "  • Ensure Node.js 18+ is installed" -ForegroundColor Gray
}

Write-Host ""
