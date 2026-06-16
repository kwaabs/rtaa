package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/r-taa/api/internal/config"
	"github.com/redis/go-redis/v9"
)

// Client wraps go-redis for Valkey.
type Client struct {
	rdb *redis.Client
}

func New(cfg *config.Config) (*Client, error) {
	opts, err := redis.ParseURL(cfg.ValkeyURL)
	if err != nil {
		return nil, fmt.Errorf("invalid VALKEY_URL: %w", err)
	}

	if cfg.ValkeyPassword != "" {
		opts.Password = cfg.ValkeyPassword
	}

	rdb := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("valkey ping failed: %w", err)
	}

	return &Client{rdb: rdb}, nil
}

func (c *Client) Close() error { return c.rdb.Close() }

// Get deserialises a cached JSON value into dst.
func (c *Client) Get(ctx context.Context, key string, dst any) error {
	b, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return err // redis.Nil when missing
	}
	return json.Unmarshal(b, dst)
}

// Set serialises src as JSON and stores it with the given TTL.
func (c *Client) Set(ctx context.Context, key string, src any, ttl time.Duration) error {
	b, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, b, ttl).Err()
}

// Del removes one or more keys.
func (c *Client) Del(ctx context.Context, keys ...string) error {
	return c.rdb.Del(ctx, keys...).Err()
}

// Invalidate deletes all keys matching a pattern.
func (c *Client) Invalidate(ctx context.Context, pattern string) error {
	iter := c.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return err
	}
	if len(keys) == 0 {
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}

// IsMiss reports whether err is a cache miss (key not found).
func IsMiss(err error) bool { return err == redis.Nil }
