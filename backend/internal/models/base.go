package models

import (
	"time"

	"github.com/uptrace/bun"
)

// Base is embedded in every dbo model for common audit columns.
type Base struct {
	bun.BaseModel

	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:now()" json:"created_at"`
	UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:now()" json:"updated_at"`
}
