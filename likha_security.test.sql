begin;
select plan(11);

select ok(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in (
     'likha_site_config','likha_home_content','likha_profiles','likha_membership_applications',
     'likha_admin_requests','likha_artists','likha_ateliers','likha_artworks',
     'likha_announcements','likha_chat_messages','likha_chat_reports','likha_audit_log'
   )),
  'RLS is enabled for every LIKHA table'
);
select ok(not has_table_privilege('anon', 'public.likha_profiles', 'select'), 'anon cannot read member profiles');
select ok(not has_table_privilege('anon', 'public.likha_membership_applications', 'select'), 'anon cannot read membership applications');
select ok(not has_table_privilege('anon', 'public.likha_admin_requests', 'select'), 'anon cannot read administrator requests');
select ok(not has_table_privilege('anon', 'public.likha_chat_messages', 'select'), 'anon cannot read the open chat');
select ok(not has_column_privilege('authenticated', 'public.likha_profiles', 'role', 'update'), 'members cannot directly change their role');
select ok(not has_column_privilege('authenticated', 'public.likha_profiles', 'account_status', 'update'), 'members cannot directly change account restrictions');
select ok(not has_table_privilege('authenticated', 'public.likha_admin_requests', 'update'), 'admin requests can only be reviewed through the guarded RPC');
select ok(not has_function_privilege('anon', 'public.likha_review_admin_request(uuid,boolean,jsonb)', 'execute'), 'anon cannot approve administrator requests');
select ok(has_function_privilege('authenticated', 'public.likha_review_admin_request(uuid,boolean,jsonb)', 'execute'), 'authenticated requests can reach the RPC, which checks Main Admin role');
select ok(
  (select qual like '%likha_chat_messages%' from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname = 'likha_chat_media_member_read'),
  'chat media reads require a visible message or moderator access'
);

select * from finish();
rollback;
