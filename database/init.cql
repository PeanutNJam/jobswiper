-- JobSwiper Cassandra Database Schema
-- Run with: cqlsh < database/init.cql

-- Keyspace is created automatically by the backend on startup.
-- USE jobswiper;

CREATE TABLE IF NOT EXISTS jobswiper.users (
    id           UUID PRIMARY KEY,
    email        TEXT,
    username     TEXT,
    password_hash TEXT,
    user_type    TEXT,  -- 'job_seeker' or 'employer'
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobswiper.users_by_email (
    email         TEXT PRIMARY KEY,
    id            UUID,
    username      TEXT,
    password_hash TEXT,
    user_type     TEXT,
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobswiper.users_by_type (
    user_type  TEXT,
    created_at TIMESTAMP,
    id         UUID,
    email      TEXT,
    username   TEXT,
    updated_at TIMESTAMP,
    PRIMARY KEY ((user_type), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

CREATE TABLE IF NOT EXISTS jobswiper.profiles (
    user_id     UUID PRIMARY KEY,
    name        TEXT,
    description TEXT,
    photo_url   TEXT,
    location    TEXT,
    device_token TEXT,
    skills      LIST<TEXT>,
    updated_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobswiper.jobs (
    id          UUID PRIMARY KEY,
    employer_id UUID,
    title       TEXT,
    description TEXT,
    location    TEXT,
    skills      LIST<TEXT>,
    created_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobswiper.jobs_by_employer (
    employer_id UUID,
    created_at  TIMESTAMP,
    id          UUID,
    title       TEXT,
    description TEXT,
    location    TEXT,
    skills      LIST<TEXT>,
    PRIMARY KEY ((employer_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

-- Partition by user_id, cluster by target_id for O(1) mutual-match lookups.
CREATE TABLE IF NOT EXISTS jobswiper.swipes (
    user_id    UUID,
    target_id  UUID,
    id         UUID,
    direction  TEXT,  -- 'right' or 'left'
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, target_id)
);

CREATE TABLE IF NOT EXISTS jobswiper.swipes_by_target (
    target_id  UUID,
    user_id    UUID,
    id         UUID,
    direction  TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY ((target_id), user_id)
);

CREATE TABLE IF NOT EXISTS jobswiper.matches (
    id        UUID PRIMARY KEY,
    user_id_1 UUID,
    user_id_2 UUID,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobswiper.matches_by_user (
    user_id    UUID,
    created_at TIMESTAMP,
    id         UUID,
    user_id_1  UUID,
    user_id_2  UUID,
    PRIMARY KEY ((user_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

-- Messages (for in-app chat)
CREATE TABLE IF NOT EXISTS jobswiper.messages (
    match_id   TEXT,
    created_at TIMESTAMP,
    id         TEXT,
    sender_id  TEXT,
    content    TEXT,
    PRIMARY KEY ((match_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS jobswiper.latest_messages_by_match (
    match_id   TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    id         TEXT,
    sender_id  TEXT,
    content    TEXT
);

-- Notifications
CREATE TABLE IF NOT EXISTS jobswiper.notifications (
    user_id    UUID,
    created_at TIMESTAMP,
    type       TEXT,
    content    TEXT,
    read       BOOLEAN,
    PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
