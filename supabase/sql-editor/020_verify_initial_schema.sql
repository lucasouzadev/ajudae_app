SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'providers',
    'categories',
    'provider_categories',
    'requests',
    'request_events',
    'tickets',
    'ratings',
    'quick_messages'
  )
ORDER BY table_name;

SELECT typname
FROM pg_type
WHERE typname IN (
  'user_role',
  'request_status',
  'cancel_reason',
  'ticket_status',
  'vehicle_type'
)
ORDER BY typname;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('providers', 'requests', 'request_events', 'tickets', 'ratings', 'quick_messages')
ORDER BY tablename, indexname;

SELECT name, active
FROM categories
ORDER BY name;