@echo off
REM Frontend Deploy script for Windows
REM Usage: deploy.bat

echo 🚀 Starting Frontend deployment...

REM Pull latest code (if using git)
if exist .git (
    git pull
)

REM Build images
docker compose build --no-cache

REM Stop old containers
docker compose down

REM Start new containers
docker compose up -d

REM Wait for services
timeout /t 5 /nobreak >nul

REM Check status
docker compose ps

echo ✅ Frontend deployment completed!







