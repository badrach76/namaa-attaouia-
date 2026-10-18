-- MAASSIR MARKET / سوق معاصر المغرب
-- Production backend schema for Supabase
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  unit_name text,
  city text,
  region text,
  activity text,
  phone text,
  whatsapp text,
  bio text,
  oil_quality text check (oil_quality in ('بكر ممتاز','بكر عادي') or oil_quality is null),
  oil_price numeric,
  oil_price_unit text default 'درهم/لتر',
  oil_price_updated date,
  show_in_directory boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('بيع','شراء')),
  category text not null,
  subcategory text,
  title text not null,
  price text,
  quantity text,
  location text,
  region text,
  condition text,
  unit_name text,
  onssa text,
  description text,
  hide_identity boolean default false,
  hide_phone boolean default false,
  hide_whatsapp boolean default false,
  publish_plan text not null default 'free' check (publish_plan in ('free','premium')),
  status text not null default 'pending' check (status in ('pending','published','pending_payment','rejected','hidden','expired')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required','pending','paid','rejected')),
  premium_position text,
  premium_starts_at timestamptz,
  premium_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text,
  public_url text,
  media_type text not null check (media_type in ('image','video')),
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.price_indicators (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label_ar text not null,
  label_fr text,
  label_en text,
  value numeric not null,
  unit_ar text not null,
  unit_fr text,
  unit_en text,
  source text not null,
  as_of date not null,
  updated_at timestamptz default now()
);

create table if not exists public.ad_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  placement text,
  duration_days integer,
  amount numeric,
  payment_method text,
  payment_reference text,
  proof_url text,
  status text default 'pending' check (status in ('pending','approved','paid','active','rejected','expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.price_indicators enable row level security;
alter table public.ad_requests enable row level security;

create policy "public profiles directory" on public.profiles for select using (show_in_directory = true or auth.uid() = id);
create policy "owners update profile" on public.profiles for update using (auth.uid() = id);
create policy "owners insert profile" on public.profiles for insert with check (auth.uid() = id);

create policy "published listings public" on public.listings for select using (status = 'published' or auth.uid() = owner_id);
create policy "owners create listings" on public.listings for insert with check (auth.uid() = owner_id);
create policy "owners update listings" on public.listings for update using (auth.uid() = owner_id);
create policy "owners delete listings" on public.listings for delete using (auth.uid() = owner_id);

create policy "public media for published listings" on public.listing_media for select using (exists(select 1 from public.listings l where l.id=listing_id and (l.status='published' or l.owner_id=auth.uid())));
create policy "owners insert media" on public.listing_media for insert with check (exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()));
create policy "owners delete media" on public.listing_media for delete using (exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()));

create policy "public price indicators" on public.price_indicators for select using (true);

create policy "owners see own ad requests" on public.ad_requests for select using (auth.uid() = owner_id);
create policy "owners create ad requests" on public.ad_requests for insert with check (auth.uid() = owner_id);

-- Admin operations should be performed with Supabase Auth roles / server-side service role,
-- not with a client-side PIN.
