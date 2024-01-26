package storage

import (
	"os"

	"github.com/redis/go-redis/v9"
)

var Redis = redis.NewClient(&redis.Options{
    Addr: os.Getenv("REDIS_URL"),
    Password: "",
    DB: 0,
})
