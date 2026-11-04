# Multi-stage Dockerfile for IFTA Gestão Técnica de Ativos & Manutenção
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy all source files
COPY . .

# Compile application into static bundle in /app/dist
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Directory and Volume for persistent storage of machines and parts
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy compiled files, server entry point, and data files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts

# Expose port 3000 for localhost testing
EXPOSE 3000

# Start Express server connected to the persistent database
CMD ["npm", "start"]
