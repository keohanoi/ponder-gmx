# GMX Indexer Docker Stack Startup Script (PowerShell)
# Usage: .\docker-start.ps1 [dev|prod|monitoring] [options]

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "prod", "monitoring")]
    [string]$Environment = "dev",

    [Alias("d")]
    [switch]$Detached,

    [Alias("m")]
    [switch]$Monitoring,

    [Alias("p")]
    [switch]$Pull,

    [Alias("r")]
    [switch]$Reset,

    [Alias("h")]
    [switch]$Help
)

# Colors for output (using Write-Host colors)
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
}

# Function to print colored output
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Colors.Info
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Colors.Success
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Colors.Warning
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Colors.Error
}

# Function to display help
function Show-Help {
    @"
GMX Indexer Docker Stack Startup Script (PowerShell)

Usage: .\docker-start.ps1 [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev         Development mode with hot reload (default)
    prod        Production mode with optimizations
    monitoring  Full monitoring stack

OPTIONS:
    -Detached, -d      Run in detached mode (background)
    -Monitoring, -m    Include monitoring services
    -Pull, -p          Pull latest images before starting
    -Reset, -r         Reset all data (⚠️  DATA LOSS)
    -Help, -h          Show this help message

EXAMPLES:
    .\docker-start.ps1                           # Start development environment
    .\docker-start.ps1 prod -Detached           # Start production in background
    .\docker-start.ps1 dev -Monitoring          # Start dev with monitoring
    .\docker-start.ps1 prod -Pull -Detached     # Update images and start production
    .\docker-start.ps1 monitoring               # Start full monitoring stack

ENVIRONMENT FILES:
    .env                 - Main environment configuration
    .env.docker         - Docker-specific template
    .env.production     - Production template

ACCESS POINTS (Development):
    GraphQL API:     http://localhost:8080/graphql
    Grafana:        http://localhost:3000 (admin/admin)
    Prometheus:     http://localhost:9091
    Database:       localhost:5432

ACCESS POINTS (Production):
    GraphQL API:     http://localhost/graphql
    Monitoring:     Internal network only
"@
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    # Check Docker
    try {
        $null = docker --version
    }
    catch {
        Write-Error "Docker is not installed or not in PATH"
        exit 1
    }

    # Check Docker Compose
    try {
        $null = docker compose version
    }
    catch {
        Write-Error "Docker Compose v2 is required"
        exit 1
    }

    # Check environment file
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating from template..."
        if (Test-Path ".env.docker") {
            Copy-Item ".env.docker" ".env"
            Write-Info "Copied .env.docker to .env"
            Write-Warning "Please review and update .env file with your configuration"
        } else {
            Write-Error ".env.docker template not found"
            exit 1
        }
    }

    Write-Success "Prerequisites check completed"
}

# Function to validate environment
function Test-Environment {
    Write-Info "Validating environment configuration..."

    # Check required variables
    $requiredVars = @("POSTGRES_PASSWORD", "PONDER_RPC_URL_5003")
    $missingVars = @()

    $envContent = Get-Content ".env" -ErrorAction SilentlyContinue

    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -match "^$var=" -and $_ -notmatch "change.*me" }
        if (-not $found) {
            $missingVars += $var
        }
    }

    if ($missingVars.Count -gt 0) {
        Write-Error "Please configure the following variables in .env:"
        foreach ($var in $missingVars) {
            Write-Host "  - $var"
        }
        exit 1
    }

    Write-Success "Environment validation completed"
}

# Function to pull images
function Update-Images {
    if ($Pull) {
        Write-Info "Pulling latest Docker images..."
        docker compose pull
        if ($LASTEXITCODE -ne 0) { exit 1 }
        Write-Success "Images updated"
    }
}

# Function to reset data
function Reset-Data {
    if ($Reset) {
        Write-Warning "Resetting all data volumes..."
        $confirmation = Read-Host "Are you sure? This will delete all data (y/N)"
        if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
            docker compose down -v
            docker volume prune -f
            Write-Success "Data reset completed"
        } else {
            Write-Info "Data reset cancelled"
        }
    }
}

# Function to start services
function Start-Services {
    $composeFiles = @("-f", "docker-compose.yml")
    $envName = ""

    switch ($Environment) {
        "dev" {
            $composeFiles += @("-f", "docker-compose.dev.yml")
            $envName = "Development"
        }
        "prod" {
            $composeFiles += @("-f", "docker-compose.prod.yml")
            $envName = "Production"
        }
        "monitoring" {
            $composeFiles += @("-f", "docker-compose.monitoring.yml")
            $envName = "Full Monitoring"
        }
    }

    if ($Monitoring -and $Environment -ne "monitoring") {
        $composeFiles += @("-f", "docker-compose.monitoring.yml")
        $envName = "$envName + Monitoring"
    }

    Write-Info "Starting $envName environment..."

    $dockerCmd = @("docker", "compose") + $composeFiles + @("up")

    if ($Detached) {
        $dockerCmd += "-d"
    }

    # Execute docker compose command
    & $dockerCmd[0] $dockerCmd[1..($dockerCmd.Length-1)]
    if ($LASTEXITCODE -ne 0) { exit 1 }

    if ($Detached) {
        Write-Success "$envName stack started successfully!"
        Write-Info "Use 'docker compose logs -f' to view logs"
    }
}

# Function to wait for services
function Wait-ForServices {
    if ($Detached) {
        Write-Info "Waiting for services to be ready..."

        # Wait for database
        $attempts = 0
        $maxAttempts = 30
        do {
            Start-Sleep -Seconds 2
            $attempts++
            try {
                $null = docker compose exec -T postgres pg_isready -U gmx_user 2>$null
                $dbReady = $LASTEXITCODE -eq 0
            }
            catch {
                $dbReady = $false
            }
        } while (-not $dbReady -and $attempts -lt $maxAttempts)

        # Wait for indexer
        $attempts = 0
        $maxAttempts = 30
        do {
            Start-Sleep -Seconds 2
            $attempts++
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:42069/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
                $indexerReady = $response.StatusCode -eq 200
            }
            catch {
                $indexerReady = $false
            }
        } while (-not $indexerReady -and $attempts -lt $maxAttempts)

        if ($attempts -eq $maxAttempts) {
            Write-Warning "Indexer health check failed, but services may still be starting"
        } else {
            Write-Success "All services are ready!"
        }
    }
}

# Function to display access information
function Show-AccessInfo {
    if ($Detached) {
        Write-Host ""
        Write-Info "Access Information:"

        switch ($Environment) {
            "dev" {
                Write-Host "  GraphQL API:     http://localhost:8080/graphql"
                Write-Host "  GraphQL UI:      http://localhost:8080/graphiql"
                Write-Host "  Database:        localhost:5432"
                Write-Host "  Grafana:         http://localhost:3000 (admin/admin)"
                Write-Host "  Prometheus:      http://localhost:9091"
            }
            "prod" {
                Write-Host "  GraphQL API:     http://localhost/graphql"
                Write-Host "  Health Check:    http://localhost/health"
                Write-Host "  Note: Database and monitoring are internal only"
            }
            "monitoring" {
                Write-Host "  GraphQL API:     http://localhost/graphql"
                Write-Host "  Grafana:         http://localhost:3000"
                Write-Host "  Prometheus:      http://localhost:9091"
                Write-Host "  Alertmanager:    http://localhost:9093"
                Write-Host "  Jaeger UI:       http://localhost:16686"
            }
        }

        Write-Host ""
        Write-Info "Useful Commands:"
        Write-Host "  Check status:    docker compose ps"
        Write-Host "  View logs:       docker compose logs -f [service]"
        Write-Host "  Stop stack:      docker compose down"
        Write-Host "  Update stack:    .\docker-start.ps1 $Environment -Pull -Detached"
    }
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
        return
    }

    Write-Host "🚀 GMX Indexer Docker Stack Startup" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""

    Test-Prerequisites
    Test-Environment
    Update-Images
    Reset-Data
    Start-Services
    Wait-ForServices
    Show-AccessInfo
}

# Run main function
Main