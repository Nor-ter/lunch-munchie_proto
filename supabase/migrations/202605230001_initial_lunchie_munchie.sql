create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  profile_image_url text,
  bio text,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,
  name text not null,
  category text not null default '기타',
  address text not null,
  location geography(point, 4326) not null,
  rating double precision not null default 0,
  review_count integer not null default 0,
  price_level integer not null default 1,
  short_description text,
  tags text[] not null default '{}',
  dietary_options text[] not null default '{}',
  photos text[] not null default '{}',
  menu_items jsonb not null default '[]'::jsonb,
  phone_number text,
  business_hours text,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  hero_image text not null default '',
  category text not null,
  region text not null default '',
  tags text[] not null default '{}',
  hashtags text[] not null default '{}',
  total_distance double precision not null default 0,
  total_duration integer not null default 0,
  likes_count integer not null default 0,
  saves_count integer not null default 0,
  comments_count integer not null default 0,
  route_polyline text,
  share_image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.course_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_index integer not null,
  start_time text,
  end_time text,
  is_bookmarked boolean not null default false,
  memo text,
  created_at timestamptz not null default now(),
  unique(course_id, order_index)
);

create table if not exists public.lunchie_sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  share_token text not null unique,
  invite_code text not null unique,
  status text not null check (status in ('WAITING','SWIPING_1','SWIPING_2','COMPLETED')),
  deadline_at timestamptz not null,
  group_size integer not null default 1,
  filter_distance integer not null default 1000,
  filter_budget integer not null default 2,
  filter_min_rating double precision not null default 4.0,
  filter_dietary text[] not null default '{}',
  filter_vibe text[] not null default '{}',
  swipe_limit integer not null default 10,
  restaurant_ids uuid[] not null default '{}',
  top_restaurant_ids uuid[] not null default '{}',
  final_restaurant_id uuid references public.restaurants(id),
  created_at timestamptz not null default now()
);

create table if not exists public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lunchie_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  emoji text not null default '🍽',
  is_ready boolean not null default false,
  created_at timestamptz not null default now(),
  unique(session_id, user_id)
);

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lunchie_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  round integer not null check (round in (1,2)),
  swipe_action text not null check (swipe_action in ('LIKE','DISLIKE')),
  created_at timestamptz not null default now(),
  unique(session_id, user_id, restaurant_id, round)
);

create index if not exists restaurants_location_idx on public.restaurants using gist(location);
create index if not exists courses_public_created_idx on public.courses(is_public, created_at desc);
create index if not exists courses_tags_idx on public.courses using gin(tags);
create index if not exists swipes_session_idx on public.swipes(session_id, round);

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.courses enable row level security;
alter table public.course_items enable row level security;
alter table public.lunchie_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.swipes enable row level security;

create policy "public courses are readable" on public.courses for select using (is_public = true or auth.uid() = author_id);
create policy "course author can write" on public.courses for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "restaurants are readable" on public.restaurants for select using (true);
create policy "course items readable through public courses" on public.course_items for select using (exists (select 1 from public.courses c where c.id = course_id and (c.is_public or c.author_id = auth.uid())));
create policy "session members can read sessions" on public.lunchie_sessions for select using (host_user_id = auth.uid() or exists (select 1 from public.session_members m where m.session_id = id and m.user_id = auth.uid()));
create policy "host can write sessions" on public.lunchie_sessions for all using (host_user_id = auth.uid()) with check (host_user_id = auth.uid());
create policy "members can read session members" on public.session_members for select using (user_id = auth.uid() or exists (select 1 from public.session_members m where m.session_id = session_id and m.user_id = auth.uid()));
create policy "members can write own membership" on public.session_members for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members can write own swipes" on public.swipes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
