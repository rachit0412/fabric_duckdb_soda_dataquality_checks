#!/usr/bin/env pwsh
# Security Testing Script
# Tests container security hardening

Write-Output ""
Write-Output "=================================="
Write-Output "🔐 Security Validation Tests"
Write-Output "=================================="
Write-Output ""

$passed = 0
$failed = 0
$warnings = 0

# Check if containers are running
Write-Output "0️⃣  Checking if containers are running..."
$apiRunning = docker compose ps -q data-quality-api
if (-not $apiRunning) {
    Write-Output "   ⚠️  Containers not running. Start with: docker compose up -d"
    Write-Output ""
    exit 1
}
Write-Output "   ✅ Containers are running"
Write-Output ""

# Test 1: Non-root user
Write-Output "1️⃣  Testing Non-Root User Execution..."
$result = docker compose exec -T data-quality-api whoami 2>&1
if ($result -match "appuser") {
    Write-Output "   ✅ Running as non-root user: $result"
    $passed++
} else {
    Write-Output "   ❌ SECURITY RISK: Running as root!"
    $failed++
}

# Test 2: File system immutability
Write-Output ""
Write-Output "2️⃣  Testing Read-Only Root Filesystem..."
$result = docker compose exec -T data-quality-api sh -c "echo 'test' > /app/test.txt 2>&1"
if ($result -match "Read-only file system" -or $result -match "Permission denied") {
    Write-Output "   ✅ Root filesystem is read-only"
    $passed++
} else {
    Write-Output "   ❌ SECURITY RISK: Filesystem is writable!"
    Write-Output "   Output: $result"
    $failed++
}

# Test 3: Sudo/privilege escalation
Write-Output ""
Write-Output "3️⃣  Testing Privilege Escalation Prevention..."
$result = docker compose exec -T data-quality-api sh -c "sudo whoami 2>&1"
if ($result -match "not found" -or $result -match "Permission denied") {
    Write-Output "   ✅ Sudo not available"
    $passed++
} else {
    Write-Output "   ⚠️  WARNING: Sudo might be available"
    Write-Output "   Output: $result"
    $warnings++
}

# Test 4: Network isolation (PostgreSQL)
Write-Output ""
Write-Output "4️⃣  Testing Network Isolation..."
try {
    $connection = New-Object System.Net.Sockets.TcpClient('localhost', 5432)
    $connection.Close()
    Write-Output "   ⚠️  WARNING: PostgreSQL port exposed to host"
    $warnings++
} catch {
    Write-Output "   ✅ PostgreSQL not accessible from host (isolated)"
    $passed++
}

# Test 5: Resource limits
Write-Output ""
Write-Output "5️⃣  Testing Resource Limits..."
$result = docker inspect dq-platform-api --format '{{.HostConfig.Memory}}'
if ($result -gt 0) {
    $memoryGB = [math]::Round($result / 1GB, 2)
    Write-Output "   ✅ Memory limit: $memoryGB GB"
    $passed++
} else {
    Write-Output "   ⚠️  WARNING: No memory limit set"
    $warnings++
}

# Test 6: Capabilities
Write-Output ""
Write-Output "6️⃣  Testing Dropped Capabilities..."
$result = docker inspect dq-platform-api --format '{{.HostConfig.CapDrop}}'
if ($result -match "ALL") {
    Write-Output "   ✅ All capabilities dropped"
    $passed++
} else {
    Write-Output "   ⚠️  WARNING: Not all capabilities dropped"
    Write-Output "   Dropped: $result"
    $warnings++
}

# Test 7: Security options
Write-Output ""
Write-Output "7️⃣  Testing Security Options..."
$result = docker inspect dq-platform-api --format '{{.HostConfig.SecurityOpt}}'
if ($result -match "no-new-privileges") {
    Write-Output "   ✅ No new privileges enforced"
    $passed++
} else {
    Write-Output "   ❌ SECURITY RISK: New privileges allowed!"
    $failed++
}

# Test 8: Writable volumes
Write-Output ""
Write-Output "8️⃣  Testing Volume Permissions..."
$result = docker compose exec -T data-quality-api sh -c "echo 'test' > /app/logs/security-test.log 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Output "   ✅ Logs directory writable (as designed)"
    # Clean up
    docker compose exec -T data-quality-api sh -c "rm /app/logs/security-test.log 2>&1" | Out-Null
    $passed++
} else {
    Write-Output "   ❌ Cannot write to logs directory"
    Write-Output "   Output: $result"
    $failed++
}

# Test 9: Data directory is read-only
Write-Output ""
Write-Output "9️⃣  Testing Data Directory (Read-Only)..."
$result = docker compose exec -T data-quality-api sh -c "echo 'test' > /app/data/test.txt 2>&1"
if ($result -match "Read-only file system" -or $result -match "Permission denied") {
    Write-Output "   ✅ Data directory is read-only"
    $passed++
} else {
    Write-Output "   ⚠️  WARNING: Data directory might be writable"
    Write-Output "   Output: $result"
    $warnings++
}

# Test 10: Container restart policy
Write-Output ""
Write-Output "🔟 Testing Container Restart Policy..."
$result = docker inspect dq-platform-api --format '{{.HostConfig.RestartPolicy.Name}}'
if ($result -match "unless-stopped") {
    Write-Output "   ✅ Restart policy: $result"
    $passed++
} else {
    Write-Output "   ⚠️  Restart policy: $result"
    $warnings++
}

# Summary
Write-Output ""
Write-Output "=================================="
Write-Output "📊 Security Test Summary"
Write-Output "=================================="
Write-Output ""
Write-Output "✅ Passed:   $passed tests"
Write-Output "❌ Failed:   $failed tests"
Write-Output "⚠️  Warnings: $warnings tests"
Write-Output ""

if ($failed -eq 0 -and $warnings -eq 0) {
    Write-Output "🟢 EXCELLENT: All security tests passed!"
    Write-Output "   Your container is production-ready and hardened."
    exit 0
} elseif ($failed -eq 0) {
    Write-Output "🟡 GOOD: All critical tests passed with $warnings warning(s)"
    Write-Output "   Review warnings above for potential improvements."
    exit 0
} else {
    Write-Output "🔴 CRITICAL: $failed security test(s) failed!"
    Write-Output "   Fix critical issues before deploying to production."
    exit 1
}
