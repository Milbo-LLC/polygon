# Use this script to start a docker container for a local development database

# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/en-us/windows/wsl/install
# 2. Install Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-database.sh`

# On Linux and macOS you can run this script directly - `./start-database.sh`

DB_CONTAINER_NAME="polygon-postgres"

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

# Check if the container is already running
if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
  echo "Database container '$DB_CONTAINER_NAME' already running"
  exit 0
fi

# Check if the container exists but is stopped
if [ "$(docker ps -q -a -f name=$DB_CONTAINER_NAME)" ]; then
  docker start "$DB_CONTAINER_NAME"
  echo "Existing database container '$DB_CONTAINER_NAME' started"
  exit 0
fi

# Fetch DATABASE_URL directly from Doppler
DATABASE_URL=$(doppler secrets get DATABASE_URL --plain)

# Extract password and port from the DATABASE_URL
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -E 's/.*:\/\/.*:(.*)@.*/\1/')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:(.*)\/.*/\1/')

# Run the PostgreSQL container with the appropriate environment variables
docker run -d \
  --name $DB_CONTAINER_NAME \
  -e POSTGRES_USER="postgres" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB=polygon \
  -p "$DB_PORT":5432 \
  docker.io/postgres && echo "Database container '$DB_CONTAINER_NAME' was successfully created"
