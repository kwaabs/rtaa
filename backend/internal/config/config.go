package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port              int
	CORSAllowedOrigin string
	// Database
	DatabaseURL string
	// GoTrue
	GoTrueURL string
	JWTSecret string
	// Valkey / Redis
	ValkeyURL      string
	ValkeyPassword string
	// DWG converter sidecar
	DWGConverterURL string
	// App
	Env      string
	LogLevel string
}

func Load() (*Config, error) {
	// Load .env if present (ignored in production)
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	port, err := strconv.Atoi(getEnv("BACKEND_PORT", "9833"))
	if err != nil {
		return nil, fmt.Errorf("invalid BACKEND_PORT: %w", err)
	}

	cfg := &Config{
		Port:              port,
		CORSAllowedOrigin: getEnv("CORS_ALLOWED_ORIGIN", "http://localhost:9834"),
		DatabaseURL:       requireEnv("DATABASE_URL"),
		GoTrueURL:         requireEnv("GOTRUE_URL"),
		JWTSecret:         requireEnv("JWT_SECRET"),
		ValkeyURL:         getEnv("VALKEY_URL", "redis://localhost:9832/0"),
		ValkeyPassword:    getEnv("VALKEY_PASSWORD", ""),
		DWGConverterURL:   getEnv("DWG_CONVERTER_URL", "http://localhost:9838"),
		Env:               getEnv("APP_ENV", "development"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
	}
	return cfg, nil
}

func (c *Config) IsDev() bool { return c.Env == "development" }

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %q is not set", key))
	}
	return v
}
