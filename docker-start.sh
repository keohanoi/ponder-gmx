#!/bin/bash

# GMX Indexer Docker Stack Startup Script
# Usage: ./docker-start.sh [dev|prod|monitoring] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
DETACHED=false
MONITORING=false
PULL_IMAGES=false
RESET_DATA=false

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to display help
show_help() {
    cat << EOF
GMX Indexer Docker Stack Startup Script

Usage: $0 [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev         Development mode with hot reload (default)
    prod        Production mode with optimizations
    monitoring  Full monitoring stack

OPTIONS:
    -d, --detached     Run in detached mode (background)
    -m, --monitoring   Include monitoring services
    -p, --pull         Pull latest images before starting
    -r, --reset        Reset all data (⚠️  DATA LOSS)
    -h, --help         Show this help message

EXAMPLES:
    $0                           # Start development environment
    $0 prod -d                   # Start production in background
    $0 dev -m                    # Start dev with monitoring
    $0 prod -p -d                # Update images and start production
    $0 monitoring                # Start full monitoring stack

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
EOF
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose v2 is required"
        exit 1
    fi

    # Check environment file
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f .env.docker ]; then
            cp .env.docker .env
            print_info "Copied .env.docker to .env"
            print_warning "Please review and update .env file with your configuration"
        else
            print_error ".env.docker template not found"
            exit 1
        fi
    fi

    print_success "Prerequisites check completed"
}

# Function to validate environment
validate_environment() {
    print_info "Validating environment configuration..."

    # Check required variables
    local required_vars=("POSTGRES_PASSWORD" "PONDER_RPC_URL_5003")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=.*change.*me" .env; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Please configure the following variables in .env:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi

    print_success "Environment validation completed"
}

# Function to pull images
pull_images() {
    if [ "$PULL_IMAGES" = true ]; then
        print_info "Pulling latest Docker images..."
        docker compose pull
        print_success "Images updated"
    fi
}

# Function to reset data
reset_data() {
    if [ "$RESET_DATA" = true ]; then
        print_warning "Resetting all data volumes..."
        read -p "Are you sure? This will delete all data (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose down -v
            docker volume prune -f
            print_success "Data reset completed"
        else
            print_info "Data reset cancelled"
        fi
    fi
}

# Function to start services
start_services() {
    local compose_files=("-f" "docker-compose.yml")
    local env_name=""

    case $ENVIRONMENT in
        "dev")
            compose_files+=("-f" "docker-compose.dev.yml")
            env_name="Development"
            ;;
        "prod")
            compose_files+=("-f" "docker-compose.prod.yml")
            env_name="Production"
            ;;
        "monitoring")
            compose_files+=("-f" "docker-compose.monitoring.yml")
            env_name="Full Monitoring"
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac

    if [ "$MONITORING" = true ] && [ "$ENVIRONMENT" != "monitoring" ]; then
        compose_files+=("-f" "docker-compose.monitoring.yml")
        env_name="$env_name + Monitoring"
    fi

    print_info "Starting $env_name environment..."

    local docker_cmd=("docker" "compose" "${compose_files[@]}" "up")

    if [ "$DETACHED" = true ]; then
        docker_cmd+=("-d")
    fi

    # Execute docker compose command
    "${docker_cmd[@]}"

    if [ "$DETACHED" = true ]; then
        print_success "$env_name stack started successfully!"
        print_info "Use 'docker compose logs -f' to view logs"
    fi
}

# Function to display access information
show_access_info() {
    if [ "$DETACHED" = true ]; then
        echo
        print_info "Access Information:"

        case $ENVIRONMENT in
            "dev")
                echo "  GraphQL API:     http://localhost:8080/graphql"
                echo "  GraphQL UI:      http://localhost:8080/graphiql"
                echo "  Database:        localhost:5432"
                echo "  Grafana:         http://localhost:3000 (admin/admin)"
                echo "  Prometheus:      http://localhost:9091"
                ;;
            "prod")
                echo "  GraphQL API:     http://localhost/graphql"
                echo "  Health Check:    http://localhost/health"
                echo "  Note: Database and monitoring are internal only"
                ;;
            "monitoring")
                echo "  GraphQL API:     http://localhost/graphql"
                echo "  Grafana:         http://localhost:3000"
                echo "  Prometheus:      http://localhost:9091"
                echo "  Alertmanager:    http://localhost:9093"
                echo "  Jaeger UI:       http://localhost:16686"
                ;;
        esac

        echo
        print_info "Useful Commands:"
        echo "  Check status:    docker compose ps"
        echo "  View logs:       docker compose logs -f [service]"
        echo "  Stop stack:      docker compose down"
        echo "  Update stack:    $0 $ENVIRONMENT -p -d"
    fi
}

# Function to wait for services
wait_for_services() {
    if [ "$DETACHED" = true ]; then
        print_info "Waiting for services to be ready..."

        # Wait for database
        until docker compose exec -T postgres pg_isready -U gmx_user >/dev/null 2>&1; do
            sleep 2
        done

        # Wait for indexer
        local max_attempts=30
        local attempt=0
        until curl -f http://localhost:42069/health >/dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
            sleep 2
            ((attempt++))
        done

        if [ $attempt -eq $max_attempts ]; then
            print_warning "Indexer health check failed, but services may still be starting"
        else
            print_success "All services are ready!"
        fi
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|prod|monitoring)
            ENVIRONMENT="$1"
            shift
            ;;
        -d|--detached)
            DETACHED=true
            shift
            ;;
        -m|--monitoring)
            MONITORING=true
            shift
            ;;
        -p|--pull)
            PULL_IMAGES=true
            shift
            ;;
        -r|--reset)
            RESET_DATA=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown argument: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "🚀 GMX Indexer Docker Stack Startup"
    echo "=================================="

    check_prerequisites
    validate_environment
    pull_images
    reset_data
    start_services
    wait_for_services
    show_access_info
}

# Run main function
main