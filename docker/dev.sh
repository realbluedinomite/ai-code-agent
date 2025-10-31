#!/bin/bash
# Docker Management Script for AI Code Agent Development
# 
# This script helps manage the Docker development environment with database services.
# 
# Usage:
#   ./docker/dev.sh start          # Start all services
#   ./docker/dev.sh stop           # Stop all services
#   ./docker/dev.sh restart        # Restart all services
#   ./docker/dev.sh status         # Show service status
#   ./docker/dev.sh logs           # Show logs
#   ./docker/dev.sh backup         # Create database backup
#   ./docker/dev.sh restore <file> # Restore from backup
#   ./docker/dev.sh reset          # Reset database (WARNING: deletes all data)
#   ./docker/dev.sh pgadmin        # Open pgAdmin in browser
#   ./docker/dev.sh setup          # Initial setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="ai-code-agent"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker and Docker Compose are available
check_prerequisites() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_status "Prerequisites check passed"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p docker/postgres/data
    mkdir -p docker/redis/data
    mkdir -p docker/pgadmin/data
    mkdir -p backups
    mkdir -p logs
    print_success "Directories created"
}

# Function to start services
start_services() {
    print_status "Starting Docker services..."
    docker-compose up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services started successfully!"
        print_status "Services available at:"
        echo "  - PostgreSQL: localhost:5432"
        echo "  - Redis: localhost:6379"
        echo "  - pgAdmin: http://localhost:8080"
        echo "  - pgAdmin login: admin@ai-code-agent.local / admin123"
    else
        print_error "Some services failed to start. Check logs with: ./docker/dev.sh logs"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    print_status "Stopping Docker services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to restart services
restart_services() {
    print_status "Restarting Docker services..."
    docker-compose restart
    print_success "Services restarted"
}

# Function to show service status
show_status() {
    print_status "Docker Services Status:"
    echo ""
    docker-compose ps
    echo ""
    print_status "Service URLs:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo "  - pgAdmin: http://localhost:8080"
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        docker-compose logs -f "$service"
    else
        print_status "Showing all service logs..."
        docker-compose logs -f
    fi
}

# Function to create database backup
create_backup() {
    local backup_dir="./backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/backup_$timestamp.sql"
    
    print_status "Creating database backup..."
    docker-compose exec -T postgres pg_dump -U ai_agent_user -d ai_code_agent > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        print_success "Backup created: $backup_file"
    else
        print_error "Failed to create backup"
        exit 1
    fi
}

# Function to restore database
restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        print_error "Please provide a valid backup file"
        echo "Available backups:"
        ls -la ./backups/*.sql 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    print_warning "This will overwrite the current database. Are you sure? (y/N)"
    read -r confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Restoring database from $backup_file..."
    docker-compose exec -T postgres psql -U ai_agent_user -d ai_code_agent < "$backup_file"
    print_success "Database restored from $backup_file"
}

# Function to reset database (WARNING: deletes all data)
reset_database() {
    print_warning "This will delete ALL data in the database!"
    print_warning "Are you sure? Type 'RESET' to confirm:"
    read -r confirm
    
    if [[ $confirm != "RESET" ]]; then
        print_status "Reset cancelled"
        exit 0
    fi
    
    print_status "Resetting database..."
    docker-compose stop postgres
    docker volume rm "${PROJECT_NAME}_postgres_data" 2>/dev/null || true
    docker-compose up -d postgres
    print_success "Database reset completed"
}

# Function to open pgAdmin
open_pgadmin() {
    if command -v open &> /dev/null; then
        open http://localhost:8080
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8080
    else
        print_status "Please open http://localhost:8080 in your browser"
    fi
}

# Function to run initial setup
initial_setup() {
    print_status "Running initial setup..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create directories
    create_directories
    
    # Start services
    start_services
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 15
    
    # Run database setup script
    if command -v npm &> /dev/null; then
        print_status "Running database setup..."
        npm run db:setup -- --full --skip-confirmation
        print_success "Initial setup completed!"
    else
        print_warning "npm not found. Please run database setup manually:"
        echo "  npm run db:setup -- --full"
    fi
    
    # Open pgAdmin
    print_status "Opening pgAdmin in browser..."
    sleep 2
    open_pgadmin
}

# Function to show help
show_help() {
    echo "AI Code Agent Docker Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start               Start all Docker services"
    echo "  stop                Stop all Docker services"
    echo "  restart             Restart all Docker services"
    echo "  status              Show service status"
    echo "  logs [service]      Show service logs"
    echo "  backup              Create database backup"
    echo "  restore <file>      Restore database from backup"
    echo "  reset               Reset database (WARNING: deletes all data)"
    echo "  pgadmin             Open pgAdmin in browser"
    echo "  setup               Initial setup (start + configure)"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start           # Start services"
    echo "  $0 logs postgres   # Show PostgreSQL logs"
    echo "  $0 backup          # Create backup"
    echo "  $0 restore backup_20241201_120000.sql  # Restore from backup"
}

# Main script logic
main() {
    check_prerequisites
    
    case ${1:-} in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_backup "$2"
            ;;
        reset)
            reset_database
            ;;
        pgadmin)
            open_pgadmin
            ;;
        setup)
            initial_setup
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            print_error "No command provided"
            show_help
            exit 1
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"