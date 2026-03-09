#!/usr/bin/env pwsh
# Restore production database backup to development database
# Reads from local backup file (non-destructive to source)
# Writes only to dev database (via PG-GP-DB-URL-DEV from Key Vault)
# WARNING: This will OVERWRITE the dev database with prod data

param(
  [string]$BackupFile = $null,
  [switch]$Force        # Skip confirmation prompt
)

$ErrorActionPreference = "Stop"

function Confirm-Action {
  param([string]$Message)
  
  Write-Host $Message -ForegroundColor Yellow
  $response = Read-Host "Type 'yes' to confirm"
  
  if ($response -ne "yes") {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 0
  }
}

Write-Host "🔄 RESTORE PROD BACKUP TO DEV DATABASE" -ForegroundColor Cyan
Write-Host "⚠️  WARNING: This will overwrite dev database with prod data!" -ForegroundColor Red

# Find backup file
if (-not $BackupFile) {
  $BackupDir = ".backups"
  
  if (-not (Test-Path $BackupDir)) {
    Write-Host "❌ Backup directory not found: $BackupDir" -ForegroundColor Red
    exit 1
  }
  
  $backups = @(Get-ChildItem $BackupDir -Filter "prod-backup_*.sql" | 
    Where-Object { $_.Name -notlike "*schema-only*" -and $_.Name -notlike "*data-only*" } |
    Sort-Object LastWriteTime -Descending)
  
  if ($backups.Count -eq 0) {
    Write-Host "❌ No production backups found in $BackupDir" -ForegroundColor Red
    Write-Host "   (Looking for prod-backup_*.sql, excluding schema-only/data-only)" -ForegroundColor Gray
    exit 1
  }
  
  $latestBackup = $backups[0]
  Write-Host "Using latest backup: $($latestBackup.Name)" -ForegroundColor Cyan
  $backupSize = $latestBackup.Length / 1MB
  $BackupFile = $latestBackup.FullName
} else {
  if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
  }
  Write-Host "Using specified backup: $BackupFile" -ForegroundColor Cyan
  $backupSize = (Get-Item $BackupFile).Length / 1MB
}

Write-Host "Backup size: $([math]::Round($backupSize, 2)) MB" -ForegroundColor Gray

# Get dev database URL from Key Vault
Write-Host "`nRetrieving dev database URL from Azure Key Vault..." -ForegroundColor Cyan

try {
  $devDbUrl = Get-AzKeyVaultSecret -VaultName 'Homotechsual' -Name 'PG-GP-DB-URL-DEV' -AsPlainText -ErrorAction SilentlyContinue
  if ($devDbUrl) {
    Write-Host "✓ Retrieved from Azure Key Vault" -ForegroundColor Green
  }
} catch {
  Write-Host "⚠️  Key Vault access failed" -ForegroundColor Yellow
}

if (-not $devDbUrl) {
  Write-Host "❌ Could not retrieve PG-GP-DB-URL-DEV from Key Vault" -ForegroundColor Red
  exit 1
}

if ($devDbUrl -match '\[YOUR-') {
  Write-Host "❌ Dev database URL contains placeholder values" -ForegroundColor Red
  exit 1
}

# Confirmation
if (-not $Force) {
  Confirm-Action "`nThis will REPLACE dev database with prod data from $([System.IO.Path]::GetFileName($BackupFile))`nContinue?"
}

Write-Host "`n⏳ Starting restore..." -ForegroundColor Cyan
Write-Host "Reading from: $BackupFile" -ForegroundColor Gray
Write-Host "Writing to: dev database (PG-GP-DB-URL-DEV)" -ForegroundColor Gray

# Check for psql
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host "❌ psql not found" -ForegroundColor Red
  Write-Host "Install PostgreSQL client tools" -ForegroundColor Yellow
  exit 1
}

# Perform restore
try {
  # Read backup and pipe to psql (single operation)
  Get-Content $BackupFile | psql $devDbUrl --quiet
  
  Write-Host "`n✅ Restore complete!" -ForegroundColor Green
  Write-Host "Dev database now contains prod data snapshot from:" -ForegroundColor Cyan
  Write-Host "  $(Split-Path -Leaf $BackupFile)" -ForegroundColor Cyan
  
  Write-Host "`n⚡ Next steps:" -ForegroundColor Yellow
  Write-Host "  1. Dev auth system still different from prod" -ForegroundColor Gray
  Write-Host "  2. Characters will be linked to old prod auth UUIDs" -ForegroundColor Gray
  Write-Host "  3. Perfect for testing Discord ID migration!" -ForegroundColor Gray
  
} catch {
  Write-Host "`n❌ Restore failed!" -ForegroundColor Red
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
}
