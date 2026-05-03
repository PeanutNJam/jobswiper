// Package matchqueue provides atomic mutual-swipe detection using Redis.
//
// When two users both swipe right on each other, exactly one of their
// concurrent requests will "win" the match and be responsible for creating
// the match record and firing push notifications. This is achieved with a
// Lua script that atomically SADD + SCARD on a per-pair Redis SET, so no
// two goroutines can both observe count == 2 for the same pair.
//
// Key structure:  swipe:right:{min_uid}:{max_uid}
// Key TTL:        30 days (auto-expires stale unpaired swipes)
package matchqueue

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const pairTTL = 30 * 24 * time.Hour

// saddCount atomically adds ARGV[1] (uid) to the SET at KEYS[1] and returns
// the new cardinality. SADD is idempotent — re-swiping never inflates the count.
var saddCount = redis.NewScript(`
redis.call('SADD', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
return redis.call('SCARD', KEYS[1])
`)

// Client wraps a Redis connection for match detection.
type Client struct {
	rdb *redis.Client
}

func NewClient(addr string) *Client {
	return &Client{
		rdb: redis.NewClient(&redis.Options{
			Addr:         addr,
			DialTimeout:  3 * time.Second,
			ReadTimeout:  2 * time.Second,
			WriteTimeout: 2 * time.Second,
		}),
	}
}

func (c *Client) Ping(ctx context.Context) error {
	return c.rdb.Ping(ctx).Err()
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

// RecordRightSwipe records that uid swiped right on targetUID.
// It returns true exactly once — for the request that completes the mutual
// match. The caller that receives true is responsible for creating the match
// record and sending notifications.
func (c *Client) RecordRightSwipe(ctx context.Context, uid, targetUID string) (bool, error) {
	key := pairKey(uid, targetUID)
	ttlSecs := int(pairTTL.Seconds())

	n, err := saddCount.Run(ctx, c.rdb, []string{key}, uid, ttlSecs).Int()
	if err != nil {
		return false, fmt.Errorf("matchqueue redis: %w", err)
	}

	if n >= 2 {
		// Clean up immediately — the key is no longer needed and we don't
		// want a third hypothetical swipe to re-trigger match detection.
		c.rdb.Del(ctx, key)
		return true, nil
	}

	return false, nil
}

// pairKey returns a stable Redis key for a user pair regardless of argument order.
func pairKey(uid1, uid2 string) string {
	if uid1 > uid2 {
		uid1, uid2 = uid2, uid1
	}
	return fmt.Sprintf("swipe:right:%s:%s", uid1, uid2)
}
