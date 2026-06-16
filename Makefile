.DEFAULT_GOAL := help
SHELL         := /bin/bash
-include .env
export

# ─── Colours ─────────────────────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

# ─── Paths ───────────────────────────────────────────────────────────────────
BACKEND_DIR  := ./backend
FRONTEND_DIR := ./frontend
MIGRATIONS   := $(BACKEND_DIR)/migrations

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'

# ─── Infrastructure ──────────────────────────────────────────────────────────
.PHONY: infra-up
infra-up: ## Start all infra containers (db, gotrue, valkey, martin)
	docker compose up -d db gotrue valkey martin
	@echo "Waiting for db to be healthy…"
	@docker compose exec db pg_isready -U supabase_admin -d $(POSTGRES_DB) || true

.PHONY: infra-down
infra-down: ## Stop and remove infra containers
	docker compose down

.PHONY: infra-destroy
infra-destroy: ## Stop infra and DELETE volumes (destructive!)
	docker compose down -v

.PHONY: infra-logs
infra-logs: ## Tail logs from all infra containers
	docker compose logs -f db gotrue valkey martin

.PHONY: martin-logs
martin-logs: ## Tail Martin tile server logs
	docker compose logs -f martin

.PHONY: martin-catalog
martin-catalog: ## Print published tile sources from Martin
	@curl -s http://localhost:9836/catalog | python -m json.tool 2>/dev/null || curl -s http://localhost:9836/catalog

.PHONY: infra-ps
infra-ps: ## Show status of infra containers
	docker compose ps

# ─── Database copy (one-time) ─────────────────────────────────────────────────
.PHONY: db-copy
db-copy: ## pg_dump source DB → restore into new container (run once)
	@echo "Dumping from source DB via Docker (host.docker.internal) …"
	docker run --rm \
		-v "$(CURDIR)/tmp:/dump" \
		-e PGPASSWORD="" \
		postgres:15-alpine \
		pg_dump -h host.docker.internal -p 5432 -U postgres \
		  --no-owner --no-acl -Fc -f /dump/source.dump gisdb-taa
	@echo "Restoring into rtaa DB on port 9830 …"
	docker run --rm \
		-v "$(CURDIR)/tmp:/dump" \
		-e PGPASSWORD=$(POSTGRES_PASSWORD) \
		postgres:15-alpine \
		pg_restore --no-owner --no-acl \
		  -h host.docker.internal -p 9830 \
		  -U supabase_admin -d $(POSTGRES_DB) \
		  --exit-on-error /dump/source.dump
	@echo "Done."

# ─── Migrations ──────────────────────────────────────────────────────────────
.PHONY: migrate-up
migrate-up: ## Run all pending goose migrations
	docker compose --profile migrate run --rm migrate goose -allow-missing up

.PHONY: migrate-down
migrate-down: ## Roll back the last goose migration
	docker compose --profile migrate run --rm migrate goose down

.PHONY: migrate-status
migrate-status: ## Show goose migration status
	docker compose --profile migrate run --rm migrate goose status

.PHONY: migrate-create
migrate-create: ## Create a new migration: make migrate-create NAME=add_something
	@[ "$(NAME)" ] || { echo "Usage: make migrate-create NAME=<name>"; exit 1; }
	docker compose --profile migrate run --rm migrate goose create $(NAME) sql

.PHONY: migrate-reset
migrate-reset: ## Roll back ALL migrations (destructive!)
	docker compose --profile migrate run --rm migrate goose reset

# ─── Backend (Go Chi) ────────────────────────────────────────────────────────
.PHONY: api-up
api-up: ## Run the Go API server
	cd $(BACKEND_DIR) && go mod tidy && go run ./cmd/server

.PHONY: api-build
api-build: ## Build the Go API binary
	cd $(BACKEND_DIR) && go build -o bin/api ./cmd/server

.PHONY: api-test
api-test: ## Run Go tests
	cd $(BACKEND_DIR) && go test ./... -v

.PHONY: api-lint
api-lint: ## Run golangci-lint on the backend
	cd $(BACKEND_DIR) && golangci-lint run ./...

.PHONY: api-tidy
api-tidy: ## Tidy Go modules
	cd $(BACKEND_DIR) && go mod tidy

# ─── Frontend (React + Vite) ──────────────────────────────────────────────────
.PHONY: web-install
web-install: ## Install frontend npm dependencies
	cd $(FRONTEND_DIR) && npm install

.PHONY: web-dev
web-dev: ## Start Vite dev server on port 9834
	cd $(FRONTEND_DIR) && npm run dev

.PHONY: web-build
web-build: ## Build frontend for production
	cd $(FRONTEND_DIR) && npm run build

.PHONY: web-preview
web-preview: ## Preview production build
	cd $(FRONTEND_DIR) && npm run preview

.PHONY: web-lint
web-lint: ## Lint frontend code
	cd $(FRONTEND_DIR) && npm run lint

# ─── Full dev stack ───────────────────────────────────────────────────────────
.PHONY: dev
dev: infra-up migrate-up ## Start infra + run migrations (then start api/web manually)
	@echo ""
	@echo "Infrastructure ready. Now open two more terminals:"
	@echo "  make api-up    → Go API on :9833"
	@echo "  make web-dev   → Vite on    :9834"

# ─── Docker build & deploy ────────────────────────────────────────────────────
IMAGE_TAG ?= latest

.PHONY: docker-build-api
docker-build-api: ## Build the Go API Docker image
	docker build -t rtaa-api:$(IMAGE_TAG) ./backend

.PHONY: docker-build-web
docker-build-web: ## Build the frontend Docker image
	docker build \
		--build-arg VITE_API_URL=$(VITE_API_URL) \
		--build-arg VITE_GOTRUE_URL=$(VITE_GOTRUE_URL) \
		--build-arg VITE_GOTRUE_ANON_KEY=$(VITE_GOTRUE_ANON_KEY) \
		--build-arg VITE_MARTIN_URL=$(VITE_MARTIN_URL) \
		-t rtaa-web:$(IMAGE_TAG) ./frontend

.PHONY: docker-build-dwg-converter
docker-build-dwg-converter: ## Build the DWG converter sidecar image
	docker build -t rtaa-dwg-converter:$(IMAGE_TAG) ./dwg-converter

.PHONY: dwg-converter-up
dwg-converter-up: ## Start the DWG converter sidecar (builds if needed)
	docker compose up dwg-converter -d --build

.PHONY: docker-build
docker-build: docker-build-api docker-build-web docker-build-dwg-converter ## Build all Docker images

.PHONY: prod-up
prod-up: ## Start production stack (infra + api + web)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

.PHONY: prod-down
prod-down: ## Stop production stack
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

.PHONY: prod-logs
prod-logs: ## Tail production logs
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api web

.PHONY: prod-build-up
prod-build-up: ## Build images then start production stack
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# ─── JWT helpers ──────────────────────────────────────────────────────────────
.PHONY: jwt-anon
jwt-anon: ## Print a GoTrue anon JWT for VITE_GOTRUE_ANON_KEY
	@node -e " \
	  const secret = '$(JWT_SECRET)'; \
	  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'); \
	  const payload = Buffer.from(JSON.stringify({role:'anon',iss:'gotrue',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+315360000})).toString('base64url'); \
	  const crypto = require('crypto'); \
	  const sig = crypto.createHmac('sha256',secret).update(header+'.'+payload).digest('base64url'); \
	  console.log(header+'.'+payload+'.'+sig); \
	"
