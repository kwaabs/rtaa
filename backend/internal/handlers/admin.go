package handlers

// AdminHandler — CRUD for meta.layer_configs, meta.basemap_configs,
// meta.app_configs. All routes require admin role (enforced upstream).

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/r-taa/api/internal/models"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type AdminHandler struct {
	db     *bun.DB
	logger *zap.Logger
}

func NewAdminHandler(db *bun.DB, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{db: db, logger: logger}
}

// ── Layer configs ─────────────────────────────────────────────────────────────

// GET /admin/layers
func (h *AdminHandler) ListLayers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var layers []models.LayerConfig
	if err := h.db.NewSelect().Model(&layers).
		OrderExpr("lc.sort_order ASC, lc.id ASC").
		Scan(ctx); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonOK(w, layers)
}

// PUT /admin/layers/{id}
func (h *AdminHandler) UpdateLayer(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "invalid id")
		return
	}

	body, _ := io.ReadAll(io.LimitReader(r.Body, 64*1024))
	var lc models.LayerConfig
	if err := json.Unmarshal(body, &lc); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	lc.ID = id
	lc.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	_, err = h.db.NewUpdate().Model(&lc).
		Column(
			"display_name", "description",
			"layer_type", "paint_spec", "layout_spec", "filter_spec", "popup_spec",
			"min_zoom", "max_zoom", "sort_order", "is_visible", "is_public", "updated_at",
		).
		Where("lc.id = ?", id).
		Exec(ctx)
	if err != nil {
		h.logger.Error("update layer failed", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}

// ── Basemap configs ───────────────────────────────────────────────────────────

// GET /admin/basemaps
func (h *AdminHandler) ListBasemaps(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var bms []models.BasemapConfig
	if err := h.db.NewSelect().Model(&bms).
		OrderExpr("bm.sort_order ASC, bm.id ASC").
		Scan(ctx); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonOK(w, bms)
}

// PUT /admin/basemaps/{id}
func (h *AdminHandler) UpdateBasemap(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "invalid id")
		return
	}
	body, _ := io.ReadAll(io.LimitReader(r.Body, 16*1024))
	var patch models.BasemapConfig
	if err := json.Unmarshal(body, &patch); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	patch.ID = id

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	_, err = h.db.NewUpdate().Model(&patch).
		Column("display_name", "style_url", "attribution", "is_default", "is_active", "sort_order", "thumbnail_url").
		Where("bm.id = ?", id).
		Exec(ctx)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}

// ── App config ────────────────────────────────────────────────────────────────

// GET /admin/config
func (h *AdminHandler) ListConfig(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var cfgs []models.AppConfig
	if err := h.db.NewSelect().Model(&cfgs).
		OrderExpr("ac.category ASC, ac.key ASC").
		Scan(ctx); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonOK(w, cfgs)
}

// PUT /admin/config/{key}
func (h *AdminHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	body, _ := io.ReadAll(io.LimitReader(r.Body, 4*1024))

	var patch struct {
		Value     string `json:"value"`
		ValueType string `json:"value_type"`
		Label     string `json:"label"`
		Category  string `json:"category"`
	}
	if err := json.Unmarshal(body, &patch); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	cfg := &models.AppConfig{
		Key: key, Value: patch.Value,
		ValueType: patch.ValueType, Label: patch.Label,
		Category: patch.Category, UpdatedAt: time.Now(),
	}
	_, err := h.db.NewInsert().Model(cfg).
		On("CONFLICT (key) DO UPDATE").
		Set("value = EXCLUDED.value, value_type = EXCLUDED.value_type, label = EXCLUDED.label, category = EXCLUDED.category, updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}

// ── Auth providers ────────────────────────────────────────────────────────────

// GET /admin/auth-providers
// Returns which providers are enabled (reads from app_configs).
func (h *AdminHandler) ListAuthProviders(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var cfgs []models.AppConfig
	if err := h.db.NewSelect().Model(&cfgs).
		Where("ac.category = 'auth_provider'").
		Scan(ctx); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Group by provider
	providers := map[string]map[string]string{}
	for _, c := range cfgs {
		// key format: "auth_provider.google.client_id"
		parts := splitN(c.Key, ".", 3)
		if len(parts) < 3 { continue }
		p := parts[1]
		if providers[p] == nil { providers[p] = map[string]string{} }
		providers[p][parts[2]] = c.Value
	}
	jsonOK(w, providers)
}

// PUT /admin/auth-providers/{provider}
// Saves provider credentials into meta.app_configs (never into .env directly).
func (h *AdminHandler) UpdateAuthProvider(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	body, _ := io.ReadAll(io.LimitReader(r.Body, 8*1024))

	var fields map[string]string
	if err := json.Unmarshal(body, &fields); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	for field, val := range fields {
		cfg := &models.AppConfig{
			Key:       "auth_provider." + provider + "." + field,
			Value:     val,
			ValueType: "text",
			Category:  "auth_provider",
			Label:     provider + " " + field,
			UpdatedAt: time.Now(),
		}
		if _, err := h.db.NewInsert().Model(cfg).
			On("CONFLICT (key) DO UPDATE").
			Set("value = EXCLUDED.value, updated_at = EXCLUDED.updated_at").
			Exec(ctx); err != nil {
			jsonError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	jsonOK(w, map[string]any{"ok": true, "provider": provider})
}

func splitN(s, sep string, n int) []string {
	result := []string{}
	for i := 0; i < n-1; i++ {
		idx := indexOf(s, sep)
		if idx < 0 { break }
		result = append(result, s[:idx])
		s = s[idx+len(sep):]
	}
	return append(result, s)
}

func indexOf(s, sub string) int {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub { return i }
	}
	return -1
}
