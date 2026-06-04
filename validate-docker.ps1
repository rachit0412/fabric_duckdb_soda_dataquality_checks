#!/usr/bin/env pwsh
# Docker Pre-Flight Validation Script
# Validates all requirements before running docker compose

Write-Output ""
Write-Output "=================================="
Write-Output "🔍 Docker Pre-Flight Validation"
Write-Output "=================================="
Write-Output ""

$errors = 0
$warnings = 0

# Check 1: Docker daemon
Write-Output "1️⃣  Checking Docker..."
try {
    docker version | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Output "   ✅ Docker is running"
    } else {
        Write-Output "   ❌ Docker daemon not responding"
        $errors++
    }
} catch {
    Write-Output "   ❌ Docker not installed or not in PATH"
    $errors++
}

# Check 2: Docker Compose
Write-Output ""
Write-Output "2️⃣  Checking Docker Compose..."
try {
    docker compose version | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Output "   ✅ Docker Compose available"
    } else {
        Write-Output "   ❌ Docker Compose not available"
        $errors++
    }
} catch {
    Write-Output "   ❌ Docker Compose not found"
    $errors++
}

# Check 3: Critical files
Write-Output ""
Write-Output "3️⃣  Checking Configuration Files..."
$criticalFiles = @{
    'Dockerfile' = 'Container build definition'
    'docker-compose.yml' = 'Container orchestration'
    'requirements.txt' = 'Python dependencies'
    '.env' = 'Environment configuration'
}

foreach ($file in $criticalFiles.Keys) {
    if (Test-Path $file) {
        Write-Output "   ✅ $file"
    } else {
        Write-Output "   ❌ MISSING: $file - $($criticalFiles[$file])"
        $errors++
    }
}

# Check 4: Source code structure
Write-Output ""
Write-Output "4️⃣  Checking Source Code..."
$sourceFiles = @(
    'src\__init__.py',
    'src\api\__init__.py',
    'src\api\server.py',
    'src\core\__init__.py',
    'src\core\scanner.py',
    'src\storage\__init__.py',
    'src\storage\postgres_repository.py',
    'src\config\__init__.py'
)

$missingFiles = @()
foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        Write-Output "   ✅ $file"
    } else {
        Write-Output "   ❌ MISSING: $file"
        $missingFiles += $file
        $errors++
    }
}

# Check 5: Soda configuration
Write-Output ""
Write-Output "5️⃣  Checking Soda Core Configuration..."
if (Test-Path "soda_duckdb") {
    Write-Output "   ✅ soda_duckdb/ directory exists"
    
    if (Test-Path "soda_duckdb\checks.yml") {
        Write-Output "   ✅ soda_duckdb/checks.yml"
    } else {
        Write-Output "   ⚠️  soda_duckdb/checks.yml missing (will use defaults)"
        $warnings++
    }
    
    if (Test-Path "soda_duckdb\config.yml") {
        Write-Output "   ✅ soda_duckdb/config.yml"
    } else {
        Write-Output "   ⚠️  soda_duckdb/config.yml missing (will use defaults)"
        $warnings++
    }
} else {
    Write-Output "   ❌ soda_duckdb/ directory missing"
    $errors++
}

# Check 6: Database init scripts
Write-Output ""
Write-Output "6️⃣  Checking Database Initialization..."
if (Test-Path "init-scripts") {
    Write-Output "   ✅ init-scripts/ directory exists"
    
    $sqlFiles = Get-ChildItem -Path "init-scripts" -Filter "*.sql" -ErrorAction SilentlyContinue
    if ($sqlFiles) {
        Write-Output "   ✅ Found $($sqlFiles.Count) SQL initialization script(s)"
    } else {
        Write-Output "   ⚠️  No SQL scripts in init-scripts/"
        $warnings++
    }
} else {
    Write-Output "   ⚠️  init-scripts/ directory missing (database will use defaults)"
    $warnings++
}

# Check 7: UI files
Write-Output ""
Write-Output "7️⃣  Checking UI Resources..."
if (Test-Path "src\ui\dashboard.html") {
    Write-Output "   ✅ Web dashboard found"
} else {
    Write-Output "   ⚠️  Dashboard UI missing (API endpoints only)"
    $warnings++
}

# Check 8: Environment variables
Write-Output ""
Write-Output "8️⃣  Checking Environment Configuration..."
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw

    if ($envContent -match '(?m)^STORAGE_BACKEND=.+$') {
        Write-Output "   ✅ STORAGE_BACKEND configured"
    } else {
        Write-Output "   ⚠️  STORAGE_BACKEND not set (will use defaults)"
        $warnings++
    }

    $requiredSecrets = @('POSTGRES_PASSWORD', 'PGADMIN_PASSWORD')
    $insecureSecretValues = @(
        'test123',
        'admin123',
        'secure_password_here',
        'change-me-in-production',
        'change-me-with-a-32-char-random-password',
        'change-me-before-enabling-pgadmin'
    )

    foreach ($var in $requiredSecrets) {
        $match = [regex]::Match($envContent, "(?m)^$var=(.*)$")
        if (-not $match.Success) {
            Write-Output "   ❌ $var not set"
            $errors++
            continue
        }

        $value = $match.Groups[1].Value.Trim()
        if ([string]::IsNullOrWhiteSpace($value) -or $insecureSecretValues -contains $value) {
            Write-Output "   ❌ $var uses an insecure placeholder/default value"
            $errors++
        } else {
            Write-Output "   ✅ $var configured"
        }
    }
} else {
    Write-Output "   ❌ .env file missing"
    $errors++
}

# Check 9: Port availability
Write-Output ""
Write-Output "9️⃣  Checking Port Availability..."
$configuredApiPort = 8001
$configuredPostgresPort = 5432

if (Test-Path ".env") {
    $apiPortMatch = [regex]::Match($envContent, '(?m)^API_PORT=(\d+)$')
    if ($apiPortMatch.Success) {
        $configuredApiPort = [int]$apiPortMatch.Groups[1].Value
    }

    $postgresPortMatch = [regex]::Match($envContent, '(?m)^POSTGRES_PORT=(\d+)$')
    if ($postgresPortMatch.Success) {
        $configuredPostgresPort = [int]$postgresPortMatch.Groups[1].Value
    }
}

$ports = @{
    $configuredApiPort = 'API'
    $configuredPostgresPort = 'PostgreSQL'
}
foreach ($port in $ports.Keys) {
    $connection = $null
    try {
        $connection = New-Object System.Net.Sockets.TcpClient('localhost', $port)
        Write-Output "   ⚠️  Port $port already in use (may conflict with $($ports[$port]))"
        $warnings++
    } catch {
        Write-Output "   ✅ Port $port available ($($ports[$port]))"
    } finally {
        if ($connection) { $connection.Close() }
    }
}

# Summary
Write-Output ""
Write-Output "=================================="
Write-Output "📊 Validation Summary"
Write-Output "=================================="
Write-Output ""

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Output "✅ All checks passed! Ready to run Docker."
    Write-Output ""
    Write-Output "Next steps:"
    Write-Output "  1. docker compose up -d"
    Write-Output "  2. Open http://localhost:8000"
    Write-Output ""
    exit 0
} elseif ($errors -eq 0) {
    Write-Output "⚠️  Validation completed with $warnings warning(s)"
    Write-Output "   You can proceed, but review warnings above."
    Write-Output ""
    Write-Output "To start anyway:"
    Write-Output "  docker compose up -d"
    Write-Output ""
    exit 0
} else {
    Write-Output "❌ Validation failed with $errors error(s) and $warnings warning(s)"
    Write-Output ""
    Write-Output "Please fix the errors above before running Docker."
    Write-Output ""
    
    # Provide fixes for common issues
    if ($missingFiles.Count -gt 0) {
        Write-Output "Missing Python files detected. Run:"
        Write-Output "  # Create missing __init__.py files"
        Write-Output '  New-Item -Path "src\api\__init__.py" -ItemType File -Force'
        Write-Output '  New-Item -Path "src\core\__init__.py" -ItemType File -Force'
        Write-Output '  New-Item -Path "src\storage\__init__.py" -ItemType File -Force'
        Write-Output ""
    }
    
    exit 1
}
