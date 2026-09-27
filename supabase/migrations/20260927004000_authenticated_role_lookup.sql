-- Role lookup is for a signed-in user's own account. RLS helpers execute as
-- their owner and continue to support published catalog reads by visitors.
revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;
