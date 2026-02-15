# ---------- Stage 1: Build Frontend ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Accept build arguments for env variables
ARG VITE_IMGBB_API_KEY
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_API_URL

# Set env variables for build
ENV VITE_IMGBB_API_KEY=$VITE_IMGBB_API_KEY
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_API_URL=$VITE_API_URL

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

