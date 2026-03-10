#!/usr/bin/env pwsh
# Backup the production database locally (non-destructive read-only dump)
# Retrieves SUPABASE_DB_PROD_URL from Azure Key Vault: Homotechsual/PG-GP-DB-URL-PROD
# Falls back to environment variable if Key Vault unavailable
# Creates timestamped backup files with both schema and data

param(
  [string]$BackupPath = $null,
  [switch]$SchemaOnly,    # Only dump schema, not data
  [switch]$DataOnly       # Only dump data, not schema
)

$ErrorActionPreference = "Stop"

function Import-EnvFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    Write-Host "⚠️  Env file not found: $Path (skipping)" -ForegroundColor Yellow
    return
  }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $parts = $line -split '=', 2
    if ($parts.Count -ne 2) { return }
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

# Determine backup path
if (-not $BackupPath) {
  $BackupPath = [Environment]::GetEnvironmentVariable("GP_BACKUPPATH", "User")
}

if (-not $BackupPath) {
  # Default to .backups in project root
  $BackupPath = Join-Path (Get-Location) ".backups"
}

# Ensure backup directory exists
if (-not (Test-Path $BackupPath)) {
  Write-Host "Creating backup directory: $BackupPath" -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
}

Write-Host "📦 PRODUCTION DATABASE BACKUP (Read-only)" -ForegroundColor Cyan
Write-Host "Backup path: $BackupPath" -ForegroundColor Cyan

# Load env files (for fallback)
Write-Host "Loading environment..." -ForegroundColor Cyan
Import-EnvFile ".env.local"
Import-EnvFile ".env.production"

# Get production database URL from Azure Key Vault or fallback to env
$prodDbUrl = $null

Write-Host "Retrieving production database URL..." -ForegroundColor Cyan

# Try Azure Key Vault first
try {
  $kvSecret = Get-AzKeyVaultSecret -VaultName 'Homotechsual' -Name 'PG-GP-DB-URL-PROD' -AsPlainText -ErrorAction SilentlyContinue
  if ($kvSecret) {
    $prodDbUrl = $kvSecret
    Write-Host "✓ Retrieved from Azure Key Vault" -ForegroundColor Green
  }
} catch {
  Write-Host "⚠️  Key Vault access failed, checking environment variables..." -ForegroundColor Yellow
}

# Fallback to environment variable
if (-not $prodDbUrl) {
  $prodDbUrl = [Environment]::GetEnvironmentVariable("SUPABASE_DB_PROD_URL", "Process")
  if ($prodDbUrl) {
    Write-Host "✓ Retrieved from environment variable" -ForegroundColor Green
  }
}

# Validate we have the URL
if (-not $prodDbUrl) {
  Write-Host "❌ Production database URL not found" -ForegroundColor Red
  Write-Host "   Check: Get-AzKeyVaultSecret -VaultName 'Homotechsual' -Name 'PG-GP-DB-URL-PROD' -AsPlainText" -ForegroundColor Yellow
  Write-Host "   Or set: SUPABASE_DB_PROD_URL in environment" -ForegroundColor Yellow
  exit 1
}

if ($prodDbUrl -match '\[YOUR-') {
  Write-Host "❌ Production database URL contains placeholder values" -ForegroundColor Red
  exit 1
}

# Check for pg_dump
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Host "❌ pg_dump not found" -ForegroundColor Red
  Write-Host "Install PostgreSQL client tools" -ForegroundColor Yellow
  exit 1
}

# Build pg_dump options
$dumpOptions = @()
if ($DataOnly) {
  $dumpOptions += "--data-only"
} elseif ($SchemaOnly) {
  $dumpOptions += "--schema-only"
}

# Generate timestamp-based filename
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$filename = "prod-backup_$timestamp.sql"

if ($DataOnly) {
  $filename = "prod-backup_data-only_$timestamp.sql"
} elseif ($SchemaOnly) {
  $filename = "prod-backup_schema-only_$timestamp.sql"
}

$backupFile = Join-Path $BackupPath $filename

Write-Host "`n⏳ Starting backup..." -ForegroundColor Cyan
Write-Host "Destination: $backupFile" -ForegroundColor Gray
Write-Host "Options: $(if ($dumpOptions) { $dumpOptions -join ' ' } else { 'Full backup (schema + data)' })" -ForegroundColor Gray

# Perform backup (read-only, non-destructive)
try {
  pg_dump $prodDbUrl @dumpOptions | Out-File -FilePath $backupFile -Encoding utf8
  
  $fileSize = (Get-Item $backupFile).Length
  Write-Host "`n✅ Backup complete!" -ForegroundColor Green
  Write-Host "File size: $([math]::Round($fileSize / 1MB, 2)) MB" -ForegroundColor Cyan
  
  # Show latest 5 backups
  Write-Host "`n📋 Latest production backups:" -ForegroundColor Gray
  Get-ChildItem $BackupPath -Filter "prod-backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    $modified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "  $($_.Name) - $size`MB ($modified)" -ForegroundColor Gray
  }
  
} catch {
  Write-Host "`n❌ Backup failed!" -ForegroundColor Red
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
}
