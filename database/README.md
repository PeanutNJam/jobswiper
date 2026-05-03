# Database - JobSwiper

Apache Cassandra database setup and schema.

## Stack
- **Database**: Apache Cassandra 4.0+
- **Deployment**: Docker (with cloud-ready options)

## Project Structure

```
database/
├── init.cql                    # Schema initialization
├── migrations/                 # Data migrations (if needed)
├── docker-compose.yml          # Cassandra Docker setup
└── README.md
```

## Getting Started

### Run with Docker Compose

From the project root:
```bash
docker-compose up -d cassandra
```

This will:
- Start a Cassandra container on port 9042
- Mount a persistent volume for data
- Expose the native transport port

### Connect to Cassandra

```bash
docker-compose exec cassandra cqlsh
```

Or from your local machine (if cqlsh is installed):
```bash
cqlsh localhost 9042
```

### Initialize Schema

The schema is automatically initialized by the backend application on startup.

To manually initialize (if needed):
```bash
docker-compose exec cassandra cqlsh -f /init.cql
```

## Schema Overview

### Core Tables

1. **users** - User accounts (job seekers & employers)
2. **profiles** - User profile information
3. **jobs** - Job listings by employers
4. **swipes** - User swipe history
5. **matches** - Mutual match connections
6. **messages** - In-app messaging (time-series)
7. **notifications** - User notifications (time-series)

### Key Design Decisions

- **Partition Keys**: Primary keys designed for efficient queries
- **Clustering**: Time-based clustering for temporal data
- **Indexes**: Secondary indexes for common queries
- **TTL**: Messages and notifications can have TTL for auto-cleanup

## Replication Strategy

Currently using `SimpleStrategy` with replication_factor=1 (suitable for single-node development).

For production:
- Use `NetworkTopologyStrategy`
- Set replication_factor to 3 or more
- Consider using multiple datacenters

## Performance Tuning

### Connection Pool
- Adjust in backend `CassandraDB` configuration
- Default: Quorum consistency

### Batch Inserts
- For bulk operations, use batch statements
- Keep batch size < 100KB

### Compaction
- Monitor SSTable compaction
- Default: Size-tiered

## Monitoring

### Check cluster status
```bash
docker-compose exec cassandra nodetool status
```

### View logs
```bash
docker-compose logs -f cassandra
```

## Cleanup

Stop and remove:
```bash
docker-compose down
```

Remove volumes (WARNING: deletes data):
```bash
docker-compose down -v
```

## Backup & Restore

### Backup
```bash
docker-compose exec cassandra nodetool snapshot jobswiper
```

### Restore
See Cassandra documentation for restore procedures.

## Cloud Deployment

### AWS (Cassandra or managed service)
See `docs/DEPLOYMENT.md` for detailed instructions

### Google Cloud Bigtable
Bigtable is compatible with Cassandra API and can be used as a drop-in replacement
