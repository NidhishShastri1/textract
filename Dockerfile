# === Stage 1: Build Frontend ===
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
# Use relative path so API calls go to the same domain (handled by Nginx proxy)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# === Stage 2: Build Backend ===
FROM maven:3.8.5-openjdk-17-slim AS backend-build
WORKDIR /app/backend
COPY backend/pom.xml .
RUN mvn dependency:go-offline
COPY backend/src ./src
RUN mvn clean package -DskipTests

# === Stage 3: Final Monolithic Image ===
FROM python:3.9-slim

# Install Runtime Dependencies (Java 17, Nginx, Supervisor, System Libs for OpenCV)
RUN apt-get update && apt-get install -y \
    default-jre \
    nginx \
    supervisor \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup Nginx
RUN rm -rf /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf
COPY nginx-monolith.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist /var/www/html

# Setup Backend
WORKDIR /app/backend
COPY --from=backend-build /app/backend/target/*.jar app.jar

# Setup AI Service
WORKDIR /app/ai_service
COPY ai_service/requirements.txt .
# OPTIMIZATION: Install CPU-only Torch (~700MB) instead of GPU version (~2.5GB)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
# Install other requirements
RUN pip install --no-cache-dir -r requirements.txt
COPY ai_service/ .

# Setup Supervisor
WORKDIR /app
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose HTTP port (Nginx)
EXPOSE 80

# Start Supervisor (manages all 3 processes)
CMD ["/usr/bin/supervisord"]
