-- +goose Up
-- +goose StatementBegin

-- Set the database-level default search_path so all connections resolve:
--   public     → PostGIS functions (st_asgeojson etc.) + GoTrue tables
--   dbo        → ECG network tables/views
--   meta       → layer config tables
--   auth       → GoTrue auth tables
--   extensions → Supabase extension schema
ALTER DATABASE rtaa SET search_path TO "$user", public, dbo, meta, auth, extensions;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER DATABASE rtaa RESET search_path;
-- +goose StatementEnd
