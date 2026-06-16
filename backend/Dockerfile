# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

# Install build tools (CGO is off — pure Go build)
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Cache dependency downloads separately from source changes
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a statically linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w -extldflags '-static'" \
    -o /app/bin/api ./cmd/server

# ── Stage 2: minimal runtime image ────────────────────────────────────────────
FROM scratch

# Non-root user (uid 65532 = nobody in distroless convention)
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /app/bin/api /api

USER nobody

EXPOSE 9833

ENTRYPOINT ["/api"]
