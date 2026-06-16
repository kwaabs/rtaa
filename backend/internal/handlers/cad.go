package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"go.uber.org/zap"
)

// CadHandler converts DWG → DXF and returns the DXF text.
// It tries the dwg-converter sidecar first; falls back to a local dwg2dxf binary.
type CadHandler struct {
	converterURL string // e.g. "http://dwg-converter:9838"  (empty = use local binary)
	logger       *zap.Logger
}

func NewCadHandler(converterURL string, logger *zap.Logger) *CadHandler {
	return &CadHandler{converterURL: strings.TrimRight(converterURL, "/"), logger: logger}
}

// POST /api/v1/cad/convert-geojson
// Accepts: multipart/form-data with field "file" (.dwg)
// Returns: GeoJSON FeatureCollection (application/json) — coordinates in original CRS
func (h *CadHandler) ConvertGeoJSON(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid multipart form: "+err.Error())
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		jsonError(w, http.StatusBadRequest, "missing 'file' field")
		return
	}
	defer file.Close()
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".dwg") {
		jsonError(w, http.StatusBadRequest, "only .dwg files are accepted")
		return
	}
	dwgData, err := io.ReadAll(io.LimitReader(file, 100<<20))
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "failed to read upload")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	if h.converterURL == "" {
		jsonError(w, http.StatusServiceUnavailable, "dwg-converter sidecar not configured")
		return
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		h.converterURL+"/convert-geojson", bytes.NewReader(dwgData))
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/octet-stream")

	resp, err := (&http.Client{Timeout: 2 * time.Minute}).Do(req)
	if err != nil {
		h.logger.Error("dwg-converter unreachable", zap.Error(err))
		jsonError(w, http.StatusServiceUnavailable, "dwg-converter sidecar unreachable: "+err.Error())
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		var errBody struct{ Error string `json:"error"` }
		_ = json.Unmarshal(body, &errBody)
		h.logger.Error("dwg conversion failed", zap.String("file", header.Filename), zap.String("detail", errBody.Error))
		jsonError(w, http.StatusInternalServerError, "DWG conversion failed: "+errBody.Error)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

// POST /api/v1/cad/convert
// Accepts: multipart/form-data with field "file" (.dwg)
// Returns: DXF text (text/plain)
func (h *CadHandler) Convert(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid multipart form: "+err.Error())
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		jsonError(w, http.StatusBadRequest, "missing 'file' field")
		return
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".dwg") {
		jsonError(w, http.StatusBadRequest, "only .dwg files are accepted")
		return
	}

	dwgData, err := io.ReadAll(io.LimitReader(file, 100<<20))
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "failed to read upload")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	var dxfText string
	if h.converterURL != "" {
		dxfText, err = h.convertViaSidecar(ctx, dwgData)
	} else {
		dxfText, err = h.convertViaLocalBinary(ctx, dwgData)
	}
	if err != nil {
		h.logger.Error("DWG conversion failed", zap.String("file", header.Filename), zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "DWG conversion failed: "+err.Error())
		return
	}

	dxfName := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename)) + ".dxf"
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, dxfName))
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, dxfText)
}

func (h *CadHandler) convertViaSidecar(ctx context.Context, dwgData []byte) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		h.converterURL+"/convert", bytes.NewReader(dwgData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/octet-stream")

	resp, err := (&http.Client{Timeout: 2 * time.Minute}).Do(req)
	if err != nil {
		// Sidecar unavailable — try local binary as fallback
		h.logger.Warn("dwg-converter sidecar unreachable, trying local binary", zap.Error(err))
		return h.convertViaLocalBinary(ctx, dwgData)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("converter returned %d: %s", resp.StatusCode, string(body))
	}
	return string(body), nil
}

func (h *CadHandler) convertViaLocalBinary(ctx context.Context, dwgData []byte) (string, error) {
	// Check if dwg2dxf is available
	if _, err := exec.LookPath("dwg2dxf"); err != nil {
		return "", fmt.Errorf("dwg2dxf not found — start the dwg-converter service or install libredwg-utils")
	}

	tmp, err := os.MkdirTemp("", "rtaa-dwg-*")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmp)

	dwgPath := filepath.Join(tmp, "input.dwg")
	if err := os.WriteFile(dwgPath, dwgData, 0o600); err != nil {
		return "", err
	}

	cmd := exec.CommandContext(ctx, "dwg2dxf", "--as", "r2000", "-y", dwgPath)
	cmd.Dir = tmp
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("dwg2dxf: %s", string(out))
	}

	dxfPath := filepath.Join(tmp, "input.dxf")
	dxf, err := os.ReadFile(dxfPath)
	if err != nil {
		return "", fmt.Errorf("no DXF output produced: %w", err)
	}
	return string(dxf), nil
}
