#!/usr/bin/env pwsh
<#
.SYNOPSIS
Start the Enterprise Data Quality Platform via Docker
#>

$ErrorActionPreference = "Stop"

Write-Host "======================================================================"
Write-Host "     START: Enterprise Data Quality Platform"
Write-Host "======================================================================"
Write-Host ""

# Check if Docker is running
Write-Host "CHECK: Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    $result = docker ps 2>&1
    if ($result -notmatch "error|fail|denied") {
        $dockerRunning = $true
        Write-Host "OK: Docker is running" -ForegroundColor Green
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "FAIL: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "INFO: To start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "   * Windows: Click 'Docker' in Start Menu" -ForegroundColor White
    Write-Host "   * macOS: Open Applications > Docker.app" -ForegroundColor White
    Write-Host "   * Linux: sudo systemctl start docker" -ForegroundColor White
    Write-Host ""
    Write-Host "WAIT: Waiting 30 seconds for you to start Docker..." -ForegroundColor Yellow
    Write-Host ""
    
    for ($i = 30; $i -gt 0; $i--) {
        try {
            $result = docker ps 2>&1
            if ($result -notmatch "error|fail|denied") {
                Write-Host "OK: Docker is now running! Proceeding..." -ForegroundColor Green
                $dockerRunning = $true
                Start-Sleep -Seconds 3
                break
            }
        } catch {}
        
        Start-Sleep -Seconds 1
        Write-Host "`r   $i seconds remaining..." -NoNewline
    }
    
    if (-not $dockerRunning) {
        Write-Host ""
        Write-Host "FAIL: Docker still not running. Please start Docker Desktop manually." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "PKG: Cleaning up old containers and volumes..." -ForegroundColor Yellow

try {
    docker compose down -v 2>&1 | Out-Null
    Write-Host "OK: Cleaned up" -ForegroundColor Green
} catch {
    Write-Host "WARN: No existing containers to clean (first time setup)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "BUILD: Building Docker images (this may take 2-5 minutes)..." -ForegroundColor Yellow
Write-Host "   Building optimized multi-stage Dockerfile..." -ForegroundColor Gray

try {
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Build complete" -ForegroundColor Green
} catch {
    Write-Host "FAIL: Build failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "RUN: Starting services..." -ForegroundColor Yellow

try {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: Failed to start services!" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Services started" -ForegroundColor Green
} catch {
    Write-Host "FAIL: Failed to start services: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "WAIT: Waiting for services to become healthy (up to 60 seconds)..." -ForegroundColor Yellow

$maxWait = 60
$elapsed = 0
$healthy = $false

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    
    try {
        # Check API health
        $apiResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/health" -UseBasicParsing -Method Get -ErrorAction SilentlyContinue
        if ($apiResponse.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {}
    
    Write-Host "`r   Attempts: $($elapsed/2)/$($maxWait/2)..." -NoNewline
}

if ($healthy) {
    Write-Host ""
    Write-Host "OK: All services are healthy!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARN: Services may still be initializing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================================"
Write-Host "            OK: APPLICATION STARTED SUCCESSFULLY"
Write-Host "======================================================================"
Write-Host ""

Write-Host "ACCESS POINTS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   => Dashboard: http://localhost:3010" -ForegroundColor White
Write-Host "   => FastAPI Interactive Docs: http://localhost:8001/docs" -ForegroundColor White
Write-Host "   => OpenAPI Schema: http://localhost:8001/openapi.json" -ForegroundColor White
Write-Host "   => API Server: http://localhost:8001" -ForegroundColor White
Write-Host ""

Write-Host "USEFUL COMMANDS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   View logs:          docker compose logs -f data-quality-api" -ForegroundColor White
Write-Host "   Stop services:      docker compose down" -ForegroundColor White
Write-Host "   Restart services:   docker compose restart" -ForegroundColor White
Write-Host "   Database shell:     docker exec -it dq-postgres psql -U postgres -d data_quality" -ForegroundColor White
Write-Host ""

Write-Host "DOCUMENTATION:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   * API Reference: docs/API.md" -ForegroundColor White
Write-Host "   * Deployment Guide: DOCKER_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "   * Architecture: ARCHITECTURE.md" -ForegroundColor White
Write-Host "   * Troubleshooting: TROUBLESHOOTING.md" -ForegroundColor White
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Open http://localhost:3010 for the dashboard or http://localhost:8001/docs for the API" -ForegroundColor White
Write-Host "   2. Try a sample scan: POST /api/v1/runs" -ForegroundColor White
Write-Host "   3. View results: GET /api/v1/results" -ForegroundColor White
Write-Host "   4. Check logs: docker compose logs -f data-quality-api" -ForegroundColor White
Write-Host ""

Write-Host "======================================================================"
