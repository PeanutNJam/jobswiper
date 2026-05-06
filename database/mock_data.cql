-- Mock data for JobSwiper
-- Run with: docker exec -i jobswiper-cassandra cqlsh < database/mock_data.cql

CREATE KEYSPACE IF NOT EXISTS jobswiper
WITH REPLICATION = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

USE jobswiper;

-- Mock data for JobSwiper
-- Insert some employer users and their profiles for job seekers to swipe on

-- Define UUIDs for consistency
-- TechCorp
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (11111111-1111-1111-1111-111111111111, 'techcorp@example.com', 'techcorp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (11111111-1111-1111-1111-111111111111, 'TechCorp', 'Leading tech company building the future of software. We''re hiring top talent to join our mission-driven team.', 'https://example.com/techcorp-logo.png', 'San Francisco, CA', toTimestamp(now()));

-- StartupXYZ
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (22222222-2222-2222-2222-222222222222, 'startupxyz@example.com', 'startupxyz', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (22222222-2222-2222-2222-222222222222, 'StartupXYZ', 'Fast-growing B2B SaaS startup disrupting the industry. Join us to build products that millions use daily.', 'https://example.com/startupxyz-logo.png', 'Remote', toTimestamp(now()));

-- FinTech Inc
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (33333333-3333-3333-3333-333333333333, 'fintech@example.com', 'fintech', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (33333333-3333-3333-3333-333333333333, 'FinTech Inc', 'Revolutionizing financial services with cutting-edge technology. We''re looking for engineers who want to make a real impact.', 'https://example.com/fintech-logo.png', 'New York, NY', toTimestamp(now()));

-- AI Labs
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (44444444-4444-4444-4444-444444444444, 'ailabs@example.com', 'ailabs', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (44444444-4444-4444-4444-444444444444, 'AI Labs', 'Pioneering artificial intelligence research and deployment. Join our team of ML experts building the next generation of AI.', 'https://example.com/ailabs-logo.png', 'Seattle, WA', toTimestamp(now()));

-- MobileFirst
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (55555555-5555-5555-5555-555555555555, 'mobilefirst@example.com', 'mobilefirst', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (55555555-5555-5555-5555-555555555555, 'MobileFirst', 'Building native mobile experiences for millions of users. We''re passionate about great UX and performance.', 'https://example.com/mobilefirst-logo.png', 'Austin, TX', toTimestamp(now()));

-- CloudBase
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (66666666-6666-6666-6666-666666666666, 'cloudbase@example.com', 'cloudbase', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (66666666-6666-6666-6666-666666666666, 'CloudBase', 'Empowering developers with world-class cloud infrastructure. Help us build the platform that makes shipping software effortless.', 'https://example.com/cloudbase-logo.png', 'Chicago, IL', toTimestamp(now()));

-- DataHarbor
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (88888888-8888-8888-8888-888888888888, 'dataharbor@example.com', 'dataharbor', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (88888888-8888-8888-8888-888888888888, 'DataHarbor', 'Building the real-time data layer for modern product teams. We value reliability, clarity, and pragmatic engineering.', 'https://example.com/dataharbor-logo.png', 'Boston, MA', toTimestamp(now()));

-- Designly
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (99999999-9999-9999-9999-999999999999, 'designly@example.com', 'designly', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (99999999-9999-9999-9999-999999999999, 'Designly', 'A design-led product studio making hiring software feel calm, human, and fast. Join a small team with high craft standards.', 'https://example.com/designly-logo.png', 'Los Angeles, CA', toTimestamp(now()));

-- SecureWorks Studio
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa, 'secureworks@example.com', 'secureworks', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employer', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa, 'SecureWorks Studio', 'Security tooling for teams that ship quickly. We help product engineers find and fix risk without losing momentum.', 'https://example.com/secureworks-logo.png', 'Denver, CO', toTimestamp(now()));

-- Add jobs posted by these employers
INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 11111111-1111-1111-1111-111111111111, 'Senior Frontend Engineer', 'Build beautiful, responsive interfaces using React Native and TypeScript. Own key product surfaces and collaborate with design, backend, and data teams to ship features used by millions.', 'San Francisco, CA', ['React', 'TypeScript', 'Node.js'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 22222222-2222-2222-2222-222222222222, 'Product Manager', 'Drive product strategy and roadmap for a fast-growing B2B SaaS platform. Work cross-functionally to define requirements and ship features that delight customers and move key metrics.', 'Remote', ['Strategy', 'Agile', 'Analytics'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 33333333-3333-3333-3333-333333333333, 'Backend Engineer (Go)', 'Design and build high-throughput microservices in Go serving millions of requests per day. You will own critical infrastructure pieces and mentor junior engineers.', 'New York, NY', ['Go', 'PostgreSQL', 'Kubernetes'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 44444444-4444-4444-4444-444444444444, 'ML Engineer', 'Train, deploy, and monitor production ML models at scale. Build the infrastructure that bridges research and production, and work closely with data scientists to ship impactful models.', 'Seattle, WA', ['Python', 'PyTorch', 'MLOps'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 55555555-5555-5555-5555-555555555555, 'iOS Engineer', 'Build native iOS experiences for 10M+ users. You will own onboarding, core product flows, and performance — and have a direct line to users through App Store reviews.', 'Austin, TX', ['Swift', 'SwiftUI', 'CoreData'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 66666666-6666-6666-6666-666666666666, 'DevOps / Platform Engineer', 'Own the developer experience: CI/CD pipelines, cloud infrastructure, observability, and on-call tooling. Help engineering teams ship faster and safer.', 'Chicago, IL', ['AWS', 'Terraform', 'Docker'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 88888888-8888-8888-8888-888888888888, 'Data Engineer', 'Build reliable data pipelines powering analytics, recommendations, and product experimentation. Partner with ML and product teams to make trusted data available in real time.', 'Boston, MA', ['Spark', 'Python', 'Airflow'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), 99999999-9999-9999-9999-999999999999, 'UX Designer', 'Design elegant mobile workflows for hiring teams and candidates. Lead research, prototype quickly, and partner closely with engineering to ship polished product experiences.', 'Los Angeles, CA', ['Figma', 'Research', 'Prototyping'], toTimestamp(now()));

INSERT INTO jobswiper.jobs (id, employer_id, title, description, location, skills, created_at)
VALUES (uuid(), aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa, 'Security Engineer', 'Own application security, threat modeling, and secure development practices across a fast-moving engineering org. Help teams ship confidently without slowing them down.', 'Denver, CO', ['AppSec', 'Go', 'Cloud'], toTimestamp(now()));

-- Add some sample swipes (job seekers swiping on employers)
-- First, let's add a sample job seeker user
INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (77777777-7777-7777-7777-777777777777, 'jobseeker@example.com', 'jobseeker', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'job_seeker', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (77777777-7777-7777-7777-777777777777, 'Alex Johnson', '5 years building mobile and web apps. Passionate about great UX and clean architecture. Looking for a senior role at a mission-driven company.', null, 'San Francisco, CA', toTimestamp(now()));

INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb, 'nina@example.com', 'ninapatel', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'job_seeker', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb, 'Nina Patel', 'Data engineer who builds clean batch and streaming pipelines. Recently led a warehouse migration and built self-serve datasets used across teams.', null, 'Boston, MA', toTimestamp(now()));

INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (cccccccc-cccc-cccc-cccc-cccccccccccc, 'eli@example.com', 'elithompson', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'job_seeker', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (cccccccc-cccc-cccc-cccc-cccccccccccc, 'Eli Thompson', 'Product designer focused on thoughtful mobile workflows, design systems, and research-backed decisions. Loves pairing with engineers.', null, 'Los Angeles, CA', toTimestamp(now()));

INSERT INTO jobswiper.users (id, email, username, password_hash, user_type, created_at, updated_at)
VALUES (dddddddd-dddd-dddd-dddd-dddddddddddd, 'rafael@example.com', 'rafaelcosta', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'job_seeker', toTimestamp(now()), toTimestamp(now()));

INSERT INTO jobswiper.profiles (user_id, name, description, photo_url, location, updated_at)
VALUES (dddddddd-dddd-dddd-dddd-dddddddddddd, 'Rafael Costa', 'Security engineer with a developer-first approach. Experience with AppSec reviews, cloud hardening, incident response, and internal tooling.', null, 'Denver, CO', toTimestamp(now()));

-- Sample swipes by the job seeker on employers
INSERT INTO jobswiper.swipes (user_id, target_id, id, direction, created_at)
VALUES (77777777-7777-7777-7777-777777777777, 11111111-1111-1111-1111-111111111111, uuid(), 'right', toTimestamp(now()));

INSERT INTO jobswiper.swipes (user_id, target_id, id, direction, created_at)
VALUES (77777777-7777-7777-7777-777777777777, 22222222-2222-2222-2222-222222222222, uuid(), 'right', toTimestamp(now()));

INSERT INTO jobswiper.swipes (user_id, target_id, id, direction, created_at)
VALUES (77777777-7777-7777-7777-777777777777, 33333333-3333-3333-3333-333333333333, uuid(), 'left', toTimestamp(now()));
