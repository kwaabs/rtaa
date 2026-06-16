-- +goose Up
-- +goose StatementBegin

-- Promote the first registered user to admin.
-- To target a different email set GOOSE_ADMIN_EMAIL before running, e.g.:
--   GOOSE_ADMIN_EMAIL=you@corp.com make migrate-up
-- Defaults to admin@example.com for dev/test environments.
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
WHERE email = current_setting('app.admin_email', true)
         OR (current_setting('app.admin_email', true) IS NULL AND email = 'admin@example.com');

-- Seed placeholder auth provider config rows (disabled by default).
-- Admin can fill in real credentials via the Admin UI.
INSERT INTO meta.app_configs (key, value, value_type, category, label) VALUES
  ('auth_provider.google.enabled',     'false',  'bool',   'auth_provider', 'Google: enabled'),
  ('auth_provider.google.client_id',   '',       'text',   'auth_provider', 'Google: Client ID'),
  ('auth_provider.google.secret',      '',       'text',   'auth_provider', 'Google: Client Secret'),
  ('auth_provider.google.redirect_uri','',       'text',   'auth_provider', 'Google: Redirect URI'),

  ('auth_provider.azure.enabled',      'false',  'bool',   'auth_provider', 'Azure AD: enabled'),
  ('auth_provider.azure.client_id',    '',       'text',   'auth_provider', 'Azure AD: Client ID'),
  ('auth_provider.azure.secret',       '',       'text',   'auth_provider', 'Azure AD: Client Secret'),
  ('auth_provider.azure.tenant',       'common', 'text',   'auth_provider', 'Azure AD: Tenant'),
  ('auth_provider.azure.redirect_uri', '',       'text',   'auth_provider', 'Azure AD: Redirect URI'),

  ('auth_provider.github.enabled',     'false',  'bool',   'auth_provider', 'GitHub: enabled'),
  ('auth_provider.github.client_id',   '',       'text',   'auth_provider', 'GitHub: Client ID'),
  ('auth_provider.github.secret',      '',       'text',   'auth_provider', 'GitHub: Client Secret'),
  ('auth_provider.github.redirect_uri','',       'text',   'auth_provider', 'GitHub: Redirect URI')
ON CONFLICT (key) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM meta.app_configs WHERE category = 'auth_provider';
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role'
WHERE email = 'admin@example.com';
-- +goose StatementEnd
