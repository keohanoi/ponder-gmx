# GMX Indexer Docker Stack Makefile
# Provides convenient commands for managing the Docker stack

.PHONY: help dev prod monitoring stop clean logs health backup restore

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_DEV := -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_PROD := -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_MONITORING := -f docker-compose.yml -f docker-compose.monitoring.yml

## Display help information
help:
	@echo "GMX Indexer Docker Stack Commands"
	@echo "================================="
	@echo ""
	@echo "Environment Commands:"
	@echo "  dev           Start development environment"
	@echo "  prod          Start production environment"
	@echo "  monitoring    Start full monitoring stack"
	@echo ""
	@echo "Management Commands:"
	@echo "  stop          Stop all services"
	@echo "  restart       Restart all services"
	@echo "  clean         Stop and remove all containers/volumes"
	@echo "  pull          Pull latest images"
	@echo ""
	@echo "Utility Commands:"
	@echo "  logs          Show logs for all services"
	@echo "  logs-f        Follow logs for all services"
	@echo "  health        Check health of all services"
	@echo "  ps            Show running services"
	@echo ""
	@echo "Database Commands:"
	@echo "  db-shell      Open PostgreSQL shell"
	@echo "  db-backup     Backup database"
	@echo "  db-restore    Restore database from backup"
	@echo ""
	@echo "Monitoring Commands:"
	@echo "  grafana       Open Grafana in browser"
	@echo "  prometheus    Open Prometheus in browser"
	@echo ""
	@echo "Examples:"
	@echo "  make dev                    # Start development environment"
	@echo "  make prod                   # Start production environment"
	@echo "  make logs service=postgres  # Show logs for specific service"

## Start development environment
dev:
	@echo "🚀 Starting development environment..."
	@if [ ! -f .env ]; then \
		echo "📋 Creating .env from template..."; \
		cp .env.docker .env; \
		echo "⚠️  Please review and update .env file"; \
	fi
	docker compose $(COMPOSE_DEV) up -d
	@echo "✅ Development environment started"
	@echo "📊 Access points:"
	@echo "   GraphQL API: http://localhost:8080/graphql"
	@echo "   Grafana:     http://localhost:3000 (admin/admin)"
	@echo "   Prometheus:  http://localhost:9091"

## Start production environment
prod:
	@echo "🚀 Starting production environment..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file required for production"; \
		echo "   Copy .env.production and configure it"; \
		exit 1; \
	fi
	docker compose $(COMPOSE_PROD) up -d
	@echo "✅ Production environment started"
	@echo "📊 Access points:"
	@echo "   GraphQL API: http://localhost/graphql"

## Start monitoring stack
monitoring:
	@echo "🚀 Starting full monitoring stack..."
	docker compose $(COMPOSE_MONITORING) up -d
	@echo "✅ Monitoring stack started"
	@echo "📊 Access points:"
	@echo "   GraphQL API:    http://localhost/graphql"
	@echo "   Grafana:        http://localhost:3000"
	@echo "   Prometheus:     http://localhost:9091"
	@echo "   Alertmanager:   http://localhost:9093"

## Stop all services
stop:
	@echo "🛑 Stopping all services..."
	docker compose down
	@echo "✅ All services stopped"

## Restart services
restart: stop
	@echo "🔄 Restarting services..."
	$(MAKE) dev

## Clean up everything (⚠️ DATA LOSS)
clean:
	@echo "🧹 Cleaning up all containers, networks, and volumes..."
	@read -p "This will delete all data. Are you sure? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker compose down -v --remove-orphans; \
		docker system prune -f; \
		echo "✅ Cleanup completed"; \
	else \
		echo "❌ Cleanup cancelled"; \
	fi

## Pull latest images
pull:
	@echo "📥 Pulling latest images..."
	docker compose pull
	@echo "✅ Images updated"

## Show logs for all services or specific service
logs:
	@if [ -n "$(service)" ]; then \
		echo "📋 Showing logs for $(service)..."; \
		docker compose logs --tail=100 $(service); \
	else \
		echo "📋 Showing logs for all services..."; \
		docker compose logs --tail=50; \
	fi

## Follow logs for all services or specific service
logs-f:
	@if [ -n "$(service)" ]; then \
		echo "📋 Following logs for $(service)..."; \
		docker compose logs -f $(service); \
	else \
		echo "📋 Following logs for all services..."; \
		docker compose logs -f; \
	fi

## Check health of all services
health:
	@echo "🏥 Checking service health..."
	@docker compose ps
	@echo ""
	@echo "🔍 Health checks:"
	@echo -n "PostgreSQL: "; \
	if docker compose exec -T postgres pg_isready -U gmx_user >/dev/null 2>&1; then \
		echo "✅ Healthy"; \
	else \
		echo "❌ Unhealthy"; \
	fi
	@echo -n "Redis: "; \
	if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then \
		echo "✅ Healthy"; \
	else \
		echo "❌ Unhealthy"; \
	fi
	@echo -n "GMX Indexer: "; \
	if curl -f http://localhost:42069/health >/dev/null 2>&1; then \
		echo "✅ Healthy"; \
	else \
		echo "❌ Unhealthy"; \
	fi

## Show running services
ps:
	docker compose ps

## Open PostgreSQL shell
db-shell:
	@echo "🐘 Opening PostgreSQL shell..."
	docker compose exec postgres psql -U gmx_user -d gmx_indexer

## Backup database
db-backup:
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	docker compose exec -T postgres pg_dump -U gmx_user gmx_indexer | gzip > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql.gz
	@echo "✅ Backup created in backups/ directory"

## Restore database from backup
db-restore:
	@if [ -z "$(file)" ]; then \
		echo "❌ Please specify backup file: make db-restore file=backup.sql.gz"; \
		exit 1; \
	fi
	@echo "🔄 Restoring database from $(file)..."
	@echo "⚠️  This will replace all current data!"
	@read -p "Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		gunzip -c $(file) | docker compose exec -T postgres psql -U gmx_user -d gmx_indexer; \
		echo "✅ Database restored"; \
	else \
		echo "❌ Restore cancelled"; \
	fi

## Open Grafana in browser
grafana:
	@echo "📊 Opening Grafana..."
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:3000; \
	elif command -v open >/dev/null 2>&1; then \
		open http://localhost:3000; \
	else \
		echo "Please open http://localhost:3000 in your browser"; \
	fi

## Open Prometheus in browser
prometheus:
	@echo "📊 Opening Prometheus..."
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:9091; \
	elif command -v open >/dev/null 2>&1; then \
		open http://localhost:9091; \
	else \
		echo "Please open http://localhost:9091 in your browser"; \
	fi

## Development helpers
dev-rebuild:
	@echo "🔨 Rebuilding development environment..."
	docker compose $(COMPOSE_DEV) up -d --build

prod-rebuild:
	@echo "🔨 Rebuilding production environment..."
	docker compose $(COMPOSE_PROD) up -d --build

## Update and restart
update: pull restart

## Quick status check
status: health

## Alias for common commands
up: dev
down: stop
build: dev-rebuild