# Deployment Guide

## Frontend Deployment (iOS App Store)

### Prerequisites
- Apple Developer Account
- Xcode 15+
- Fastlane (optional, for automation)

### Build for Production

1. **Build iOS binary**
```bash
cd frontend
eas build --platform ios --auto-submit
```

Or manually:
```bash
npm run build:ios
```

2. **Upload to App Store**
```bash
eas submit --platform ios
```

### TestFlight Distribution
For beta testing:
```bash
eas build --platform ios
eas submit --platform ios --auto-submit
```

## Backend Deployment

### Docker Image Build
```bash
cd backend
docker build -t jobswiper-api:latest .
docker tag jobswiper-api:latest your-registry/jobswiper-api:latest
docker push your-registry/jobswiper-api:latest
```

### AWS ECS Deployment

1. **Create ECR repository**
```bash
aws ecr create-repository --repository-name jobswiper-api
```

2. **Push image**
```bash
docker tag jobswiper-api:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/jobswiper-api:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/jobswiper-api:latest
```

3. **Create ECS Task Definition**
```json
{
  "family": "jobswiper-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "api",
    "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/jobswiper-api:latest",
    "portMappings": [{
      "containerPort": 8080,
      "hostPort": 8080,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "CASSANDRA_HOST", "value": "cassandra-cluster.example.com"},
      {"name": "ENVIRONMENT", "value": "production"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/jobswiper-api",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

### AWS Cassandra (Managed Option)

Use Amazon Keyspaces for managed Cassandra:

```bash
# Create Keyspace
aws keyspaces create-keyspace --keyspace-name jobswiper

# Update backend config
CASSANDRA_HOST=cassandra.us-east-1.amazonaws.com
CASSANDRA_PORT=9042
```

## Database Deployment (Production Cassandra)

### Multi-Node Cluster (AWS EC2)

1. **Provision EC2 instances** (3+ nodes recommended)
   - Instance type: c5.xlarge or similar
   - Storage: 100GB+ EBS gp3
   - Network: VPC with security groups

2. **Install Cassandra** on each node
```bash
sudo apt-get update
sudo apt-get install -y cassandra

# Edit /etc/cassandra/cassandra.yaml
# Set cluster_name, seeds, listen_address, rpc_address
```

3. **Initialize cluster**
```bash
sudo service cassandra start
nodetool status  # Check cluster
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Backend
        run: |
          cd backend
          docker build -t jobswiper-api:${{ github.sha }} .
          docker tag jobswiper-api:${{ github.sha }} ${{ secrets.ECR_REGISTRY }}/jobswiper-api:latest
          docker push ${{ secrets.ECR_REGISTRY }}/jobswiper-api:${{ github.sha }}
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster production --service jobswiper-api --force-new-deployment
```

## Monitoring & Logging

### CloudWatch (AWS)
- Backend logs: `/aws/ecs/jobswiper-api`
- Database metrics: CloudWatch Cassandra metrics
- Alarms: CPU, memory, error rates

### Application Performance Monitoring
```bash
# Install APM agent (DataDog, New Relic, etc.)
# Example with DataDog:
dd-trace-go.v1 v1.x.x
```

## Scaling

### Horizontal Scaling
- Backend: Increase ECS task count
- Database: Add Cassandra nodes

### Vertical Scaling
- Increase instance types for better performance

## Rollback Procedure

### Backend
```bash
# AWS ECS
aws ecs update-service --cluster production \
  --service jobswiper-api \
  --task-definition jobswiper-api:PREVIOUS_VERSION
```

### Database
- Restore from snapshot
- Use Cassandra nodetool repair/restore

## Cost Optimization

- Use Spot Instances for non-critical backend
- Implement auto-scaling policies
- Use RDS Proxy for connection pooling
- Consider Serverless for variable workloads

## Security Checklist

- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Implement Web Application Firewall (WAF)
- [ ] Regular security audits
- [ ] Encrypt data at rest and in transit
- [ ] Implement rate limiting
- [ ] Use AWS Secrets Manager for credentials
- [ ] Enable VPC security groups
- [ ] Enable CloudTrail for audit logs
