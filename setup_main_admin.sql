-- Run after the Main Admin has registered and verified their own email.
-- Replace the placeholder before running this in the Supabase SQL Editor.
do $$
declare
  promoted_id uuid;
begin
  update public.likha_profiles p
  set role = 'main_admin',
      permissions = '{"content":true,"moderate_chat":true,"restrict_users":true}'::jsonb
  where lower(p.email) = lower('REPLACE_WITH_YOUR_VERIFIED_EMAIL')
    and p.account_status = 'active'
    and exists (
      select 1
      from auth.users u
      where u.id = p.id and u.email_confirmed_at is not null
    )
  returning p.id into promoted_id;

  if promoted_id is null then
    raise exception 'No active, email-verified LIKHA profile matched. Register and verify the account first.';
  end if;
end;
$$;

select full_name, email, role, account_status
from public.likha_profiles
where lower(email) = lower('REPLACE_WITH_YOUR_VERIFIED_EMAIL');
