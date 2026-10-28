# Multi-stage Dockerfile for Zuba Solar Energy System
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json ./
RUN npm install

# Copy source files and build production frontend
COPY . ./
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled frontend and server entry point
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

# Expose server port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
