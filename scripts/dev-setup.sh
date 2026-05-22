#!/usr/bin/env bash

# Invozen GST - Development Environment Setup Script
# This script sets up the development environment for both frontend and backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Node.js version
check_node() {
    print_header "Checking Node.js Installation"

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Please install Node.js 18+ from: https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old"
        print_info "Please upgrade to Node.js 18 or higher"
        exit 1
    fi

    print_success "Node.js $(node -v) installed"
    print_success "npm $(npm -v) installed"
}

# Install frontend dependencies
setup_frontend() {
    print_header "Setting Up Frontend"

    cd frontend

    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local not found, creating from .env.local.example"
        cp .env.local.example .env.local
        print_info "Please edit frontend/.env.local and add your API keys"
    else
        print_success ".env.local already exists"
    fi

    # Install dependencies
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"

    cd ..
}

# Install backend dependencies
setup_backend() {
    print_header "Setting Up Backend"

    cd backend

    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env not found, creating from .env.example"
        cp .env.example .env
        print_info "Please edit backend/.env and configure DATABASE_URL and CLERK_SECRET_KEY"
    else
        print_success ".env already exists"
    fi

    # Install dependencies
    print_info "Installing backend dependencies..."
    npm install
    print_success "Backend dependencies installed"

    # Generate Prisma client
    print_info "Generating Prisma client..."
    npm run db:generate
    print_success "Prisma client generated"

    # Check if database is initialized
    if [ ! -f "invozen.db" ]; then
        print_warning "Database not initialized"
        print_info "Run 'cd backend && npm run db:migrate' to create tables"
    else
        print_success "Database file exists"
    fi

    cd ..
}

# Print next steps
print_next_steps() {
    print_header "Setup Complete!"

    echo -e "${GREEN}Your development environment is ready!${NC}\n"

    echo -e "${YELLOW}📝 Next Steps:${NC}\n"

    echo "1. Configure environment variables:"
    echo "   ${BLUE}frontend/.env.local${NC} - Add Groq and Clerk API keys"
    echo "   ${BLUE}backend/.env${NC} - Configure database and Clerk secret key"
    echo ""

    echo "2. Initialize the database (if not done):"
    echo "   ${BLUE}cd backend && npm run db:migrate${NC}"
    echo ""

    echo "3. Start the development servers:"
    echo "   Terminal 1: ${BLUE}cd backend && npm run dev${NC}"
    echo "   Terminal 2: ${BLUE}cd frontend && npm run dev${NC}"
    echo ""

    echo "4. Open your browser:"
    echo "   Frontend: ${BLUE}http://localhost:3000${NC}"
    echo "   Backend API: ${BLUE}http://localhost:4000/api/v1${NC}"
    echo "   Health check: ${BLUE}http://localhost:4000/health${NC}"
    echo ""

    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}\n"

    echo "Need help? Check:"
    echo "  • README.md - Project documentation"
    echo "  • CLAUDE.md - Development guidelines"
    echo "  • frontend/.env.local.example - Environment setup guide"
    echo ""
}

# Main execution
main() {
    print_header "Invozen GST - Development Setup"

    check_node
    setup_frontend
    setup_backend
    print_next_steps
}

main
