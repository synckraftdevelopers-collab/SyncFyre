create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  update public.users
  set
    email = new.email,
    phone = coalesce(new.phone, users.phone),
    updated_at = now()
  where id = new.id;

  return new;
end
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, phone on auth.users
for each row
execute function public.handle_auth_user_updated();
