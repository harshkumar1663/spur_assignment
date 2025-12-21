#!/bin/bash

# Deployment Verification Script
# Run this script before deploying to verify everything is configured correctly

echo "🔍 Spur Assignment - Deployment Verification"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print success
print_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

# Function to print failure
print_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

# Function to print warning
print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "📋 Checking Prerequisites..."
echo "----------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_pass "Node.js $(node -v) installed"
    else
        print_fail "Node.js version should be 18+, found $(node -v)"
    fi
else
    print_fail "Node.js not installed"
fi

# Check npm
if command_exists npm; then
    print_pass "npm $(npm -v) installed"
else
    print_fail "npm not installed"
fi

# Check Git
if command_exists git; then
    print_pass "Git $(git --version | cut -d' ' -f3) installed"
else
    print_warn "Git not installed (needed for cloud deployments)"
fi

echo ""
echo "📁 Checking Project Structure..."
echo "--------------------------------"

# Check if we're in the right directory
if [ -f "package.json" ] && [ -d "backend" ] && [ -d "frontend" ]; then
    print_pass "Project structure correct"
else
    print_fail "Not in project root or structure incorrect"
fi

# Check backend files
if [ -f "backend/package.json" ] && [ -f "backend/tsconfig.json" ]; then
    print_pass "Backend configuration files present"
else
    print_fail "Backend configuration missing"
fi

# Check frontend files
if [ -f "frontend/package.json" ] && [ -f "frontend/svelte.config.js" ]; then
    print_pass "Frontend configuration files present"
else
    print_fail "Frontend configuration missing"
fi

echo ""
echo "🔐 Checking Environment Configuration..."
echo "----------------------------------------"

# Check backend .env
if [ -f "backend/.env" ]; then
    print_pass "backend/.env exists"
    
    # Check for GEMINI_API_KEY
    if grep -q "GEMINI_API_KEY=" backend/.env; then
        KEY_VALUE=$(grep "GEMINI_API_KEY=" backend/.env | cut -d'=' -f2)
        if [ "$KEY_VALUE" = "your-gemini-api-key-here" ] || [ -z "$KEY_VALUE" ]; then
            print_warn "GEMINI_API_KEY not set in backend/.env"
        else
            print_pass "GEMINI_API_KEY is configured"
        fi
    else
        print_fail "GEMINI_API_KEY not found in backend/.env"
    fi
else
    print_fail "backend/.env not found (copy from backend/.env.example)"
fi

# Check .env.example files
if [ -f "backend/.env.example" ]; then
    print_pass "backend/.env.example exists"
else
    print_fail "backend/.env.example missing"
fi

if [ -f "frontend/.env.example" ]; then
    print_pass "frontend/.env.example exists"
else
    print_fail "frontend/.env.example missing"
fi

echo ""
echo "🚀 Checking Deployment Files..."
echo "-------------------------------"

# Check deployment configuration files
DEPLOY_FILES=("Dockerfile" ".dockerignore" "Procfile" "railway.json" "render.yaml" "vercel.json" "docker-compose.yml")

for file in "${DEPLOY_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_pass "$file present"
    else
        print_warn "$file missing (optional)"
    fi
done

echo ""
echo "📚 Checking Documentation..."
echo "---------------------------"

DOC_FILES=("README.md" "DEPLOYMENT.md" "QUICKSTART.md" "PRODUCTION_CHECKLIST.md")

for file in "${DOC_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_pass "$file present"
    else
        print_warn "$file missing"
    fi
done

echo ""
echo "🔒 Checking Security..."
echo "----------------------"

# Check if .env is in .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore || grep -q "^\.env$" backend/.gitignore; then
        print_pass ".env files in .gitignore"
    else
        print_fail ".env should be in .gitignore"
    fi
else
    print_fail ".gitignore not found"
fi

# Check if node_modules is in .gitignore
if grep -q "node_modules" .gitignore 2>/dev/null; then
    print_pass "node_modules in .gitignore"
else
    print_fail "node_modules should be in .gitignore"
fi

echo ""
echo "📦 Checking Dependencies..."
echo "--------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_pass "Root dependencies installed"
else
    print_warn "Run 'npm install' to install dependencies"
fi

if [ -d "backend/node_modules" ]; then
    print_pass "Backend dependencies installed"
else
    print_warn "Backend dependencies not installed"
fi

if [ -d "frontend/node_modules" ]; then
    print_pass "Frontend dependencies installed"
else
    print_warn "Frontend dependencies not installed"
fi

echo ""
echo "🏗️  Testing Build..."
echo "-------------------"

# Try to build the project
echo "Building backend..."
if cd backend && npm run build >/dev/null 2>&1; then
    print_pass "Backend builds successfully"
else
    print_fail "Backend build failed (run 'cd backend && npm run build' for details)"
fi

cd ..

echo "Building frontend..."
if cd frontend && npm run build >/dev/null 2>&1; then
    print_pass "Frontend builds successfully"
else
    print_fail "Frontend build failed (run 'cd frontend && npm run build' for details)"
fi

cd ..

echo ""
echo "=============================================="
echo "📊 Verification Summary"
echo "=============================================="
echo ""
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 Perfect! Your project is ready for deployment!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Commit your changes: git add . && git commit -m 'Ready for deployment'"
        echo "  2. Push to repository: git push"
        echo "  3. Follow QUICKSTART.md for deployment instructions"
    else
        echo -e "${YELLOW}⚠️  Almost ready! Please review the warnings above.${NC}"
        echo ""
        echo "Most warnings are optional, but ensure:"
        echo "  • GEMINI_API_KEY is configured"
        echo "  • Dependencies are installed"
    fi
else
    echo -e "${RED}❌ Please fix the failed checks before deploying.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  • Install dependencies: npm install"
    echo "  • Copy .env.example to .env: cp backend/.env.example backend/.env"
    echo "  • Add your GEMINI_API_KEY to backend/.env"
    echo "  • Ensure Node.js 18+ is installed"
fi

echo ""
