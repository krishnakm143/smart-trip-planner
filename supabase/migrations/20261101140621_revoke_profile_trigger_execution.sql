-- Supabase creates direct execute grants for newly-created functions. The
-- profile trigger is SECURITY DEFINER but must only run from auth.users.
revoke all on function public.handle_new_user() from public, anon, authenticated;
