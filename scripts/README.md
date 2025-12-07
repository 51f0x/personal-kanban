# Docker Build and Push Scripts

## Building and Pushing Images to Registry

The `build-and-push-images.sh` script builds Docker images for all three services (API, Worker, and Web SPA) and pushes them to a Docker registry.

### Prerequisites

1. Docker must be installed and running
2. The registry at `192.168.1.53:5000` must be accessible
3. If using an insecure registry (HTTP), configure Docker to allow it

### Configuring Docker for Insecure Registry

If your registry uses HTTP instead of HTTPS, you need to configure Docker to allow insecure registries:

**Linux:**
Edit `/etc/docker/daemon.json` (or create it if it doesn't exist):
```json
{
  "insecure-registries": ["192.168.1.53:5000"]
}
```

Then restart Docker:
```bash
sudo systemctl restart docker
```

**macOS/Windows (Docker Desktop):**
1. Open Docker Desktop settings
2. Go to Docker Engine
3. Add the registry to `insecure-registries`:
```json
{
  "insecure-registries": ["192.168.1.53:5000"]
}
```
4. Apply & Restart

### Usage

**Basic usage (defaults to 192.168.1.53:5000 and latest tag):**
```bash
./scripts/build-and-push-images.sh
```

**Custom registry port:**
```bash
REGISTRY_PORT=8080 ./scripts/build-and-push-images.sh
```

**Custom image tag:**
```bash
IMAGE_TAG=v1.0.0 ./scripts/build-and-push-images.sh
```

**Custom registry host and port:**
```bash
REGISTRY_HOST=192.168.1.53 REGISTRY_PORT=5000 IMAGE_TAG=latest ./scripts/build-and-push-images.sh
```

### What the Script Does

1. Builds three Docker images:
   - `personal-kanban-api` (from `docker/Dockerfile.api`)
   - `personal-kanban-worker` (from `docker/Dockerfile.worker`)
   - `personal-kanban-web` (from `docker/Dockerfile.web`)

2. Tags each image with:
   - Local tag: `personal-kanban-{service}:{tag}`
   - Registry tag: `{registry}/personal-kanban-{service}:{tag}`

3. Pushes all images to the registry

### Pulling and Running Images

After pushing, you can pull and run the images using the provided `docker-compose.registry.yml`:

```bash
docker-compose -f docker-compose.registry.yml up -d
```

Or pull individual images:
```bash
docker pull 192.168.1.53:5000/personal-kanban-api:latest
docker pull 192.168.1.53:5000/personal-kanban-worker:latest
docker pull 192.168.1.53:5000/personal-kanban-web:latest
```

### Troubleshooting

**Error: "Get https://192.168.1.53:5000/v2/: http: server gave HTTP response to HTTPS client"**
- Your registry is using HTTP. Configure Docker for insecure registries (see above).

**Error: "dial tcp 192.168.1.53:5000: connect: connection refused"**
- The registry is not running or not accessible. Verify the registry is running and accessible from your machine.

**Error: "unauthorized: authentication required"**
- The registry requires authentication. You may need to login first:
  ```bash
  docker login 192.168.1.53:5000
  ```

