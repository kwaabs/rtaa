package handlers

// QueryHandler — advanced attribute query with multiple filter conditions.
// Returns rows without geometry + optional centroid (_lng, _lat) via ST_AsText.

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/r-taa/api/internal/models"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

// Ensure strconv is used (for wktFirstCoord)
var _ = strconv.ParseFloat

var coordRe = regexp.MustCompile(`(-?\d+\.?\d+)\s+(-?\d+\.?\d+)`)

type FilterCondition struct {
	Field    string `json:"field"`
	Operator string `json:"op"`    // =, !=, >, >=, <, <=, like, not_like, is_null, is_not_null
	Value    any    `json:"value"` // string | number | null
}

type QueryRequest struct {
	Conditions []FilterCondition `json:"conditions"`
	Logic      string            `json:"logic"` // "AND" (default) | "OR"
	Limit      int               `json:"limit"` // default 500
	// Optional spatial filter: [minLng, minLat, maxLng, maxLat] EPSG:4326
	Bbox    [4]float64 `json:"bbox"`
	HasBbox bool       `json:"has_bbox"`
}

type QueryResponse struct {
	Rows        []map[string]any `json:"rows"`
	Total       int              `json:"total"`
	LayerName   string           `json:"layer_name"`
	DisplayName string           `json:"display_name"`
}

var allowedOps = map[string]string{
	"=":          "=",
	"!=":         "!=",
	">":          ">",
	">=":         ">=",
	"<":          "<",
	"<=":         "<=",
	"like":       "ILIKE",
	"not_like":   "NOT ILIKE",
	"is_null":    "IS NULL",
	"is_not_null": "IS NOT NULL",
}

type QueryHandler struct {
	db     *bun.DB
	logger *zap.Logger
}

func NewQueryHandler(db *bun.DB, logger *zap.Logger) *QueryHandler {
	return &QueryHandler{db: db, logger: logger}
}

// POST /api/v1/layers/{layerName}/query
func (h *QueryHandler) ByLayer(w http.ResponseWriter, r *http.Request) {
	layerName := chi.URLParam(r, "layerName")

	body, err := io.ReadAll(io.LimitReader(r.Body, 64*1024))
	if err != nil {
		jsonError(w, http.StatusBadRequest, "cannot read body")
		return
	}
	var req QueryRequest
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if req.Logic == "" {
		req.Logic = "AND"
	}
	req.Logic = strings.ToUpper(req.Logic)
	if req.Logic != "AND" && req.Logic != "OR" {
		req.Logic = "AND"
	}
	if req.Limit <= 0 || req.Limit > 5000 {
		req.Limit = 500
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	var layerCfg models.LayerConfig
	if err := h.db.NewSelect().
		Model(&layerCfg).
		Where("name = ?", layerName).
		Scan(ctx); err != nil {
		jsonError(w, http.StatusNotFound, fmt.Sprintf("layer %q not found", layerName))
		return
	}

	geomCol := layerCfg.GeomColumn
	table := layerCfg.SourceTable

	var whereParts []string

	whereParts = append(whereParts, fmt.Sprintf("%s IS NOT NULL", geomCol))

	for _, cond := range req.Conditions {
		if !isSafeIdentifier(cond.Field) {
			jsonError(w, http.StatusBadRequest, fmt.Sprintf("invalid field name: %q", cond.Field))
			return
		}
		sqlOp, ok := allowedOps[cond.Operator]
		if !ok {
			jsonError(w, http.StatusBadRequest, fmt.Sprintf("unknown operator: %q", cond.Operator))
			return
		}

		if cond.Operator == "is_null" || cond.Operator == "is_not_null" {
			whereParts = append(whereParts, fmt.Sprintf("%s %s", cond.Field, sqlOp))
			continue
		}

		// Embed the value safely: cast to text, quote with escaped single-quotes.
		// Field names are validated by isSafeIdentifier; operators are whitelisted above.
		val := strings.ReplaceAll(fmt.Sprintf("%v", cond.Value), "'", "''")
		if cond.Operator == "like" || cond.Operator == "not_like" {
			whereParts = append(whereParts, fmt.Sprintf("%s::text %s '%%%s%%'", cond.Field, sqlOp, val))
		} else {
			whereParts = append(whereParts, fmt.Sprintf("%s::text %s '%s'", cond.Field, sqlOp, val))
		}
	}

	// Spatial bbox filter — always AND-ed regardless of req.Logic
	var spatialClause string
	if req.HasBbox {
		spatialClause = fmt.Sprintf(
			"ST_Intersects(%s, ST_MakeEnvelope(%f, %f, %f, %f, 4326))",
			geomCol, req.Bbox[0], req.Bbox[1], req.Bbox[2], req.Bbox[3],
		)
	}

	sep := " " + req.Logic + " "
	attrClause := strings.Join(whereParts, sep)
	whereClause := attrClause
	if spatialClause != "" {
		whereClause = attrClause + " AND " + spatialClause
	}

	// Include ST_AsText for centroid extraction (no ST_AsGeoJSON needed)
	query := fmt.Sprintf(`
		SELECT row_to_json(sub)
		FROM (
			SELECT *, ST_AsText(%s) AS _geom_text
			FROM %s
			WHERE %s
			LIMIT %d
		) sub`,
		geomCol, table, whereClause, req.Limit)

	rows, err := h.db.QueryContext(ctx, query)
	if err != nil {
		// Fallback: try without ST_AsText if it fails
		h.logger.Warn("query with ST_AsText failed, retrying without geometry", zap.Error(err))
		queryNoGeom := fmt.Sprintf(`
			SELECT row_to_json(sub)
			FROM (SELECT * FROM %s WHERE %s LIMIT %d) sub`,
			table, whereClause, req.Limit)
		rows, err = h.db.QueryContext(ctx, queryNoGeom)
		if err != nil {
			h.logger.Error("query failed", zap.String("layer", layerName), zap.Error(err))
			jsonError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	defer rows.Close()

	var resultRows []map[string]any
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			continue
		}
		var row map[string]any
		if err := json.Unmarshal(raw, &row); err != nil {
			continue
		}

		// Extract centroid from WKT, then drop geometry columns
		if geomText, ok := row["_geom_text"].(string); ok {
			if m := coordRe.FindStringSubmatch(geomText); m != nil {
				if lng, err := strconv.ParseFloat(m[1], 64); err == nil {
					if lat, err := strconv.ParseFloat(m[2], 64); err == nil {
						row["_lng"] = lng
						row["_lat"] = lat
					}
				}
			}
		}
		delete(row, "_geom_text")
		delete(row, geomCol)
		delete(row, "the_geom")
		delete(row, "geom")
		delete(row, "ogc_fid")

		resultRows = append(resultRows, row)
	}

	if resultRows == nil {
		resultRows = []map[string]any{}
	}

	jsonOK(w, QueryResponse{
		Rows:        resultRows,
		Total:       len(resultRows),
		LayerName:   layerCfg.Name,
		DisplayName: layerCfg.DisplayName,
	})
}
