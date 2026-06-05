@echo off
echo ------------------------------------------------
echo Starting Invozen GST Development Environment
echo ------------------------------------------------

:: 1. Check for backend/.env
if not exist "backend\.env" (
    echo [!] backend\.env is missing.
    if exist "backend\.env.example" (
        echo [*] Creating backend\.env from .env.example...
        copy backend\.env.example backend\.env
        echo [!] PLEASE NOTE: You may need to edit backend\.env with your actual credentials.
    ) else (
        echo [X] backend\.env.example not found. Please create backend\.env manually.
    )
)

:: 2. Check dependencies
echo [*] Checking for node_modules...
if not exist "node_modules" (
    echo [!] Dependencies missing. Running npm run install:all...
    call npm run install:all
) else if not exist "backend\node_modules" (
    echo [!] Backend dependencies missing. Running npm run install:all...
    call npm run install:all
) else if not exist "frontend\node_modules" (
    echo [!] Frontend dependencies missing. Running npm run install:all...
    call npm run install:all
) else (
    echo [*] Dependencies found.
)

:: 3. Start services
echo [*] Launching services...
echo [*] Backend: http://localhost:4000
echo [*] Frontend: http://localhost:3000
echo ------------------------------------------------

npm run dev
