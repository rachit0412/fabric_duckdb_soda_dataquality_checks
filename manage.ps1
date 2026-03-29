#!/usr/bin/env pwsh
# Data Quality Platform - Docker Management Script
# Manages the fully containerized data quality solution

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "build", "clean", "shell", "db", "test", "help")]
    [string]$Command = "help",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("prod", "dev")]
    [string]$Mode = "prod",
    
    [Parameter(Mandatory=$false)]
    [switch]$Admin,
    
    [Parameter(Mandatory=$false)]
    [switch]$Follow
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Title { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan -BackgroundColor DarkBlue }

# Get compose file based on mode
function Get-ComposeFile {
    if ($Mode -eq "dev") {
        return "docker-compose.dev.yml"
    }
    return "docker-compose.yml"
}

# Get compose command with optional profiles
function Get-ComposeCommand {
    param([string]$profiles = "")
    
    $composeFile = Get-ComposeFile
    $cmd = "docker compose -f $composeFile"
    
    if ($Admin) {
        $cmd += " --profile admin"
    }
    
    return $cmd
}

# Check if Docker is running
function Test-DockerRunning {
    try {
        docker version | Out-Null
        return $true
    } catch {
        Write-Error "Docker is not running. Please start Docker Desktop."
        Write-Info "Search for 'Docker Desktop' in the Start menu and launch it."
        exit 1
    }
}

# Command implementations
function Start-Platform {
    Write-Title "🚀 Starting Data Quality Platform ($Mode mode)"
    
    Test-DockerRunning
    
    $composeCmd = Get-ComposeCommand
    
    Write-Info "Building images (if needed)..."
    Invoke-Expression "$composeCmd build"
    
    Write-Info "Starting containers..."
    Invoke-Expression "$composeCmd up -d"
    
    Write-Info "Waiting for services to be healthy..."
    Start-Sleep -Seconds 5
    
    $status = Invoke-Expression "$composeCmd ps" | Out-String
    Write-Host $status
    
    Write-Success "Platform started successfully!"
    Write-Info "API: http://localhost:8000"
    Write-Info "API Docs: http://localhost:8000/docs"
    Write-Info "Health: http://localhost:8000/api/health"
    
    if ($Admin) {
        Write-Info "pgAdmin: http://localhost:5050"
        Write-Info "  Email: admin@company.com"
        Write-Info "  Password: admin123"
    }
    
    Write-Info "`nView logs: .\manage.ps1 logs -Follow"
    Write-Info "Stop: .\manage.ps1 stop"
}

function Stop-Platform {
    Write-Title "🛑 Stopping Data Quality Platform"
    
    $composeCmd = Get-ComposeCommand
    Invoke-Expression "$composeCmd down"
    
    Write-Success "Platform stopped successfully!"
}

function Restart-Platform {
    Write-Title "🔄 Restarting Data Quality Platform"
    Stop-Platform
    Start-Sleep -Seconds 2
    Start-Platform
}

function Get-Status {
    Write-Title "📊 Platform Status"
    
    Test-DockerRunning
    
    $composeCmd = Get-ComposeCommand
    
    Write-Host "`nContainers:"
    Invoke-Expression "$composeCmd ps"
    
    Write-Host "`nHealth Status:"
    docker ps --filter "name=dq-" --format "table {{.Names}}\t{{.Status}}"
    
    Write-Host "`nResource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker ps --filter "name=dq-" -q)
}

function Get-Logs {
    Write-Title "📋 Container Logs"
    
    $composeCmd = Get-ComposeCommand
    
    if ($Follow) {
        Invoke-Expression "$composeCmd logs -f"
    } else {
        Invoke-Expression "$composeCmd logs --tail=100"
    }
}

function Build-Images {
    Write-Title "🔨 Building Docker Images"
    
    Test-DockerRunning
    
    $composeCmd = Get-ComposeCommand
    
    Write-Info "Building images..."
    Invoke-Expression "$composeCmd build --no-cache"
    
    Write-Success "Images built successfully!"
    
    Write-Host "`nImages:"
    docker images | Select-String "data-quality"
}

function Remove-Everything {
    Write-Title "🗑️  Clean Up"
    
    Write-Warning "This will remove all containers, volumes, and data!"
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -ne "yes") {
        Write-Info "Cancelled."
        return
    }
    
    $composeCmd = Get-ComposeCommand
    
    Write-Info "Stopping and removing containers..."
    Invoke-Expression "$composeCmd down -v --remove-orphans"
    
    Write-Info "Removing Docker images..."
    docker rmi data-quality-platform:latest -f 2>$null
    docker rmi data-quality-platform:dev -f 2>$null
    
    Write-Success "Clean up complete!"
}

function Open-Shell {
    Write-Title "🐚 Opening Shell in API Container"
    
    Test-DockerRunning
    
    $container = if ($Mode -eq "dev") { "dq-platform-api-dev" } else { "dq-platform-api" }
    
    Write-Info "Opening bash shell in $container..."
    docker exec -it $container /bin/bash
}

function Connect-Database {
    Write-Title "🗄️  Connecting to Database"
    
    Test-DockerRunning
    
    $container = if ($Mode -eq "dev") { "dq-postgres-dev" } else { "dq-postgres" }
    
    Write-Info "Opening PostgreSQL shell in $container..."
    Write-Info "Database: data_quality | User: postgres"
    docker exec -it $container psql -U postgres -d data_quality
}

function Test-Platform {
    Write-Title "🧪 Testing Platform"
    
    Test-DockerRunning
    
    Write-Info "Checking API health..."
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -Method Get
        Write-Success "API is healthy!"
        Write-Host ($health | ConvertTo-Json -Depth 4)
    } catch {
        Write-Error "API health check failed!"
        Write-Info "Check logs with: .\manage.ps1 logs"
    }
    
    Write-Host "`nTesting database connection..."
    $container = if ($Mode -eq "dev") { "dq-postgres-dev" } else { "dq-postgres" }
    $dbTest = docker exec $container pg_isready -U postgres 2>&1
    
    if ($dbTest -match "accepting connections") {
        Write-Success "Database is ready!"
    } else {
        Write-Error "Database is not ready!"
    }
    
    Write-Host "`nContainer Status:"
    Get-Status
}

function Show-Help {
    Write-Host @"

Data Quality Platform - Docker Management Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USAGE:
    .\manage.ps1 <command> [options]

COMMANDS:
    start       Start the platform (default: production mode)
    stop        Stop all containers
    restart     Restart the platform
    status      Show container status and resource usage
    logs        View container logs (-Follow for real-time)
    build       Rebuild Docker images from scratch
    clean       Remove all containers, volumes, and data
    shell       Open bash shell in API container
    db          Connect to PostgreSQL database with psql
    test        Run health checks and connection tests
    help        Show this help message

OPTIONS:
    -Mode <prod|dev>    Run in production or development mode (default: prod)
    -Admin              Include pgAdmin container (database management UI)
    -Follow             Follow log output in real-time

EXAMPLES:
    # Start in production mode
    .\manage.ps1 start

    # Start in development mode with pgAdmin
    .\manage.ps1 start -Mode dev -Admin

    # View logs in real-time
    .\manage.ps1 logs -Follow

    # Check status
    .\manage.ps1 status

    # Open shell in API container
    .\manage.ps1 shell

    # Connect to database
    .\manage.ps1 db

    # Run tests
    .\manage.ps1 test

    # Clean everything and start fresh
    .\manage.ps1 clean
    .\manage.ps1 start

QUICK TIPS:
    • API Documentation: http://localhost:8000/docs
    • pgAdmin (with -Admin): http://localhost:5050
    • Production mode: Uses docker-compose.yml
    • Development mode: Uses docker-compose.dev.yml with hot-reload

"@ -ForegroundColor White
}

# Main execution
switch ($Command) {
    "start"   { Start-Platform }
    "stop"    { Stop-Platform }
    "restart" { Restart-Platform }
    "status"  { Get-Status }
    "logs"    { Get-Logs }
    "build"   { Build-Images }
    "clean"   { Remove-Everything }
    "shell"   { Open-Shell }
    "db"      { Connect-Database }
    "test"    { Test-Platform }
    "help"    { Show-Help }
    default   { Show-Help }
}
