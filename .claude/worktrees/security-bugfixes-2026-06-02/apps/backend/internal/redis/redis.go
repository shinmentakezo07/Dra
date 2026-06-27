package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Client wraps go-redis with connection health checking.
type Client struct {
	*redis.Client
}

// New creates a new Redis client from a URL or returns an error.
// Supports redis:// and rediss:// URLs.
func New(redisURL string) (*Client, error) {
	if redisURL == "" {
		return nil, fmt.Errorf("redis URL is empty")
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis URL: %w", err)
	}

	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &Client{client}, nil
}

// Health checks if Redis is reachable.
func (c *Client) Health(ctx context.Context) error {
	if c == nil {
		return fmt.Errorf("redis client is nil")
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return c.Client.Ping(ctx).Err()
}
