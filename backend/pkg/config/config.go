package config

import (
	"os"
)

type Config struct {
	Port              string
	Environment       string
	CassandraHosts    []string
	CassandraPort     string
	CassandraKeyspace string
	JWTSecret         string
	RedisAddr         string
	// S3
	AWSRegion          string
	AWSBucket          string
	AWSAccessKeyID     string
	AWSSecretKey       string
	AWSEndpoint        string
	AWSPublicEndpoint  string
}

func LoadConfig() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		Environment:       getEnv("ENVIRONMENT", "development"),
		CassandraHosts:    []string{getEnv("CASSANDRA_HOST", "localhost")},
		CassandraPort:     getEnv("CASSANDRA_PORT", "9042"),
		CassandraKeyspace: getEnv("CASSANDRA_KEYSPACE", "jobswiper"),
		JWTSecret:         getEnv("JWT_SECRET", ""),
		RedisAddr:         getEnv("REDIS_ADDR", "localhost:6379"),
		AWSRegion:         getEnv("AWS_REGION", "us-east-1"),
		AWSBucket:         getEnv("S3_BUCKET", ""),
		AWSAccessKeyID:    getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretKey:      getEnv("AWS_SECRET_ACCESS_KEY", ""),
		AWSEndpoint:       getEnv("AWS_ENDPOINT", ""),
		AWSPublicEndpoint: getEnv("AWS_PUBLIC_ENDPOINT", ""),
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
