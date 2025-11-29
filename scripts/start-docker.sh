#!/bin/bash
# Helper script to start Docker daemon in devcontainer

set -e

echo "Checking Docker daemon status..."

# Check if Docker socket exists
if [ -S /var/run/docker.sock ]; then
    echo "✓ Docker socket found at /var/run/docker.sock"
    
    # Test Docker connection
    if docker ps &>/dev/null; then
        echo "✓ Docker daemon is running and accessible"
        docker info | grep -E "Server Version|Operating System" || true
        exit 0
    else
        echo "✗ Docker socket exists but daemon is not responding"
        echo "  This usually means Docker is not running on the host (OrbStack)."
        echo ""
        echo "  To fix this:"
        echo "  1. Open OrbStack on your Mac"
        echo "  2. Make sure Docker is running (check the OrbStack menu bar icon)"
        echo "  3. Try: docker ps (from your Mac terminal to verify)"
        echo "  4. Rebuild the devcontainer if needed"
        exit 1
    fi
else
    echo "✗ Docker socket not found at /var/run/docker.sock"
    echo ""
    echo "  This devcontainer uses Docker-in-Docker. Attempting to start daemon..."
    
    # Try to start Docker service
    if command -v dockerd &>/dev/null; then
        echo "  Starting dockerd..."
        sudo dockerd > /tmp/dockerd.log 2>&1 &
        sleep 3
        
        if docker ps &>/dev/null; then
            echo "✓ Docker daemon started successfully"
            exit 0
        else
            echo "✗ Failed to start Docker daemon. Check /tmp/dockerd.log for errors"
            exit 1
        fi
    else
        echo "✗ dockerd not found. Docker-in-Docker may not be properly installed."
        echo ""
        echo "  Try rebuilding your devcontainer to reinstall Docker-in-Docker feature."
        exit 1
    fi
fi

