alter table public.loopplus_posts
  add column if not exists radius_miles numeric,
  add column if not exists time_window_key text;
