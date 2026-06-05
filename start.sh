#!/bin/bash

# Invozen GST Start Script for Windows (Git Bash/WSL)

echo "------------------------------------------------"
echo "Starting Invozen GST Development Environment"
echo "------------------------------------------------"

# Function to check and copy .env if missing
check_env() {
    if [ ! -f "backend/.env" ]; then
        echo "[!] backend/.env is missing."
        if [ -f "backend/.env.example" ]; then
            echo "[*] Creating backend/.env from .env.example..."
            cp backend/.env.example backend/.env
            echo "[!] PLEASE NOTE: You may need to edit backend/.env with your actual credentials."
        else
            echo "[X] backend/.env.example not found. Please create backend/.env manually."
        fi
    fi
}

# 1. Check dependencies
echo "[*] Checking for node_modules..."
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "[!] Dependencies missing. Running npm run install:all..."
    npm run install:all
else
    echo "[*] Dependencies found."
fi

# 2. Check Environment Variables
check_env

# 3. Start both services using concurrently (defined in root package.json)
echo "[*] Launching services..."
echo "[*] Backend: http://localhost:4000"
echo "[*] Frontend: http://localhost:3000"
echo "------------------------------------------------"

npm run dev
