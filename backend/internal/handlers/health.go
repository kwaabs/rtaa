package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type HealthHandler struct {
	db     *bun.DB
	logger *zap.Logger
}

func NewHealthHandler(db *bun.DB, logger *zap.Logger) *HealthHandler {
	return &HealthHandler{db: db, logger: logger}
}

func (h *HealthHandler) Live(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, envelope{"status": "ok"})
}

func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	dbOK := h.db.PingContext(ctx) == nil
	status := "ok"
	code := http.StatusOK
	if !dbOK {
		status = "degraded"
		code = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = jsonEncode(w, envelope{
		"status": status,
		"checks": envelope{"database": dbOK},
	})
}
