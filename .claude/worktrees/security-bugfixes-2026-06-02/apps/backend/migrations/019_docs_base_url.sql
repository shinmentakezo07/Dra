INSERT INTO system_settings (key, value, type, description, group_name, is_encrypted, updated_at)
VALUES (
  'docs_base_url',
  '""',
  'string',
  'Base URL displayed in documentation code examples. Self-hosted deployments should set this to their public API endpoint (e.g. https://api.yourdomain.com). Falls back to NEXT_PUBLIC_BACKEND_URL if empty.',
  'Docs',
  false,
  NOW()
)
ON CONFLICT (key) DO NOTHING;
