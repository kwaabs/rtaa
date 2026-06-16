package handlers

// FieldsHandler returns column metadata for a layer's source table.
// Used by the query builder to populate the field dropdown with correct types.

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/r-taa/api/internal/cache"
	"github.com/r-taa/api/internal/models"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type FieldInfo struct {
	Name     string `json:"name"`
	DataType string `json:"data_type"` // text | numeric | integer | boolean | timestamp | geometry
}

var skipColumns = map[string]bool{
	"the_geom": true, "geom": true, "shape": true,
	"gdb_geomattr_data": true, "ogc_fid": true,
	"shape_length": true, "shape_area": true,
}

type FieldsHandler struct {
	db     *bun.DB
	cache  *cache.Client
	logger *zap.Logger
}

func NewFieldsHandler(db *bun.DB, c *cache.Client, logger *zap.Logger) *FieldsHandler {
	return &FieldsHandler{db: db, cache: c, logger: logger}
}

// GET /api/v1/layers/{layerName}/fields
func (h *FieldsHandler) ByLayer(w http.ResponseWriter, r *http.Request) {
	layerName := chi.URLParam(r, "layerName")
	cacheKey := "fields:" + layerName

	var cached []FieldInfo
	if h.cache != nil {
		if err := h.cache.Get(r.Context(), cacheKey, &cached); err == nil {
			jsonOK(w, cached)
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var layerCfg models.LayerConfig
	if err := h.db.NewSelect().
		Model(&layerCfg).
		Where("name = ?", layerName).
		Scan(ctx); err != nil {
		jsonError(w, http.StatusNotFound, fmt.Sprintf("layer %q not found", layerName))
		return
	}

	// Split "dbo.dbo_power_transformer_evw" → schema="dbo", table="dbo_power_transformer_evw"
	parts := strings.SplitN(layerCfg.SourceTable, ".", 2)
	var schema, table string
	if len(parts) == 2 {
		schema, table = parts[0], parts[1]
	} else {
		schema, table = "dbo", layerCfg.SourceTable
	}

	rows, err := h.db.QueryContext(ctx, fmt.Sprintf(`
		SELECT column_name, data_type, udt_name
		FROM information_schema.columns
		WHERE table_schema = '%s'
		  AND table_name   = '%s'
		ORDER BY ordinal_position`,
		schema, table))
	if err != nil {
		h.logger.Error("fields query failed", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var fields []FieldInfo
	for rows.Next() {
		var col, dt, udt string
		if err := rows.Scan(&col, &dt, &udt); err != nil {
			continue
		}
		if skipColumns[col] {
			continue
		}
		fields = append(fields, FieldInfo{
			Name:     col,
			DataType: normalizeDataType(dt, udt),
		})
	}

	if h.cache != nil {
		_ = h.cache.Set(r.Context(), cacheKey, fields, 30*time.Minute)
	}
	jsonOK(w, fields)
}

func normalizeDataType(pgType, udt string) string {
	switch {
	case strings.HasPrefix(pgType, "character"), pgType == "text", pgType == "name":
		return "text"
	case pgType == "integer", pgType == "bigint", pgType == "smallint":
		return "integer"
	case strings.Contains(pgType, "numeric"), pgType == "real", pgType == "double precision":
		return "numeric"
	case pgType == "boolean":
		return "boolean"
	case strings.Contains(pgType, "timestamp"), pgType == "date":
		return "timestamp"
	case strings.Contains(udt, "geometry"), strings.Contains(udt, "geography"):
		return "geometry"
	default:
		return "text"
	}
}
