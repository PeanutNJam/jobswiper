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

CREATE INDEX IF NOT EXISTS idx_users_email ON jobswiper.users (email);

CREATE TABLE IF NOT EXISTS jobswiper.profiles (
    user_id     UUID PRIMARY KEY,
    name        TEXT,
    description TEXT,
    photo_url   TEXT,
    location    TEXT,
    updated_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobswiper.jobs (
    id          UUID PRIMARY KEY,
    employer_id UUID,
    title       TEXT,
    description TEXT,
    salary      TEXT,
    location    TEXT,
    created_at  TIMESTAMP
);

-- Partition by user_id, cluster by target_id for O(1) mutual-match lookups.
CREATE TABLE IF NOT EXISTS jobswiper.swipes (
    user_id    UUID,
    target_id  UUID,
    id         UUID,
    direction  TEXT,  -- 'right' or 'left'
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, target_id)
);

CREATE TABLE IF NOT EXISTS jobswiper.matches (
    id        UUID PRIMARY KEY,
    user_id_1 UUID,
    user_id_2 UUID,
    created_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON jobswiper.matches (user_id_1);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON jobswiper.matches (user_id_2);

-- Messages (for in-app chat)
CREATE TABLE IF NOT EXISTS jobswiper.messages (
    match_id   UUID,
    created_at TIMESTAMP,
    sender_id  UUID,
    content    TEXT,
    PRIMARY KEY (match_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS jobswiper.notifications (
    user_id    UUID,
    created_at TIMESTAMP,
    type       TEXT,
    content    TEXT,
    read       BOOLEAN,
    PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
