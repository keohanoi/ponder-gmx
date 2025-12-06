@echo off
REM GMX Indexer Docker Stack Startup Script (Windows Batch)
REM Usage: docker-start.bat [dev|prod|monitoring] [options]

setlocal EnableDelayedExpansion

REM Default values
set "ENVIRONMENT=dev"
set "DETACHED=false"
set "MONITORING=false"
set "PULL_IMAGES=false"
set "RESET_DATA=false"

REM Function to display help
if "%1"=="-h" goto :show_help
if "%1"=="--help" goto :show_help

REM Parse command line arguments
:parse_args
if "%1"=="" goto :main

if "%1"=="dev" (
    set "ENVIRONMENT=dev"
    shift
    goto :parse_args
)
if "%1"=="prod" (
    set "ENVIRONMENT=prod"
    shift
    goto :parse_args
)
if "%1"=="monitoring" (
    set "ENVIRONMENT=monitoring"
    shift
    goto :parse_args
)
if "%1"=="-d" (
    set "DETACHED=true"
    shift
    goto :parse_args
)
if "%1"=="--detached" (
    set "DETACHED=true"
    shift
    goto :parse_args
)
if "%1"=="-m" (
    set "MONITORING=true"
    shift
    goto :parse_args
)
if "%1"=="--monitoring" (
    set "MONITORING=true"
    shift
    goto :parse_args
)
if "%1"=="-p" (
    set "PULL_IMAGES=true"
    shift
    goto :parse_args
)
if "%1"=="--pull" (
    set "PULL_IMAGES=true"
    shift
    goto :parse_args
)
if "%1"=="-r" (
    set "RESET_DATA=true"
    shift
    goto :parse_args
)
if "%1"=="--reset" (
    set "RESET_DATA=true"
    shift
    goto :parse_args
)

echo Unknown argument: %1
goto :show_help

:main
echo 🚀 GMX Indexer Docker Stack Startup
echo ==================================
echo.

call :check_prerequisites
if errorlevel 1 exit /b 1

call :validate_environment
if errorlevel 1 exit /b 1

call :pull_images
if errorlevel 1 exit /b 1

call :reset_data
if errorlevel 1 exit /b 1

call :start_services
if errorlevel 1 exit /b 1

call :wait_for_services
call :show_access_info

goto :eof

:check_prerequisites
echo ℹ️  Checking prerequisites...

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not in PATH
    exit /b 1
)

REM Check Docker Compose
docker compose version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose v2 is required
    exit /b 1
)

REM Check environment file
if not exist .env (
    echo ⚠️  .env file not found. Creating from template...
    if exist .env.docker (
        copy .env.docker .env >nul
        echo ℹ️  Copied .env.docker to .env
        echo ⚠️  Please review and update .env file with your configuration
    ) else (
        echo ❌ .env.docker template not found
        exit /b 1
    )
)

echo ✅ Prerequisites check completed
echo.
goto :eof

:validate_environment
echo ℹ️  Validating environment configuration...

REM Check required variables (simplified check)
findstr /b "POSTGRES_PASSWORD=" .env >nul
if errorlevel 1 (
    echo ❌ Please configure POSTGRES_PASSWORD in .env
    exit /b 1
)

findstr /b "PONDER_RPC_URL_5003=" .env >nul
if errorlevel 1 (
    echo ❌ Please configure PONDER_RPC_URL_5003 in .env
    exit /b 1
)

echo ✅ Environment validation completed
echo.
goto :eof

:pull_images
if "%PULL_IMAGES%"=="true" (
    echo ℹ️  Pulling latest Docker images...
    docker compose pull
    if errorlevel 1 exit /b 1
    echo ✅ Images updated
    echo.
)
goto :eof

:reset_data
if "%RESET_DATA%"=="true" (
    echo ⚠️  Resetting all data volumes...
    set /p "confirm=Are you sure? This will delete all data (y/N): "
    if /i "!confirm!"=="y" (
        docker compose down -v
        docker volume prune -f
        echo ✅ Data reset completed
        echo.
    ) else (
        echo ℹ️  Data reset cancelled
        echo.
    )
)
goto :eof

:start_services
set "compose_files=-f docker-compose.yml"
set "env_name="

if "%ENVIRONMENT%"=="dev" (
    set "compose_files=!compose_files! -f docker-compose.dev.yml"
    set "env_name=Development"
)
if "%ENVIRONMENT%"=="prod" (
    set "compose_files=!compose_files! -f docker-compose.prod.yml"
    set "env_name=Production"
)
if "%ENVIRONMENT%"=="monitoring" (
    set "compose_files=!compose_files! -f docker-compose.monitoring.yml"
    set "env_name=Full Monitoring"
)

if "%MONITORING%"=="true" (
    if not "%ENVIRONMENT%"=="monitoring" (
        set "compose_files=!compose_files! -f docker-compose.monitoring.yml"
        set "env_name=!env_name! + Monitoring"
    )
)

echo ℹ️  Starting !env_name! environment...

set "docker_cmd=docker compose !compose_files! up"
if "%DETACHED%"=="true" (
    set "docker_cmd=!docker_cmd! -d"
)

!docker_cmd!
if errorlevel 1 exit /b 1

if "%DETACHED%"=="true" (
    echo ✅ !env_name! stack started successfully!
    echo ℹ️  Use 'docker compose logs -f' to view logs
    echo.
)
goto :eof

:wait_for_services
if "%DETACHED%"=="true" (
    echo ℹ️  Waiting for services to be ready...

    REM Wait for database (simplified)
    timeout /t 10 /nobreak >nul

    REM Wait for indexer (simplified)
    timeout /t 5 /nobreak >nul

    echo ✅ Services should be ready!
    echo.
)
goto :eof

:show_access_info
if "%DETACHED%"=="true" (
    echo.
    echo ℹ️  Access Information:

    if "%ENVIRONMENT%"=="dev" (
        echo   GraphQL API:     http://localhost:8080/graphql
        echo   GraphQL UI:      http://localhost:8080/graphiql
        echo   Database:        localhost:5432
        echo   Grafana:         http://localhost:3000 ^(admin/admin^)
        echo   Prometheus:      http://localhost:9091
    )
    if "%ENVIRONMENT%"=="prod" (
        echo   GraphQL API:     http://localhost/graphql
        echo   Health Check:    http://localhost/health
        echo   Note: Database and monitoring are internal only
    )
    if "%ENVIRONMENT%"=="monitoring" (
        echo   GraphQL API:     http://localhost/graphql
        echo   Grafana:         http://localhost:3000
        echo   Prometheus:      http://localhost:9091
        echo   Alertmanager:    http://localhost:9093
        echo   Jaeger UI:       http://localhost:16686
    )

    echo.
    echo ℹ️  Useful Commands:
    echo   Check status:    docker compose ps
    echo   View logs:       docker compose logs -f [service]
    echo   Stop stack:      docker compose down
    echo   Update stack:    docker-start.bat %ENVIRONMENT% -p -d
)
goto :eof

:show_help
echo GMX Indexer Docker Stack Startup Script (Windows)
echo.
echo Usage: %0 [ENVIRONMENT] [OPTIONS]
echo.
echo ENVIRONMENTS:
echo     dev         Development mode with hot reload (default)
echo     prod        Production mode with optimizations
echo     monitoring  Full monitoring stack
echo.
echo OPTIONS:
echo     -d, --detached     Run in detached mode (background)
echo     -m, --monitoring   Include monitoring services
echo     -p, --pull         Pull latest images before starting
echo     -r, --reset        Reset all data (⚠️  DATA LOSS)
echo     -h, --help         Show this help message
echo.
echo EXAMPLES:
echo     %0                           # Start development environment
echo     %0 prod -d                   # Start production in background
echo     %0 dev -m                    # Start dev with monitoring
echo     %0 prod -p -d                # Update images and start production
echo     %0 monitoring                # Start full monitoring stack
echo.
echo ENVIRONMENT FILES:
echo     .env                 - Main environment configuration
echo     .env.docker         - Docker-specific template
echo     .env.production     - Production template
echo.
echo ACCESS POINTS (Development):
echo     GraphQL API:     http://localhost:8080/graphql
echo     Grafana:        http://localhost:3000 (admin/admin)
echo     Prometheus:     http://localhost:9091
echo     Database:       localhost:5432
echo.
echo ACCESS POINTS (Production):
echo     GraphQL API:     http://localhost/graphql
echo     Monitoring:     Internal network only
goto :eof