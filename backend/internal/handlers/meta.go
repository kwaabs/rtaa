package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/r-taa/api/internal/cache"
	"github.com/r-taa/api/internal/models"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

// MetaHandler serves metadata config tables to the frontend.
// All map configuration (layers, basemaps, app settings) is driven from DB.
type MetaHandler struct {
	db     *bun.DB
	cache  *cache.Client
	logger *zap.Logger
}

func NewMetaHandler(db *bun.DB, c *cache.Client, logger *zap.Logger) *MetaHandler {
	return &MetaHandler{db: db, cache: c, logger: logger}
}

// GET /api/v1/meta/layers
func (h *MetaHandler) Layers(w http.ResponseWriter, r *http.Request) {
	const cacheKey = "meta:layers:v3"
	var layers []models.LayerConfig

	if h.cache != nil {
		if err := h.cache.Get(r.Context(), cacheKey, &layers); err == nil {
			jsonOK(w, layers)
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.db.NewSelect().
		Model(&layers).
		OrderExpr("lc.sort_order ASC, lc.id ASC").
		Scan(ctx); err != nil {
		h.logger.Error("layers query failed", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to load layers")
		return
	}

	if h.cache != nil {
		_ = h.cache.Set(r.Context(), cacheKey, layers, 5*time.Minute)
	}
	jsonOK(w, layers)
}

// GET /api/v1/meta/basemaps
func (h *MetaHandler) Basemaps(w http.ResponseWriter, r *http.Request) {
	const cacheKey = "meta:basemaps:v2"
	var basemaps []models.BasemapConfig

	if h.cache != nil {
		if err := h.cache.Get(r.Context(), cacheKey, &basemaps); err == nil {
			jsonOK(w, basemaps)
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.db.NewSelect().
		Model(&basemaps).
		Where("bm.is_active = true").
		OrderExpr("bm.sort_order ASC, bm.id ASC").
		Scan(ctx); err != nil {
		h.logger.Error("basemaps query failed", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to load basemaps")
		return
	}

	if h.cache != nil {
		_ = h.cache.Set(r.Context(), cacheKey, basemaps, 10*time.Minute)
	}
	jsonOK(w, basemaps)
}

// GET /api/v1/meta/config
func (h *MetaHandler) AppConfig(w http.ResponseWriter, r *http.Request) {
	const cacheKey = "meta:app_config"
	var configs []models.AppConfig

	if h.cache != nil {
		if err := h.cache.Get(r.Context(), cacheKey, &configs); err == nil {
			jsonOK(w, toConfigMap(configs))
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.db.NewSelect().
		Model(&configs).
		Scan(ctx); err != nil {
		h.logger.Error("app_config query failed", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to load config")
		return
	}

	result := toConfigMap(configs)
	if h.cache != nil {
		_ = h.cache.Set(r.Context(), cacheKey, result, 5*time.Minute)
	}
	jsonOK(w, result)
}

// GET /api/v1/meta/auth-providers
// Public endpoint — returns only which providers are enabled (no credentials).
// Used by the login page to decide which OAuth buttons to show.
func (h *MetaHandler) AuthProviders(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var configs []models.AppConfig
	if err := h.db.NewSelect().
		Model(&configs).
		Where("ac.category = 'auth_provider' AND ac.key LIKE '%.enabled'").
		Scan(ctx); err != nil {
		h.logger.Error("auth_providers query failed", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to load auth providers")
		return
	}

	// Return { "google": true, "azure": false, ... }
	enabled := map[string]bool{}
	for _, c := range configs {
		// key format: "auth_provider.<provider>.enabled"
		parts := splitKey(c.Key)
		if len(parts) == 3 {
			enabled[parts[1]] = c.Value == "true"
		}
	}
	jsonOK(w, enabled)
}

func splitKey(s string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '.' {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	return append(parts, s[start:])
}

func toConfigMap(configs []models.AppConfig) map[string]string {
	m := make(map[string]string, len(configs))
	for _, c := range configs {
		m[c.Key] = c.Value
	}
	return m
}
