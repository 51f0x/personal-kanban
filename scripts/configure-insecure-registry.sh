#!/bin/bash

# Script to configure Docker to allow insecure registry at 192.168.1.53:5000
# This is needed when pushing to HTTP registries

set -e

REGISTRY_HOST="${REGISTRY_HOST:-192.168.1.53}"
REGISTRY_PORT="${REGISTRY_PORT:-5000}"
REGISTRY="${REGISTRY_HOST}:${REGISTRY_PORT}"

echo "Configuring Docker to allow insecure registry: ${REGISTRY}"
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    DAEMON_JSON="/etc/docker/daemon.json"
    
    if [ ! -f "$DAEMON_JSON" ]; then
        echo "Creating $DAEMON_JSON..."
        sudo mkdir -p "$(dirname "$DAEMON_JSON")"
        echo "{\"insecure-registries\": [\"${REGISTRY}\"]}" | sudo tee "$DAEMON_JSON" > /dev/null
    else
        echo "Updating $DAEMON_JSON..."
        # Check if registry already in list
        if grep -q "$REGISTRY" "$DAEMON_JSON" 2>/dev/null; then
            echo "Registry ${REGISTRY} is already configured."
            exit 0
        fi
        
        # Use jq if available, otherwise use sed
        if command -v jq &> /dev/null; then
            sudo jq ".insecure-registries += [\"${REGISTRY}\"]" "$DAEMON_JSON" | sudo tee "${DAEMON_JSON}.tmp" > /dev/null
            sudo mv "${DAEMON_JSON}.tmp" "$DAEMON_JSON"
        else
            echo "Warning: jq not found. Please manually add \"${REGISTRY}\" to insecure-registries in $DAEMON_JSON"
            echo "Example:"
            echo "  {"
            echo "    \"insecure-registries\": [\"${REGISTRY}\"]"
            echo "  }"
            exit 1
        fi
    fi
    
    echo "Restarting Docker daemon..."
    if command -v systemctl &> /dev/null; then
        sudo systemctl restart docker
    elif command -v service &> /dev/null; then
        sudo service docker restart
    else
        echo "Please restart Docker manually."
    fi
    
    echo "✓ Docker configured successfully!"
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - Docker Desktop
    echo "For macOS (Docker Desktop), please:"
    echo "1. Open Docker Desktop"
    echo "2. Go to Settings > Docker Engine"
    echo "3. Add the following to the JSON configuration:"
    echo ""
    echo "  \"insecure-registries\": [\"${REGISTRY}\"]"
    echo ""
    echo "4. Click 'Apply & Restart'"
    echo ""
    echo "Or edit the config file directly at:"
    echo "  ~/.docker/daemon.json"
    
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    echo "For Windows (Docker Desktop), please:"
    echo "1. Open Docker Desktop"
    echo "2. Go to Settings > Docker Engine"
    echo "3. Add the following to the JSON configuration:"
    echo ""
    echo "  \"insecure-registries\": [\"${REGISTRY}\"]"
    echo ""
    echo "4. Click 'Apply & Restart'"
else
    echo "Unknown OS. Please manually configure Docker to allow insecure registry: ${REGISTRY}"
fi

