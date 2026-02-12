# ---------- Stage 1: Build Frontend ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install root deps (frontend)
COPY package*.json ./
RUN npm ci

# Copy frontend source
COPY . .

# Build Vite app
RUN npm run build


# ---------- Stage 2: Build Backend ----------
FROM node:20-alpine AS backend-build

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server .

# Compile TypeScript backend
RUN npm run build


# ---------- Stage 3: Runtime ----------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy backend build
COPY --from=backend-build /app/server/dist ./server/dist
COPY --from=backend-build /app/server/package*.json ./server/

# Copy frontend build
COPY --from=frontend-build /app/dist ./public

# Install ONLY backend production deps
WORKDIR /app/server
RUN npm ci --omit=dev

# Expose API port (default 3000 from README)
EXPOSE 3000

CMD ["node", "dist/index.js"]

