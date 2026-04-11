#!/usr/bin/env pwsh
<#
.SYNOPSIS
Start the Enterprise Data Quality Platform via Docker

.DESCRIPTION
This script:
1. Ensures Docker Desktop is running
2. Cleans up old containers and volumes
3. Builds fresh Docker images
4. Starts the application
5. Waits for services to be healthy
6. Displays access URLs

.EXAMPLE
.\START_APPLICATION.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 Starting Enterprise Data Quality Platform 🚀           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Docker is running
Write-Host "📋 Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    $result = docker ps 2>&1
    if ($result -notmatch "error|fail|denied") {
        $dockerRunning = $true
        Write-Host "✅ Docker is running" -ForegroundColor Green
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📖 To start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "   • Windows: Click 'Docker' in Start Menu or use: Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'" -ForegroundColor White
    Write-Host "   • macOS: Open Applications > Docker.app" -ForegroundColor White
    Write-Host "   • Linux: sudo systemctl start docker" -ForegroundColor White
    Write-Host ""
    Write-Host "⏳ Waiting 30 seconds for you to start Docker..." -ForegroundColor Yellow
    Write-Host ""
    
    for ($i = 30; $i -gt 0; $i--) {
        Write-Host "   $i seconds remaining..." -ForegroundColor Gray -NoNewline
        
        try {
            $result = docker ps 2>&1
            if ($result -notmatch "error|fail|denied") {
                Write-Host "`n✅ Docker is now running! Proceeding..." -ForegroundColor Green
                $dockerRunning = $true
                Start-Sleep -Seconds 3  # Give Docker a moment to fully stabilize
                break
            }
        } catch {}
        
        Start-Sleep -Seconds 1
        Write-Host "`r" -NoNewline
    }
    
    if (-not $dockerRunning) {
        Write-Host "❌ Docker still not running. Please start Docker Desktop manually and try again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Cleaning up old containers and volumes..." -ForegroundColor Yellow

try {
    docker compose down -v 2>&1 | Out-Null
    Write-Host "✅ Cleaned up" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No existing containers to clean (first time setup)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔨 Building Docker images (this may take 2-5 minutes)..." -ForegroundColor Yellow
Write-Host "   Building optimized multi-stage Dockerfile..." -ForegroundColor Gray

try {
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build complete" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow

try {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to start services!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Services started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start services: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Waiting for services to become healthy..." -ForegroundColor Yellow
Write-Host "   PostgreSQL: initializing..." -ForegroundColor Gray

$maxWait = 60
$elapsed = 0
$healthy = $false

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    
    try {
        # Check API health
        $apiResponse = curl -s "http://localhost:8000/api/health" -o /dev/null -w "%{http_code}" 2>&1
        if ($apiResponse -eq "200") {
            $healthy = $true
            break
        }
    } catch {}
    
    Write-Host "   Attempts: $($elapsed/2)/$($maxWait/2)..." -ForegroundColor Gray -NoNewline
    Write-Host "`r" -NoNewline
}

if ($healthy) {
    Write-Host "✅ All services are healthy!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Services may still be initializing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║            ✅ APPLICATION STARTED SUCCESSFULLY ✅             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📍 ACCESS POINTS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🔗 FastAPI Interactive Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   📊 OpenAPI Schema: http://localhost:8000/openapi.json" -ForegroundColor White
Write-Host "   💻 API Server: http://localhost:8000" -ForegroundColor White
Write-Host ""

Write-Host "🛠️  USEFUL COMMANDS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   View logs:          docker compose logs -f data-quality-api" -ForegroundColor White
Write-Host "   Stop services:      docker compose down" -ForegroundColor White
Write-Host "   Restart services:   docker compose restart" -ForegroundColor White
Write-Host "   Database shell:     docker exec -it dq-postgres psql -U postgres -d data_quality" -ForegroundColor White
Write-Host ""

Write-Host "📖 DOCUMENTATION:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   • API Reference: docs/API.md" -ForegroundColor White
Write-Host "   • Deployment Guide: DOCKER_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "   • Architecture: ARCHITECTURE.md" -ForegroundColor White
Write-Host "   • Troubleshooting: TROUBLESHOOTING.md" -ForegroundColor White
Write-Host ""

Write-Host "🎯 NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Open http://localhost:8000/docs in your browser to test the API" -ForegroundColor White
Write-Host "   2. Try a sample scan: POST /api/v1/runs" -ForegroundColor White
Write-Host "   3. View results: GET /api/v1/results" -ForegroundColor White
Write-Host "   4. Check logs: docker compose logs -f data-quality-api" -ForegroundColor White
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
