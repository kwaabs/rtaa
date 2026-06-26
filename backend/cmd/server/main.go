package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/r-taa/api/internal/auth"
	"github.com/r-taa/api/internal/cache"
	"github.com/r-taa/api/internal/config"
	"github.com/r-taa/api/internal/db"
	"github.com/r-taa/api/internal/handlers"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config error:", err)
		os.Exit(1)
	}

	// ── Logger ────────────────────────────────────────────────────────────────
	var logger *zap.Logger
	if cfg.IsDev() {
		logger, _ = zap.NewDevelopment()
	} else {
		logger, _ = zap.NewProduction()
	}
	defer logger.Sync()

	// ── Database ──────────────────────────────────────────────────────────────
	bunDB, err := db.New(cfg)
	if err != nil {
		logger.Fatal("database init failed", zap.Error(err))
	}
	defer bunDB.Close()

	// ── Cache (Valkey) ────────────────────────────────────────────────────────
	cacheClient, err := cache.New(cfg)
	if err != nil {
		logger.Warn("valkey unavailable — running without cache", zap.Error(err))
		cacheClient = nil
	}
	if cacheClient != nil {
		defer cacheClient.Close()
	}

	// ── Auth middleware ───────────────────────────────────────────────────────
	authMw := auth.NewMiddleware(cfg.GoTrueURL, logger)

	// ── Handlers ─────────────────────────────────────────────────────────────
	healthH   := handlers.NewHealthHandler(bunDB, logger)
	metaH     := handlers.NewMetaHandler(bunDB, cacheClient, logger)
	featuresH := handlers.NewFeaturesHandler(bunDB, cacheClient, logger)
	attrsH    := handlers.NewAttrsHandler(bunDB, cacheClient, logger)
	fieldsH   := handlers.NewFieldsHandler(bunDB, cacheClient, logger)
	queryH    := handlers.NewQueryHandler(bunDB, logger)
	adminH    := handlers.NewAdminHandler(bunDB, logger)
	cadH      := handlers.NewCadHandler(cfg.DWGConverterURL, logger)

	// ── Router ────────────────────────────────────────────────────────────────
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	// Per-request timeout — skip for CAD upload/convert which can take minutes
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/v1/cad/") {
				next.ServeHTTP(w, r)
				return
			}
			middleware.Timeout(30 * time.Second)(next).ServeHTTP(w, r)
		})
	})

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.CORSAllowedOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-Id"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Global rate limiter: 200 req/min per IP
	r.Use(httprate.LimitByIP(200, time.Minute))

	// ── Routes ────────────────────────────────────────────────────────────────
	r.Get("/healthz/live", healthH.Live)
	r.Get("/healthz/ready", healthH.Ready)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/meta/layers", metaH.Layers)
		r.Get("/meta/basemaps", metaH.Basemaps)
		r.Get("/meta/config", metaH.AppConfig)
		r.Get("/meta/auth-providers", metaH.AuthProviders)

		r.Group(func(r chi.Router) {
			r.Use(authMw.Require)

			r.Post("/cad/convert", cadH.Convert)
			r.Post("/cad/convert-geojson", cadH.ConvertGeoJSON)

			r.Get("/layers/{layerName}/features", featuresH.ByLayer)
			r.Get("/layers/{layerName}/attrs", attrsH.ByLayer)
			r.Get("/layers/{layerName}/fields", fieldsH.ByLayer)
			r.Post("/layers/{layerName}/query", queryH.ByLayer)

			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAdmin)
				r.Get("/admin/layers", adminH.ListLayers)
				r.Put("/admin/layers/{id}", adminH.UpdateLayer)
				r.Get("/admin/basemaps", adminH.ListBasemaps)
				r.Put("/admin/basemaps/{id}", adminH.UpdateBasemap)
				r.Get("/admin/config", adminH.ListConfig)
				r.Put("/admin/config/{key}", adminH.UpdateConfig)
				r.Get("/admin/auth-providers", adminH.ListAuthProviders)
				r.Put("/admin/auth-providers/{provider}", adminH.UpdateAuthProvider)
			})
		})
	})

	// ── Server ────────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: r,
		// CAD uploads can be large and conversions slow — use generous timeouts.
		ReadTimeout:  10 * time.Minute,
		WriteTimeout: 10 * time.Minute,
		IdleTimeout:  120 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("api server starting", zap.Int("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("server failed", zap.Error(err))
		}
	}()

	<-quit
	logger.Info("shutting down…")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", zap.Error(err))
	}
	logger.Info("server exited")
}
