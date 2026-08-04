-- ═══════════════════════════════════════════════════════════════════════════
-- SetterCanvas — Supabase schema (Phase 8b)
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: everything uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- Design notes:
--   • UUID primary keys, generated client-side, so offline devices never
--     collide (auto-increment integers would).
--   • Every table carries user_id + row-level security → multi-user ready,
--     though you're the only user for now.
--   • updated_at + deleted_at (soft delete) exist to make sync possible:
--     sync pulls "everything changed since X", and hard deletes would be
--     invisible to other devices.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.gyms (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name           text not null,
  location       text,
  grading_system text not null default 'Fontainebleau',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table if not exists public.walls (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade default auth.uid(),
  gym_id            uuid not null references public.gyms(id) on delete cascade,
  name              text not null,
  type              text not null default 'Boulder',   -- Boulder | Lead | Top-rope
  angle             text,                              -- Vertical | 15° | 30° | 45° | Roof
  height            numeric,
  width             numeric,
  -- Storage paths (not base64). Bucket: wall-photos
  photo_path            text,   -- current/default photo shown on canvas
  photo_stripped_path   text,
  photo_with_holds_path text,
  photo_partial_path    text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create table if not exists public.holds (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  gym_id     uuid not null references public.gyms(id) on delete cascade,
  name       text not null,
  brand      text,
  type       text not null default 'Jug',
  size       text not null default 'M',
  color      text not null default 'Red',
  quantity   integer not null default 1,
  condition  text not null default 'Good',
  tags       text[] not null default '{}',
  photo_path text,                                     -- bucket: hold-photos
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.routes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  gym_id       uuid not null references public.gyms(id) on delete cascade,
  wall_id      uuid not null references public.walls(id) on delete cascade,
  name         text not null default '',
  grade        text,
  route_type   text not null default 'Boulder',
  tape_color   text,
  setter       text,
  date_set     date,
  date_stripped date,
  status       text not null default 'planned',        -- planned|in progress|set|open|stripped
  style_tags   text[] not null default '{}',
  stages       jsonb not null default '{}'::jsonb,     -- {stageId: bool}
  canvas_state jsonb,                                  -- {grid:{rows,cols,visible}, placedHolds:[...]}
  movement_tags text[] not null default '{}',          -- future: 169-move taxonomy
  ric_risk       smallint,                             -- future: Risk 1-5
  ric_intensity  smallint,                             -- future: Intensity 1-5
  ric_complexity smallint,                             -- future: Complexity 1-5
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint routes_ric_risk_range       check (ric_risk       is null or ric_risk       between 1 and 5),
  constraint routes_ric_intensity_range  check (ric_intensity  is null or ric_intensity  between 1 and 5),
  constraint routes_ric_complexity_range check (ric_complexity is null or ric_complexity between 1 and 5)
);

create table if not exists public.testers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade default auth.uid(),
  route_id          uuid not null references public.routes(id) on delete cascade,
  name              text not null,
  height            integer,                            -- cm
  ability           text,                               -- Beginner|Intermediate|Advanced|Elite
  completed         text,                               -- Yes|No|Partial
  feedback          text,
  suggested_changes text,
  date              date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create table if not exists public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  route_id      uuid not null references public.routes(id) on delete cascade,
  customer_name text,
  rating        smallint,
  feedback      text,
  tags          text[] not null default '{}',
  date          date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint feedback_rating_range check (rating is null or rating between 1 and 5)
);

-- ── Indexes ───────────────────────────────────────────────────────────────
-- Foreign keys and the "changed since" sync query are the hot paths.

create index if not exists walls_gym_id_idx     on public.walls(gym_id);
create index if not exists holds_gym_id_idx     on public.holds(gym_id);
create index if not exists routes_gym_id_idx    on public.routes(gym_id);
create index if not exists routes_wall_id_idx   on public.routes(wall_id);
create index if not exists testers_route_id_idx on public.testers(route_id);
create index if not exists feedback_route_id_idx on public.feedback(route_id);

create index if not exists gyms_sync_idx     on public.gyms(user_id, updated_at);
create index if not exists walls_sync_idx    on public.walls(user_id, updated_at);
create index if not exists holds_sync_idx    on public.holds(user_id, updated_at);
create index if not exists routes_sync_idx   on public.routes(user_id, updated_at);
create index if not exists testers_sync_idx  on public.testers(user_id, updated_at);
create index if not exists feedback_sync_idx on public.feedback(user_id, updated_at);

-- ── updated_at auto-touch ─────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['gyms','walls','holds','routes','testers','feedback'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;

-- ── Row-level security ────────────────────────────────────────────────────
-- One policy per table: you can only touch your own rows.

do $$
declare t text;
begin
  foreach t in array array['gyms','walls','holds','routes','testers','feedback'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all_%1$s" on public.%1$s', t);
    execute format(
      'create policy "owner_all_%1$s" on public.%1$s
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;

-- ── Grants ────────────────────────────────────────────────────────────────
-- Grants and RLS are two different layers: a grant decides whether a role may
-- touch the table at all, RLS decides which rows it then sees. Supabase used
-- to add these grants automatically, but is moving to a stricter default
-- (applied to existing projects on 2026-10-30). Doing it explicitly here means
-- the app keeps working either way.
--
-- Only `authenticated` is granted. Anonymous visitors get nothing: the RLS
-- policies match on auth.uid(), which is null for them, so they would see no
-- rows regardless — but no grant at all is the tighter statement of intent.
-- (A future public feedback link would need its own policy and grant.)

grant usage on schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array['gyms','walls','holds','routes','testers','feedback'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- ── Heartbeat ─────────────────────────────────────────────────────────────
-- Free-plan projects are paused after 7 days without database activity, and
-- restoring by hand each time is a nuisance. A scheduled GitHub Action reads
-- this table every few days to keep the project awake.
--
-- It needs its own table because every other table here is deliberately
-- unreadable without a login, so an anonymous ping would be rejected rather
-- than counting as a real query. This table holds one row containing a
-- timestamp and nothing else, so making it publicly readable costs nothing.

create table if not exists public.heartbeat (
  id         smallint primary key default 1,
  pinged_at  timestamptz not null default now(),
  constraint heartbeat_is_a_single_row check (id = 1)
);

insert into public.heartbeat (id) values (1) on conflict (id) do nothing;

alter table public.heartbeat enable row level security;

drop policy if exists "heartbeat_readable" on public.heartbeat;
create policy "heartbeat_readable" on public.heartbeat
  for select using (true);

grant usage on schema public to anon;
grant select on public.heartbeat to anon;

-- ── Storage buckets ───────────────────────────────────────────────────────
-- Private buckets; files are read via signed URLs.
-- Convention: <user_id>/<gym_id>/<filename> — the first path segment is the
-- owner, which is what the policies below check.

insert into storage.buckets (id, name, public)
values ('wall-photos', 'wall-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('hold-photos', 'hold-photos', false)
on conflict (id) do nothing;

do $$
declare b text;
begin
  foreach b in array array['wall-photos','hold-photos'] loop
    execute format('drop policy if exists "owner_all_%s" on storage.objects', b);
    execute format(
      'create policy "owner_all_%1$s" on storage.objects
         for all
         using (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text)
         with check (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text)', b);
  end loop;
end;
$$;
