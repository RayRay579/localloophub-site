-- Admin override: allow specific admin user full access to profiles.

create policy "Profiles are viewable by admin"
  on public.profiles
  for select
  using (auth.uid() = 'c0d61f7c-7609-4e6d-92e6-7eb9174527a2');

create policy "Profiles are insertable by admin"
  on public.profiles
  for insert
  with check (auth.uid() = 'c0d61f7c-7609-4e6d-92e6-7eb9174527a2');

create policy "Profiles are updatable by admin"
  on public.profiles
  for update
  using (auth.uid() = 'c0d61f7c-7609-4e6d-92e6-7eb9174527a2');

create policy "Profiles are deletable by admin"
  on public.profiles
  for delete
  using (auth.uid() = 'c0d61f7c-7609-4e6d-92e6-7eb9174527a2');
