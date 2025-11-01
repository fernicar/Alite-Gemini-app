#!/bin/bash

# Alite Deployment Script
# Supports multiple hosting platforms

set -e  # Exit on any error

# Configuration
APP_NAME="alite-space-trader"
BUILD_DIR="dist"
VERSION=$(date +%Y%m%d-%H%M%S)
DEPLOY_DIR="deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Alite Deployment Script

Usage: $0 [PLATFORM] [OPTIONS]

Platforms:
    netlify       Deploy to Netlify
    vercel        Deploy to Vercel
    github-pages  Deploy to GitHub Pages
    surge         Deploy to Surge.sh
    firebase      Deploy to Firebase Hosting
    local         Create local deployment package
    all           Deploy to all platforms

Options:
    --skip-build     Skip the build process
    --force          Force deployment (skip checks)
    --dry-run        Show what would be deployed without actually deploying
    --help, -h       Show this help message

Examples:
    $0 netlify --force
    $0 vercel --dry-run
    $0 all --skip-build
    $0 local

EOF
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check if build directory exists
    if [ ! -d "$BUILD_DIR" ]; then
        warn "Build directory not found. Running build..."
        npm run build
    fi
    
    success "Prerequisites check passed"
}

# Build the application
build_app() {
    if [ "$SKIP_BUILD" = "true" ]; then
        log "Skipping build as requested"
        return
    fi
    
    log "Building application..."
    
    # Clean previous builds
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi
    
    # Run the build script
    node build.js
    
    success "Build completed"
}

# Create local deployment package
deploy_local() {
    log "Creating local deployment package..."
    
    DEPLOY_LOCAL_DIR="$DEPLOY_DIR/local-$VERSION"
    mkdir -p "$DEPLOY_LOCAL_DIR"
    
    # Copy build files
    cp -r "$BUILD_DIR"/* "$DEPLOY_LOCAL_DIR/"
    
    # Create deployment instructions
    cat > "$DEPLOY_LOCAL_DIR/DEPLOYMENT.md" << EOF
# Local Deployment Instructions

## Quick Start
1. Upload all files in this directory to your web server
2. Ensure your server supports SPA routing
3. Configure SSL certificate for HTTPS
4. Access your game at the uploaded URL

## Server Configuration

### Apache (.htaccess included)
Upload files to your web root directory. The included .htaccess file will handle routing.

### Nginx
Use the following configuration:

\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/deployed/files;
    index index.html;
    
    location / {
        try_files \\$uri \\$uri/ /index.html;
    }
    
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

### IIS (web.config included)
The web.config file is included for IIS servers.

## Performance Optimization

### CDN Setup
For better performance, serve static assets from a CDN:

1. Upload assets/ directory to CDN
2. Update index.html to reference CDN URLs
3. Configure appropriate cache headers

### Compression
Ensure your server has gzip compression enabled.

### HTTPS
Always use HTTPS in production for:
- Web Audio API to work properly
- Secure save game storage
- Better performance with Service Workers

## Troubleshooting

### Game won't load
- Check browser console for errors
- Verify all files uploaded correctly
- Ensure server supports SPA routing

### Audio not working
- Ensure HTTPS is enabled
- Check browser audio permissions
- Verify audio files uploaded correctly

### Save games not working
- Check if localStorage is enabled
- Ensure HTTPS is enabled
- Verify server supports PWA features

EOF
    
    # Create start script for local testing
    cat > "$DEPLOY_LOCAL_DIR/start-server.sh" << 'EOF'
#!/bin/bash
# Local development server

echo "Starting local server..."
echo "Game will be available at: http://localhost:8080"
echo "Press Ctrl+C to stop the server"

python3 -m http.server 8080 || python -m http.server 8080
EOF
    
    chmod +x "$DEPLOY_LOCAL_DIR/start-server.sh"
    
    # Create archive
    cd "$DEPLOY_DIR"
    tar -czf "alite-local-$VERSION.tar.gz" "local-$VERSION"
    zip -r "alite-local-$VERSION.zip" "local-$VERSION" > /dev/null
    cd ..
    
    success "Local deployment package created in $DEPLOY_DIR/"
    log "Files created:"
    log "  - $DEPLOY_LOCAL_DIR/ (extracted files)"
    log "  - $DEPLOY_DIR/alite-local-$VERSION.tar.gz"
    log "  - $DEPLOY_DIR/alite-local-$VERSION.zip"
}

# Netlify deployment
deploy_netlify() {
    log "Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        warn "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    # Deploy to Netlify
    netlify deploy --dir="$BUILD_DIR" --prod
    
    success "Deployed to Netlify"
}

# Vercel deployment
deploy_vercel() {
    log "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        warn "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    cd "$BUILD_DIR"
    vercel --prod
    cd ..
    
    success "Deployed to Vercel"
}

# GitHub Pages deployment
deploy_github_pages() {
    log "Deploying to GitHub Pages..."
    
    # Check if gh-pages is installed
    if ! npm list -g gh-pages &> /dev/null; then
        warn "gh-pages not found. Installing..."
        npm install -g gh-pages
    fi
    
    # Deploy to GitHub Pages
    gh-pages -d "$BUILD_DIR"
    
    success "Deployed to GitHub Pages"
    log "Your site will be available at: https://$(git config --get remote.origin.url | sed 's/.*github\.com[:/]\([^/]*\)\/\([^.]*\)\..*/\1.github.io\/\2/' | tr -d '\n')/"
}

# Surge.sh deployment
deploy_surge() {
    log "Deploying to Surge.sh..."
    
    # Check if Surge is installed
    if ! command -v surge &> /dev/null; then
        warn "Surge not found. Installing..."
        npm install -g surge
    fi
    
    # Deploy to Surge
    cd "$BUILD_DIR"
    surge . "$APP_NAME-$VERSION.surge.sh"
    cd ..
    
    success "Deployed to Surge.sh"
}

# Firebase deployment
deploy_firebase() {
    log "Deploying to Firebase..."
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        warn "Firebase CLI not found. Installing..."
        npm install -g firebase-tools
    fi
    
    # Deploy to Firebase
    firebase deploy
    
    success "Deployed to Firebase Hosting"
}

# Show deployment summary
show_summary() {
    echo ""
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "========================"
    echo ""
    
    case "$PLATFORM" in
        "local")
            echo "📦 Local deployment package created"
            echo "📁 Location: $DEPLOY_DIR/"
            echo "🚀 Ready to upload to any web server"
            ;;
        "netlify")
            echo "🌐 Deployed to Netlify"
            echo "🔗 Check your Netlify dashboard for the live URL"
            ;;
        "vercel")
            echo "⚡ Deployed to Vercel"
            echo "🔗 Check your Vercel dashboard for the live URL"
            ;;
        "github-pages")
            echo "📄 Deployed to GitHub Pages"
            echo "🔗 Your site is live!"
            ;;
        "surge")
            echo "🚀 Deployed to Surge.sh"
            echo "🔗 Check the deployment output for the live URL"
            ;;
        "firebase")
            echo "🔥 Deployed to Firebase Hosting"
            echo "🔗 Check your Firebase console for the live URL"
            ;;
        "all")
            echo "🌟 Deployed to multiple platforms!"
            echo "📦 Local package: $DEPLOY_DIR/"
            echo "🌐 Check platform dashboards for live URLs"
            ;;
    esac
    
    echo ""
    echo "📋 Next Steps:"
    echo "1. Test the deployed game thoroughly"
    echo "2. Configure custom domain (if needed)"
    echo "3. Set up monitoring and analytics"
    echo "4. Update DNS settings (if using custom domain)"
    echo ""
    
    echo "🔧 Post-Deployment Checklist:"
    echo "□ Game loads correctly"
    echo "□ Audio works (requires user interaction)"
    echo "□ Save/Load functionality works"
    echo "□ Mobile touch controls work"
    echo "□ PWA installation works"
    echo "□ Offline mode works"
    echo "□ Performance is acceptable"
    echo "□ Cross-browser compatibility tested"
    echo ""
}

# Main deployment function
main() {
    PLATFORM="$1"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD="true"
                shift
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                if [ -z "$PLATFORM" ]; then
                    PLATFORM="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Validate platform
    if [ -z "$PLATFORM" ]; then
        error "No platform specified"
        show_help
        exit 1
    fi
    
    # Validate platform is supported
    case "$PLATFORM" in
        "netlify"|"vercel"|"github-pages"|"surge"|"firebase"|"local"|"all")
            ;;
        *)
            error "Unsupported platform: $PLATFORM"
            show_help
            exit 1
            ;;
    esac
    
    # Create deploy directory
    mkdir -p "$DEPLOY_DIR"
    
    log "Starting deployment to $PLATFORM..."
    log "Build directory: $BUILD_DIR"
    log "Deploy directory: $DEPLOY_DIR"
    
    # Run deployment
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN MODE - No actual deployment will occur"
        log "Platform: $PLATFORM"
        log "Build directory exists: $([ -d "$BUILD_DIR" ] && echo "Yes" || echo "No")"
    else
        check_prerequisites
        build_app
        
        case "$PLATFORM" in
            "local")
                deploy_local
                ;;
            "netlify")
                deploy_netlify
                ;;
            "vercel")
                deploy_vercel
                ;;
            "github-pages")
                deploy_github_pages
                ;;
            "surge")
                deploy_surge
                ;;
            "firebase")
                deploy_firebase
                ;;
            "all")
                deploy_local
                deploy_netlify
                deploy_vercel
                deploy_github_pages
                deploy_surge
                deploy_firebase
                ;;
        esac
    fi
    
    show_summary
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi