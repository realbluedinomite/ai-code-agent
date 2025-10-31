#!/bin/bash

# =====================================
# Development Workflow Automation Script
# =====================================
# This script provides a simple CLI for common development tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    echo "============================================================"
    print_status "$CYAN" "$1"
    echo "============================================================"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run npm command with status
run_npm() {
    local cmd="$1"
    local description="$2"
    
    print_status "$BLUE" "Running: $description"
    if npm run "$cmd"; then
        print_status "$GREEN" "✅ $description completed successfully"
        return 0
    else
        print_status "$RED" "❌ $description failed"
        return 1
    fi
}

# Function to run command with status
run_command() {
    local cmd="$1"
    local description="$2"
    
    print_status "$BLUE" "Running: $description"
    if eval "$cmd"; then
        print_status "$GREEN" "✅ $description completed successfully"
        return 0
    else
        print_status "$RED" "❌ $description failed"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "$CYAN" "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check Node.js
    if ! command_exists node; then
        missing_tools+=("Node.js")
    else
        print_status "$GREEN" "✅ Node.js $(node --version) found"
    fi
    
    # Check npm
    if ! command_exists npm; then
        missing_tools+=("npm")
    else
        print_status "$GREEN" "✅ npm $(npm --version) found"
    fi
    
    # Check Git
    if ! command_exists git; then
        missing_tools+=("Git")
    else
        print_status "$GREEN" "✅ Git $(git --version | cut -d' ' -f3) found"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_status "$RED" "❌ Missing required tools: ${missing_tools[*]}"
        print_status "$YELLOW" "Please install the missing tools and try again."
        exit 1
    fi
    
    print_status "$GREEN" "✅ All prerequisites met!"
}

# Function to setup project
setup_project() {
    print_header "Setting Up Development Environment"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_status "$RED" "❌ package.json not found. Please run this from the project root."
        exit 1
    fi
    
    # Install dependencies
    print_status "$BLUE" "Installing dependencies..."
    if npm install; then
        print_status "$GREEN" "✅ Dependencies installed"
    else
        print_status "$RED" "❌ Failed to install dependencies"
        exit 1
    fi
    
    # Setup Git hooks
    print_status "$BLUE" "Setting up Git hooks..."
    if npx husky install 2>/dev/null || npx husky init 2>/dev/null; then
        print_status "$GREEN" "✅ Git hooks configured"
    else
        print_status "$YELLOW" "⚠️  Git hooks setup skipped"
    fi
    
    # Setup test database
    print_status "$BLUE" "Setting up test database..."
    if npm run test:db:setup 2>/dev/null; then
        print_status "$GREEN" "✅ Test database configured"
    else
        print_status "$YELLOW" "⚠️  Test database setup failed (PostgreSQL might not be running)"
    fi
    
    # Run initial validation
    print_status "$BLUE" "Running initial validation..."
    if npm run validate 2>/dev/null; then
        print_status "$GREEN" "✅ Initial validation passed"
    else
        print_status "$YELLOW" "⚠️  Initial validation failed (this might be expected for new projects)"
    fi
    
    print_status "$GREEN" "🎉 Project setup complete!"
}

# Function to validate everything
validate_all() {
    print_header "Validating Development Environment"
    
    local failed=0
    
    # Type checking
    if ! run_npm "type-check" "TypeScript type checking"; then
        ((failed++))
    fi
    
    # Linting
    if ! run_npm "lint" "Code linting"; then
        ((failed++))
    fi
    
    # Formatting check
    if ! run_npm "format:check" "Code formatting check"; then
        ((failed++))
    fi
    
    # Unit tests
    if ! run_npm "test:unit" "Unit tests"; then
        ((failed++))
    fi
    
    if [ $failed -eq 0 ]; then
        print_status "$GREEN" "🎉 All validations passed!"
    else
        print_status "$RED" "❌ $failed validation(s) failed"
        exit 1
    fi
}

# Function to start development
start_dev() {
    print_header "Starting Development Environment"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_status "$YELLOW" "⚠️  Not in a Git repository"
    fi
    
    # Start development server
    print_status "$BLUE" "Starting development server..."
    exec npm run dev
}

# Function to run tests
run_tests() {
    local test_type="${1:-all}"
    
    case "$test_type" in
        "unit")
            run_npm "test:unit" "Unit tests"
            ;;
        "integration")
            run_npm "test:integration" "Integration tests"
            ;;
        "e2e")
            run_npm "test:e2e" "End-to-end tests"
            ;;
        "coverage")
            run_npm "test:coverage" "Tests with coverage"
            ;;
        "ci")
            run_npm "test:ci" "CI tests"
            ;;
        "watch")
            run_npm "test:watch" "Tests in watch mode"
            ;;
        "all"|*)
            run_npm "test" "All tests"
            ;;
    esac
}

# Function to format and lint code
format_code() {
    print_header "Formatting and Linting Code"
    
    # Format code
    run_npm "format:fix" "Formatting code"
    
    # Fix linting issues
    run_npm "lint:fix" "Fixing linting issues"
    
    # Type check
    run_npm "type-check" "TypeScript type checking"
    
    print_status "$GREEN" "✨ Code formatting and linting complete!"
}

# Function to run maintenance
run_maintenance() {
    print_header "Running Maintenance Tasks"
    
    # Clean build artifacts
    run_npm "clean" "Cleaning build artifacts"
    
    # Update dependencies
    run_command "npm update" "Updating dependencies"
    
    # Security audit
    run_command "npm audit" "Security audit"
    
    # Run validation
    validate_all
    
    print_status "$GREEN" "🧹 Maintenance complete!"
}

# Function to reset environment
reset_environment() {
    print_status "$YELLOW" "This will clean and reinstall everything. Continue? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_header "Resetting Development Environment"
        
        # Clean everything
        run_command "rm -rf node_modules dist coverage .nyc_output" "Cleaning all files"
        
        # Reinstall dependencies
        run_command "npm install" "Reinstalling dependencies"
        
        # Setup again
        setup_project
        
        print_status "$GREEN" "🔄 Environment reset complete!"
    else
        print_status "$BLUE" "Reset cancelled."
    fi
}

# Function to show status
show_status() {
    print_header "Project Status"
    
    # Project info
    if [ -f "package.json" ]; then
        local name=$(node -p "require('./package.json').name")
        local version=$(node -p "require('./package.json').version")
        print_status "$BLUE" "📦 Project: $name v$version"
    fi
    
    # Git info
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local branch=$(git branch --show-current)
        local status=$(git status --porcelain | wc -l)
        print_status "$BLUE" "🌿 Git branch: $branch"
        print_status "$BLUE" "📊 Git changes: $status file(s)"
    else
        print_status "$YELLOW" "⚠️  Not in a Git repository"
    fi
    
    # System info
    print_status "$BLUE" "🖥️  Node.js: $(node --version)"
    print_status "$BLUE" "📦 npm: $(npm --version)"
    
    # Quick checks
    print_status "$BLUE" "🧪 Quick validation..."
    if npm run type-check --silent 2>/dev/null; then
        print_status "$GREEN" "   ✅ Type checking: OK"
    else
        print_status "$RED" "   ❌ Type checking: FAILED"
    fi
    
    if npm run lint --silent 2>/dev/null; then
        print_status "$GREEN" "   ✅ Linting: OK"
    else
        print_status "$RED" "   ❌ Linting: ISSUES FOUND"
    fi
    
    if npm test --silent --passWithNoTests 2>/dev/null; then
        print_status "$GREEN" "   ✅ Tests: OK"
    else
        print_status "$RED" "   ❌ Tests: FAILED"
    fi
}

# Function to show help
show_help() {
    echo ""
    print_status "$CYAN" "Development Workflow Automation"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup               - Initial project setup"
    echo "  validate            - Run all validation checks"
    echo "  dev                 - Start development server"
    echo "  test [type]         - Run tests (unit|integration|e2e|coverage|ci|watch)"
    echo "  format              - Format and lint code"
    echo "  maintenance         - Run maintenance tasks"
    echo "  reset               - Reset development environment"
    echo "  status              - Show project status"
    echo "  help                - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup            # Initial setup"
    echo "  $0 dev              # Start development"
    echo "  $0 test unit        # Run unit tests"
    echo "  $0 validate         # Run all checks"
    echo "  $0 status           # Show status"
    echo ""
}

# Main script
main() {
    local command="${1:-help}"
    
    case "$command" in
        "setup")
            check_prerequisites
            setup_project
            ;;
        "validate")
            check_prerequisites
            validate_all
            ;;
        "dev")
            check_prerequisites
            start_dev
            ;;
        "test")
            check_prerequisites
            run_tests "$2"
            ;;
        "format")
            check_prerequisites
            format_code
            ;;
        "maintenance")
            check_prerequisites
            run_maintenance
            ;;
        "reset")
            reset_environment
            ;;
        "status")
            show_status
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            print_status "$RED" "❌ Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Check if being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi