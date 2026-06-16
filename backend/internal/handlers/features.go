package handlers

// FeaturesHandler — GeoJSON search / filter endpoint.
//
// Map rendering is handled entirely by the Martin vector tile server.
// This endpoint exists for:
//   - Attribute search  (?search=VOLTA&field=district_name)
//   - Bounding-box      (?bbox=minx,miny,maxx,maxy)
//   - ID lookup         (?ids=1,2,3)
//   - Export            (?bbox=…&limit=5000)
//
// At least one of bbox, search, or ids MUST be supplied to prevent
// accidentally dumping entire tables.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/r-taa/api/internal/cache"
	"github.com/r-taa/api/internal/models"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

const (
	defaultSearchLimit = 500
	maxSearchLimit     = 5000
)

type FeaturesHandler struct {
	db     *bun.DB
	cache  *cache.Client
	logger *zap.Logger
}

func NewFeaturesHandler(db *bun.DB, c *cache.Client, logger *zap.Logger) *FeaturesHandler {
	return &FeaturesHandler{db: db, cache: c, logger: logger}
}

// GET /api/v1/layers/{layerName}/features
//
// Query params:
//   bbox   = minx,miny,maxx,maxy  (EPSG:4326)
//   search = text value to match
//   field  = column to search in (default: objectid)
//   ids    = comma-separated objectid list
//   limit  = max features (default 500, max 5000)
func (h *FeaturesHandler) ByLayer(w http.ResponseWriter, r *http.Request) {
	layerName := chi.URLParam(r, "layerName")

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var layerCfg models.LayerConfig
	if err := h.db.NewSelect().
		Model(&layerCfg).
		Where("name = ?", layerName).
		Scan(ctx); err != nil {
		jsonError(w, http.StatusNotFound, fmt.Sprintf("layer %q not found", layerName))
		return
	}

	q := r.URL.Query()
	bbox := q.Get("bbox")
	searchText := q.Get("search")
	searchField := q.Get("field")
	idsRaw := q.Get("ids")
	limitStr := q.Get("limit")

	// Require at least one filter — we don't want to dump whole tables.
	if bbox == "" && searchText == "" && idsRaw == "" {
		jsonError(w, http.StatusBadRequest,
			"at least one of bbox, search, or ids is required; use the Martin tile server for full-layer display")
		return
	}

	limit := defaultSearchLimit
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
			limit = v
		}
	}
	if limit > maxSearchLimit {
		limit = maxSearchLimit
	}

	cacheKey := fmt.Sprintf("features:%s:bbox=%s:s=%s:f=%s:ids=%s:lim=%d",
		layerName, bbox, searchText, searchField, idsRaw, limit)

	var cached map[string]any
	if h.cache != nil {
		if err := h.cache.Get(ctx, cacheKey, &cached); err == nil {
			jsonOK(w, cached)
			return
		}
	}

	geomCol := layerCfg.GeomColumn
	table := layerCfg.SourceTable

	var conditions []string

	conditions = append(conditions, fmt.Sprintf("%s IS NOT NULL", geomCol))

	if bbox != "" {
		coords, err := parseBBox(bbox)
		if err != nil {
			jsonError(w, http.StatusBadRequest, "invalid bbox: "+err.Error())
			return
		}
		conditions = append(conditions,
			fmt.Sprintf("%s && ST_MakeEnvelope(%f,%f,%f,%f,4326)",
				geomCol, coords[0], coords[1], coords[2], coords[3]))
	}

	if searchText != "" {
		col := "objectid"
		if searchField != "" {
			if isSafeIdentifier(searchField) {
				col = searchField
			} else {
				jsonError(w, http.StatusBadRequest, "invalid field name")
				return
			}
		}
		escaped := strings.ReplaceAll(searchText, "'", "''")
		conditions = append(conditions, fmt.Sprintf("%s::text ILIKE '%%%s%%'", col, escaped))
	}

	if idsRaw != "" {
		ids := parseIntList(idsRaw)
		if len(ids) > 0 {
			parts := make([]string, len(ids))
			for i, id := range ids {
				parts[i] = strconv.FormatInt(int64(id), 10)
			}
			conditions = append(conditions,
				fmt.Sprintf("objectid IN (%s)", strings.Join(parts, ",")))
		}
	}

	where := strings.Join(conditions, " AND ")
	query := fmt.Sprintf(`
		SELECT jsonb_build_object(
			'type',       'Feature',
			'geometry',   ST_AsGeoJSON(%s)::jsonb,
			'properties', (row_to_json(t)::jsonb) - '%s'
		) AS feature
		FROM %s t
		WHERE %s
		LIMIT %d`,
		geomCol, geomCol, table, where, limit)

	rows, err := h.db.QueryContext(ctx, query)
	if err != nil {
		h.logger.Error("features query failed",
			zap.String("layer", layerName),
			zap.String("table", table),
			zap.String("query", query),
			zap.Error(err))
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	features := make([]map[string]any, 0)
	for rows.Next() {
		var rawJSON []byte
		if err := rows.Scan(&rawJSON); err != nil {
			continue
		}
		var feature map[string]any
		if err := json.Unmarshal(rawJSON, &feature); err != nil {
			continue
		}
		features = append(features, feature)
	}

	fc := map[string]any{
		"type":     "FeatureCollection",
		"features": features,
	}

	if h.cache != nil {
		_ = h.cache.Set(ctx, cacheKey, fc, 2*time.Minute)
	}
	jsonOK(w, fc)
}

func parseBBox(bbox string) ([4]float64, error) {
	var coords [4]float64
	parts := splitComma(bbox)
	if len(parts) != 4 {
		return coords, fmt.Errorf("bbox must have 4 components")
	}
	for i, p := range parts {
		v, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err != nil {
			return coords, err
		}
		coords[i] = v
	}
	return coords, nil
}

func parseIntList(s string) []int {
	var out []int
	for _, p := range splitComma(s) {
		v, err := strconv.Atoi(strings.TrimSpace(p))
		if err == nil {
			out = append(out, v)
		}
	}
	return out
}

func splitComma(s string) []string {
	return strings.Split(s, ",")
}

func isSafeIdentifier(s string) bool {
	for _, c := range s {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == '_') {
			return false
		}
	}
	return len(s) > 0
}
