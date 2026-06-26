# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
# Copy scripts first — needed by postinstall hook
COPY scripts/ ./scripts/
# Cache npm install layer separately
COPY package.json package-lock.json* ./
RUN npm ci
# Copy source and build
COPY . .
# Build-time env vars — override at build with --build-arg
ARG VITE_API_URL=http://localhost:9833
ARG VITE_GOTRUE_URL=http://localhost:9831
ARG VITE_GOTRUE_ANON_KEY=
ARG VITE_MARTIN_URL=/martin
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOTRUE_URL=$VITE_GOTRUE_URL
ENV VITE_GOTRUE_ANON_KEY=$VITE_GOTRUE_ANON_KEY
ENV VITE_MARTIN_URL=$VITE_MARTIN_URL
RUN npm run build
# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
