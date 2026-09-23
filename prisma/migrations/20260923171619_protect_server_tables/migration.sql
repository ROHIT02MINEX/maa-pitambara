-- Auth.js authorizes access on the server. These tables must never be exposed
-- through Supabase's anonymous/authenticated Data API roles.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    '_prisma_migrations', 'users', 'accounts', 'sessions', 'verification_tokens',
    'email_verification_tokens', 'password_reset_tokens', 'pdfs', 'bookmarks',
    'pdf_views', 'questions', 'tests', 'test_answers', 'retest_requests', 'activity_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
  END LOOP;
END $$;
