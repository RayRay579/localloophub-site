create unique index if not exists profiles_display_name_unique
  on public.profiles (lower(display_name))
  where display_name is not null;

create or replace function public.is_display_name_available(name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if name is null or length(trim(name)) = 0 then
    return false;
  end if;
  return not exists (
    select 1
    from public.profiles
    where lower(display_name) = lower(trim(name))
  );
end;
$$;

grant execute on function public.is_display_name_available(text) to anon, authenticated;
