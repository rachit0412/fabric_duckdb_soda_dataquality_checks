# Quick PostgreSQL Docker Setup
# Run this script to start PostgreSQL in Docker

Write-Host "================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Docker Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Docker is running
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker version | Out-Null
    $dockerRunning = $true
    Write-Host "✅ Docker is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  1. Press Windows Key and search 'Docker Desktop'" -ForegroundColor White
    Write-Host "  2. Click Docker Desktop to start it" -ForegroundColor White
    Write-Host "  3. Wait for the whale icon in system tray" -ForegroundColor White
    Write-Host "  4. Run this script again" -ForegroundColor White
    Write-Host ""
    
    # Try to start Docker Desktop
    Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow
    try {
        Start-Process "Docker Desktop" -ErrorAction Stop
        Write-Host "✅ Started Docker Desktop. Please wait 1-2 minutes and run this script again." -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not auto-start. Please start Docker Desktop manually." -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host ""

# Step 2: Check if PostgreSQL container exists
Write-Host "Step 2: Checking PostgreSQL container..." -ForegroundColor Yellow
$containerExists = docker ps -a --filter "name=dq-postgres" --format "{{.Names}}" | Select-String -Pattern "dq-postgres"

if ($containerExists) {
    # Container exists, check if it's running
    $containerRunning = docker ps --filter "name=dq-postgres" --format "{{.Names}}" | Select-String -Pattern "dq-postgres"
    
    if ($containerRunning) {
        Write-Host "✅ PostgreSQL container is already running!" -ForegroundColor Green
    } else {
        Write-Host "📦 PostgreSQL container exists but is stopped. Starting..." -ForegroundColor Yellow
        docker start dq-postgres
        Write-Host "✅ PostgreSQL container started!" -ForegroundColor Green
    }
} else {
    # Container doesn't exist, create it
    Write-Host "📦 Creating new PostgreSQL container..." -ForegroundColor Yellow
    docker compose -f docker-compose.postgres.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL container created and started!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create PostgreSQL container" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 3: Wait for PostgreSQL to be ready
Write-Host "Step 3: Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while (-not $ready -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $healthCheck = docker exec dq-postgres pg_isready -U postgres 2>&1
        if ($healthCheck -match "accepting connections") {
            $ready = $true
            Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
        } else {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 1
        }
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host ""
    Write-Host "⚠️  PostgreSQL might not be ready yet. Check logs with:" -ForegroundColor Yellow
    Write-Host "   docker logs dq-postgres" -ForegroundColor White
}

Write-Host ""

# Step 4: Show connection info
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ PostgreSQL Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connection Details:" -ForegroundColor Yellow
Write-Host "  Host:     localhost" -ForegroundColor White
Write-Host "  Port:     5432" -ForegroundColor White
Write-Host "  Database: data_quality" -ForegroundColor White
Write-Host "  User:     postgres" -ForegroundColor White
Write-Host "  Password: test123" -ForegroundColor White
Write-Host ""
Write-Host "Your .env file is already configured!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Install dependencies (if not done):" -ForegroundColor White
Write-Host "     pip install -r requirements.txt" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Test the connection:" -ForegroundColor White
Write-Host "     python test_quick.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Run your first scan:" -ForegroundColor White
Write-Host "     python main.py scan --csv test_data.csv --table my_table" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View logs:     docker logs dq-postgres" -ForegroundColor White
Write-Host "  Stop:          docker stop dq-postgres" -ForegroundColor White
Write-Host "  Start:         docker start dq-postgres" -ForegroundColor White
Write-Host "  Remove:        docker compose -f docker-compose.postgres.yml down -v" -ForegroundColor White
Write-Host "  Connect:       docker exec -it dq-postgres psql -U postgres -d data_quality" -ForegroundColor White
Write-Host ""
