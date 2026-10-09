# Optional: build the frontend as a Docker image served by Nginx.
# (render.yaml uses Render's static-site hosting instead, which is simpler and free.)
#
#   docker build --build-arg VITE_API_URL=https://your-backend.onrender.com/api -t smartattend-frontend .

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Vite bakes VITE_* variables into the JavaScript at build time, so the API URL
# must be provided as a build argument (Render passes service env vars this way).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
