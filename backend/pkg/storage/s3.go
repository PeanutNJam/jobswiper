package storage

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Client struct {
	client         *s3.Client
	presign        *s3.PresignClient
	publicPresign  *s3.PresignClient
	bucket         string
	region         string
	endpoint       string
	publicEndpoint string
}

func NewS3Client(region, bucket, accessKey, secretKey string) (*S3Client, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	s3Client := s3.NewFromConfig(cfg)
	presignClient := s3.NewPresignClient(s3Client)

	return &S3Client{
		client:  s3Client,
		presign: presignClient,
		bucket:  bucket,
		region:  region,
	}, nil
}

func NewS3ClientWithEndpoint(region, bucket, accessKey, secretKey, endpoint, publicEndpoint string) (*S3Client, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true // MinIO requires path-style addressing
	})
	presignClient := s3.NewPresignClient(s3Client)

	// Create a separate presign client for public endpoint if different
	var publicPresignClient *s3.PresignClient
	if publicEndpoint != "" && publicEndpoint != endpoint {
		publicCfg, err := config.LoadDefaultConfig(context.Background(),
			config.WithRegion(region),
			config.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
			),
		)
		if err == nil {
			publicS3Client := s3.NewFromConfig(publicCfg, func(o *s3.Options) {
				o.BaseEndpoint = aws.String(publicEndpoint)
				o.UsePathStyle = true
			})
			publicPresignClient = s3.NewPresignClient(publicS3Client)
		}
	}

	return &S3Client{
		client:         s3Client,
		presign:        presignClient,
		publicPresign:  publicPresignClient,
		bucket:         bucket,
		region:         region,
		endpoint:       endpoint,
		publicEndpoint: publicEndpoint,
	}, nil
}

// PresignPut returns a presigned PUT URL valid for 15 minutes.
// key is the S3 object key (e.g. "profiles/user-id.jpg").
// contentType is the MIME type (e.g. "image/jpeg").
func (c *S3Client) PresignPut(ctx context.Context, key, contentType string) (string, error) {
	// Use public presign client if available
	presignClient := c.presign
	if c.publicPresign != nil {
		presignClient = c.publicPresign
	}
	
	req, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", fmt.Errorf("presign put: %w", err)
	}
	return req.URL, nil
}

// PublicURL returns the HTTPS URL of an object (bucket must be public or use CloudFront).
func (c *S3Client) PublicURL(key string) string {
	if c.publicEndpoint != "" {
		return fmt.Sprintf("%s/%s/%s", strings.TrimRight(c.publicEndpoint, "/"), c.bucket, key)
	}
	if c.endpoint != "" {
		return fmt.Sprintf("%s/%s/%s", strings.TrimRight(c.endpoint, "/"), c.bucket, key)
	}

	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", c.bucket, c.region, key)
}

func (c *S3Client) EnsureBucket(ctx context.Context) error {
	if c.client == nil {
		return fmt.Errorf("s3 client not initialized")
	}

	// Try to create bucket (will fail silently if it exists)
	_, err := c.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(c.bucket)})
	if err != nil {
		// Bucket doesn't exist, create it
		_, createErr := c.client.CreateBucket(ctx, &s3.CreateBucketInput{
			Bucket: aws.String(c.bucket),
		})
		if createErr != nil {
			return fmt.Errorf("create bucket: %w", createErr)
		}
	}
	return nil
}

func (c *S3Client) EnsureBucketPolicyPublic(ctx context.Context) error {
	if c.client == nil {
		return fmt.Errorf("s3 client not initialized")
	}

	// First ensure bucket exists
	if err := c.EnsureBucket(ctx); err != nil {
		return err
	}

	policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, c.bucket)
	_, err := c.client.PutBucketPolicy(ctx, &s3.PutBucketPolicyInput{
		Bucket: aws.String(c.bucket),
		Policy: aws.String(policy),
	})
	if err != nil {
		// Log but don't fail - bucket might have policy limitations
		fmt.Printf("warning: failed to set bucket policy: %v\n", err)
		return nil
	}
	return nil
}
