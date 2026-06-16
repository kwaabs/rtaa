package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/r-taa/api/internal/config"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/extra/bundebug"
)

// New opens a bun.DB connected to Supabase PostGIS.
// search_path defaults to "dbo" so every query hits the right schema.
func New(cfg *config.Config) (*bun.DB, error) {
	sqldb := sql.OpenDB(pgdriver.NewConnector(
		pgdriver.WithDSN(cfg.DatabaseURL),
		pgdriver.WithTimeout(30*time.Second),
		pgdriver.WithReadTimeout(15*time.Second),
		pgdriver.WithWriteTimeout(15*time.Second),
	))

	sqldb.SetMaxOpenConns(25)
	sqldb.SetMaxIdleConns(5)
	sqldb.SetConnMaxLifetime(5 * time.Minute)
	sqldb.SetConnMaxIdleTime(2 * time.Minute)

	db := bun.NewDB(sqldb, pgdialect.New())

	if cfg.IsDev() {
		db.AddQueryHook(bundebug.NewQueryHook(
			bundebug.WithVerbose(true),
		))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("db ping failed: %w", err)
	}

	return db, nil
}
