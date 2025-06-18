# DebugSync Project

## Docker Setup Instructions

### Prerequisites
- Docker installed on your machine
  - Download from [Docker's official website](https://www.docker.com/products/docker-desktop/)

### Running the application

With Docker Desktop:
```bash
# Navigate to the project directory
cd /Users/anukuljain/Desktop/DebugSync/DebugSync.ai

# Make sure Docker Desktop is running
# Build and start both client and server
docker compose up --build
```

### Accessing the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Common Issues and Solutions

1. **Client not accessible**: Make sure your Vite config allows connections from all hosts by setting `--host 0.0.0.0`

2. **API calls failing**: If your client can't connect to the server:
   - Check that the client is using the correct API URL (http://server:3000 within Docker network)
   - Verify environment variables are properly set in docker-compose.yml

3. **Hot reloading not working**: Make sure volumes are correctly mounted in docker-compose.yml

4. Check logs with:
   ```
   docker compose logs server
   docker compose logs client
   ```

5. Access a running container:
   ```
   docker compose exec server sh
   docker compose exec client sh
   ```

6. Restart containers after changes:
   ```
   docker compose restart
   ```

7. Rebuild if package.json changes:
   ```
   docker compose up --build
   ```
