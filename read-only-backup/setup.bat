@echo off
REM Alite TypeScript Game - Quick Setup Script (Windows)
REM This script sets up the development environment and runs initial tests

echo 🚀 Alite TypeScript Game - Quick Setup
echo ======================================
echo.

REM Check Node.js version
echo 📋 Checking Node.js version...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js found: %NODE_VERSION%
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the alite-typescript directory.
    pause
    exit /b 1
)

echo 📁 Project structure verified
echo.

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo Try running: npm install --force
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Run framework test
echo 🧪 Running framework verification...
node run-tests.js
if %errorlevel% neq 0 (
    echo ❌ Framework verification failed
    echo Check the error messages above for details
    pause
    exit /b 1
)

echo ✅ Framework verification passed
echo.

REM Type check
echo 🔍 Running TypeScript type check...
npm run type-check
if %errorlevel% neq 0 (
    echo ❌ TypeScript type check failed
    pause
    exit /b 1
)

echo ✅ TypeScript type check passed
echo.

REM Build project
echo 🔨 Building project...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Project build failed
    pause
    exit /b 1
)

echo ✅ Project build successful
echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo ✅ All tests passed
echo ✅ Project built successfully
echo.
echo 🚀 To start development:
echo    npm run dev
echo.
echo 🌐 To view in browser:
echo    1. Run: npm run dev
echo    2. Open: http://localhost:3000
echo.
echo 📚 For more information, see TESTING_GUIDE.md
echo.

REM Ask if user wants to start dev server
set /p START_SERVER="Would you like to start the development server now? (y/n): "
if /i "%START_SERVER%"=="y" (
    echo 🚀 Starting development server...
    npm run dev
) else (
    echo Setup complete! Run "npm run dev" when ready to start developing.
)