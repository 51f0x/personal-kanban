-- Initialize schemas for consolidated database
-- This script creates the api and worker schemas

CREATE SCHEMA IF NOT EXISTS api;
CREATE SCHEMA IF NOT EXISTS worker;

-- Grant necessary permissions
GRANT ALL ON SCHEMA api TO kanban;
GRANT ALL ON SCHEMA worker TO kanban;

-- Set default search path (optional, can be overridden per connection)
ALTER DATABASE kanban SET search_path TO api, worker, public;

