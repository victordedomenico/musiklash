-- Ensure profile creation works for anonymous users (email can be null/empty).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := nullif(split_part(new.email, '@', 1), '');
  if base_username is null then
    base_username := 'guest';
  end if;

  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do update set username = excluded.username;

  return new;
end;
$$;
