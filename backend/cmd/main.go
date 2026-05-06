package main

import (
	"context"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jobswiper/backend/internal/db"
	"github.com/jobswiper/backend/internal/handlers"
	"github.com/jobswiper/backend/pkg/config"
	"github.com/jobswiper/backend/pkg/hub"
	"github.com/jobswiper/backend/pkg/matchqueue"
	"github.com/jobswiper/backend/pkg/middleware"
	"github.com/jobswiper/backend/pkg/storage"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.LoadConfig()

	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET environment variable must be set")
	}

	log.Printf("[CONFIG] AWSBucket=%s AWSEndpoint=%s AWSPublicEndpoint=%s", cfg.AWSBucket, cfg.AWSEndpoint, cfg.AWSPublicEndpoint)

	cassandraDB, err := db.NewCassandraDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize Cassandra: %v", err)
	}
	defer cassandraDB.Close()

	matchQ := matchqueue.NewClient(cfg.RedisAddr)
	if err := matchQ.Ping(context.Background()); err != nil {
		log.Printf("Redis unavailable; continuing with Cassandra fallback for matches and local chat broadcast: %v", err)
	}
	defer matchQ.Close()

	var s3Client *storage.S3Client
	if cfg.AWSBucket != "" {
		var err error
		if cfg.AWSEndpoint != "" {
			s3Client, err = storage.NewS3ClientWithEndpoint(cfg.AWSRegion, cfg.AWSBucket, cfg.AWSAccessKeyID, cfg.AWSSecretKey, cfg.AWSEndpoint, cfg.AWSPublicEndpoint)
		} else {
			s3Client, err = storage.NewS3Client(cfg.AWSRegion, cfg.AWSBucket, cfg.AWSAccessKeyID, cfg.AWSSecretKey)
		}
		if err != nil {
			log.Printf("[S3] client creation failed: %v", err)
			s3Client = nil
		} else {
			log.Printf("[S3] client created successfully")
		}
		if s3Client != nil && cfg.AWSEndpoint != "" && strings.Contains(cfg.AWSEndpoint, "minio") {
			log.Printf("[S3] initializing MinIO bucket: %s", cfg.AWSBucket)
			if err := s3Client.EnsureBucketPolicyPublic(context.Background()); err != nil {
				log.Printf("[S3] failed to configure MinIO bucket policy: %v", err)
			} else {
				log.Printf("[S3] MinIO bucket initialized and made public")
			}
		}
	} else {
		log.Printf("[S3] AWS_BUCKET not configured")
	}

	msgHub := hub.New(cfg.RedisAddr)
	defer msgHub.Close()
	go msgHub.Run()

	h := handlers.NewHandler(cassandraDB, cfg.JWTSecret, matchQ, s3Client, msgHub)

	router := gin.Default()
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.ErrorHandlerMiddleware())

	router.GET("/health", handlers.HealthCheck)

	api := router.Group("/api")

	auth := api.Group("/auth")
	{
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
	}

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		protected.GET("/me", h.GetMe)
		protected.GET("/profile", h.GetProfile)
		protected.PUT("/profile", h.UpdateProfile)
		protected.GET("/swipes", h.GetSwipes)
		protected.POST("/swipe", h.CreateSwipe)
		protected.PUT("/device-token", h.SaveDeviceToken)
		protected.GET("/upload-url", h.GetUploadURL)
		protected.GET("/candidates", h.GetCandidates)
		protected.GET("/discover", h.GetDiscover)
		protected.GET("/matches", h.GetMatches)
		protected.DELETE("/matches/:matchId", h.DeleteMatch)
		protected.GET("/matches/:matchId/profile", h.GetMatchProfile)
		protected.GET("/matches/:matchId/messages", h.GetMessages)
		protected.POST("/matches/:matchId/messages", h.SendMessage)
		protected.GET("/matches/:matchId/ws", h.ChatWS)
		protected.POST("/jobs", h.CreateJob)
		protected.GET("/jobs", h.GetJobs)
		protected.GET("/jobs/:jobId", h.GetJob)
		protected.PUT("/jobs/:jobId", h.UpdateJob)
		protected.DELETE("/jobs/:jobId", h.DeleteJob)
	}

	port := cfg.Port
	log.Printf("Starting JobSwiper API on port %s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
