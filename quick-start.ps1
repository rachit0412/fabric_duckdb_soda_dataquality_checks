#!/usr/bin/env pwsh
# Quick Start Script for Data Quality Platform
# Handles Docker Desktop startup and container launch

Write-Output ""
Write-Output "🚀 Data Quality Platform - Quick Start"
Write-Output "======================================"
Write-Output ""

# Step 1: Check if Docker Desktop is running
Write-Output "1️⃣  Checking Docker Desktop..."
try {
    docker version | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Output "   ✅ Docker is already running"
    } else {
        throw "Docker not responding"
    }
} catch {
    Write-Output "   ⚠️  Docker not running, attempting to start..."
    
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Output "   ⏳ Waiting for Docker Desktop to start (30 seconds)..."
        Start-Sleep -Seconds 30
        
        # Check again
        try {
            docker version | Out-Null
            Write-Output "   ✅ Docker started successfully"
        } catch {
            Write-Output "   ❌ Docker failed to start. Please start Docker Desktop manually."
            Write-Output ""
            Write-Output "Manual steps:"
            Write-Output "  1. Search for 'Docker Desktop' in Windows"
            Write-Output "  2. Start Docker Desktop"
            Write-Output "  3. Wait for Docker icon in system tray"
            Write-Output "  4. Run this script again"
            exit 1
        }
    } else {
        Write-Output "   ❌ Docker Desktop not found at: $dockerPath"
        Write-Output "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
        exit 1
    }
}

# Step 2: Run validation
Write-Output ""
Write-Output "2️⃣  Running pre-flight validation..."
.\validate-docker.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Output "   ❌ Validation failed. Fix errors above and try again."
    exit 1
}

# Step 3: Build and start containers
Write-Output ""
Write-Output "3️⃣  Building and starting containers..."
Write-Output "   This may take 2-5 minutes on first run..."
Write-Output ""

docker compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Output ""
    Write-Output "✅ Platform started successfully!"
    Write-Output ""
    Write-Output "📊 Container Status:"
    docker compose ps
    
    Write-Output ""
    Write-Output "🌐 Access Points:"
    Write-Output "   Dashboard:    http://localhost:8000"
    Write-Output "   API Docs:     http://localhost:8000/docs"
    Write-Output "   Health Check: http://localhost:8000/api/health"
    Write-Output ""
    Write-Output "📋 Useful Commands:"
    Write-Output "   View logs:    docker compose logs -f data-quality-api"
    Write-Output "   Stop:         docker compose down"
    Write-Output "   Restart:      docker compose restart"
    Write-Output ""
    
    # Wait for health check
    Write-Output "⏳ Waiting for services to be healthy (up to 60 seconds)..."
    $maxWait = 60
    $waited = 0
    $healthy = $false
    
    while ($waited -lt $maxWait) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            # Not ready yet
        }
        Start-Sleep -Seconds 2
        $waited += 2
    }
    
    if ($healthy) {
        Write-Output "✅ All services are healthy!"
        Write-Output ""
        Write-Output "🎉 Opening dashboard in browser..."
        Start-Sleep -Seconds 2
        Start-Process "http://localhost:8000"
    } else {
        Write-Output "⚠️  Services started but health check timeout."
        Write-Output "   Check logs: docker compose logs -f"
    }
    
} else {
    Write-Output ""
    Write-Output "❌ Failed to start containers"
    Write-Output "   Check logs: docker compose logs"
    exit 1
}

Write-Output ""
Write-Output "✨ Platform is ready! Enjoy!"
Write-Output ""
# Quick Start - Containerized Data Quality Platform
# One-command setup for the entire platform

$ErrorActionPreference = "Stop"

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        Data Quality Platform - Containerized Setup           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Step 1: Check Docker
Write-Host "`n[1/5] Checking Docker Desktop..." -ForegroundColor Yellow

try {
    docker version | Out-Null
    Write-Host "✅ Docker is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running`n" -ForegroundColor Red
    Write-Host "Please start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  1. Press Windows Key" -ForegroundColor White
    Write-Host "  2. Search 'Docker Desktop'" -ForegroundColor White
    Write-Host "  3. Launch Docker Desktop" -ForegroundColor White
    Write-Host "  4. Wait for whale icon in system tray (1-2 minutes)" -ForegroundColor White
    Write-Host "  5. Run this script again: .\quick-start.ps1`n" -ForegroundColor White
    
    # Attempt to start Docker Desktop
    Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow
    try {
        Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
        Write-Host "✅ Launched Docker Desktop. Wait 1-2 minutes and run this script again." -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Please start Docker Desktop manually." -ForegroundColor Yellow
    }
    
    exit 1
}

# Step 2: Check if already running
Write-Host "`n[2/5] Checking existing containers..." -ForegroundColor Yellow

$existingContainers = docker ps --filter "name=dq-" --format "{{.Names}}"

if ($existingContainers) {
    Write-Host "⚠️  Found existing containers:" -ForegroundColor Yellow
    $existingContainers | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
    
    $action = Read-Host "`nWhat would you like to do? (restart/continue/exit)"
    
    switch ($action.ToLower()) {
        "restart" {
            Write-Host "`nRestarting platform..." -ForegroundColor Yellow
            docker compose down
            Start-Sleep -Seconds 2
        }
        "continue" {
            Write-Host "`n✅ Using existing containers" -ForegroundColor Green
            Write-Host "`nAccess Points:" -ForegroundColor Cyan
            Write-Host "  API:      http://localhost:8000" -ForegroundColor White
            Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
            Write-Host "  Health:   http://localhost:8000/api/health" -ForegroundColor White
            exit 0
        }
        default {
            Write-Host "Exiting..." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Host "✅ No existing containers found" -ForegroundColor Green
}

# Step 3: Check environment file
Write-Host "`n[3/5] Checking configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env.docker")) {
    Write-Host "⚠️  Creating default environment file..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env" -ErrorAction SilentlyContinue
}
Write-Host "✅ Configuration ready" -ForegroundColor Green

# Step 4: Build and start
Write-Host "`n[4/5] Building and starting containers..." -ForegroundColor Yellow
Write-Host "    This may take 2-5 minutes on first run..." -ForegroundColor Gray

docker compose build --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Check logs with: docker compose logs" -ForegroundColor Red
    exit 1
}

docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
    Write-Host "Check logs with: .\manage.ps1 logs" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Containers started!" -ForegroundColor Green

# Step 5: Wait for health
Write-Host "`n[5/5] Waiting for services to be ready..." -ForegroundColor Yellow

$maxAttempts = 60
$attempt = 0
$ready = $false

while (-not $ready -and $attempt -lt $maxAttempts) {
    $attempt++
    
    try {
        # Check database
        $dbHealth = docker exec dq-postgres pg_isready -U postgres 2>&1
        $dbReady = $dbHealth -match "accepting connections"
        
        # Check API
        $apiHealth = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -Method Get -ErrorAction SilentlyContinue
        $apiReady = $apiHealth.status -eq "healthy"
        
        if ($dbReady -and $apiReady) {
            $ready = $true
        } else {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
}

Write-Host ""

if ($ready) {
    Write-Host "✅ Platform is ready!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Services might not be fully ready yet" -ForegroundColor Yellow
    Write-Host "    Check status: .\manage.ps1 status" -ForegroundColor Gray
    Write-Host "    View logs: .\manage.ps1 logs" -ForegroundColor Gray
}

# Success message
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                  🎉 Setup Complete! 🎉                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Your Data Quality Platform is now running!

📍 Access Points:
   API:          http://localhost:8000
   API Docs:     http://localhost:8000/docs
   Health Check: http://localhost:8000/api/health

🎯 What You Can Do Now:

   1. View API Documentation:
      → Open: http://localhost:8000/docs

   2. Run a Health Check:
      → .\manage.ps1 test

   3. Check Container Status:
      → .\manage.ps1 status

   4. View Real-Time Logs:
      → .\manage.ps1 logs -Follow

   5. Run a Data Quality Scan:
      # Place CSV file in ./data/ folder
      # Then run:
      → .\manage.ps1 shell
      → python main.py scan --csv /app/data/your_file.csv --table your_table

   6. Connect to Database:
      → .\manage.ps1 db

💡 Useful Commands:

   Stop platform:     .\manage.ps1 stop
   Restart platform:  .\manage.ps1 restart
   View all commands: .\manage.ps1 help

📚 Documentation:

   • Complete guide:    CONTAINERIZATION.md
   • Docker setup:      DOCKER_SETUP.md
   • Features overview: README.md

🛠️  Development Mode (with hot-reload):

   .\manage.ps1 stop
   .\manage.ps1 start -Mode dev -Admin
   
   Then edit code - changes auto-reload!
   pgAdmin available at: http://localhost:5050

"@ -ForegroundColor White

Write-Host "Happy data quality checking! 🚀`n" -ForegroundColor Green
