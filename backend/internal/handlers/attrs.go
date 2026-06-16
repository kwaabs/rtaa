package handlers

// AttrsHandler — returns raw attribute rows as JSON objects with NO geometry.
//
// Avoids ST_AsGeoJSON entirely, so the public.geometry / extensions.geometry
// type conflict cannot occur. Used by the frontend attribute window.
//
// GET /api/v1/layers/{layerName}/attrs?ids=1,2,3
// GET /api/v1/layers/{layerName}/attrs?search=VOLTA&field=district_name
// GET /api/v1/layers/{layerName}/attrs?bbox=minx,miny,maxx,maxy

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

type AttrsHandler struct {
	db     *bun.DB
	cache  *cache.Client
	logger *zap.Logger
}

func NewAttrsHandler(db *bun.DB, c *cache.Client, logger *zap.Logger) *AttrsHandler {
	return &AttrsHandler{db: db, cache: c, logger: logger}
}

func (h *AttrsHandler) ByLayer(w http.ResponseWriter, r *http.Request) {
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

	if bbox == "" && searchText == "" && idsRaw == "" {
		jsonError(w, http.StatusBadRequest, "at least one of bbox, search, or ids is required")
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

	cacheKey := fmt.Sprintf("attrs:%s:bbox=%s:s=%s:f=%s:ids=%s:lim=%d",
		layerName, bbox, searchText, searchField, idsRaw, limit)

	var cached []map[string]any
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
		if searchField != "" && isSafeIdentifier(searchField) {
			col = searchField
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
		SELECT row_to_json(sub)
		FROM (
			SELECT * FROM %s
			WHERE %s
			LIMIT %d
		) sub`,
		table, where, limit)

	rows, err := h.db.QueryContext(ctx, query)
	if err != nil {
		h.logger.Error("attrs query failed",
			zap.String("layer", layerName),
			zap.String("table", table),
			zap.Error(err))
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	result := make([]map[string]any, 0)
	for rows.Next() {
		var rawJSON []byte
		if err := rows.Scan(&rawJSON); err != nil {
			continue
		}
		var row map[string]any
		if err := json.Unmarshal(rawJSON, &row); err != nil {
			continue
		}
		// Drop geometry column from the returned object
		delete(row, geomCol)
		delete(row, "the_geom")
		delete(row, "geom")
		result = append(result, row)
	}

	if h.cache != nil {
		_ = h.cache.Set(ctx, cacheKey, result, 2*time.Minute)
	}
	jsonOK(w, result)
}
