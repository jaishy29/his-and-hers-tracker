-- His & Hers Tracker: database setup.
-- Paste this whole file into Supabase -> SQL Editor -> New query, then click Run.
-- It is safe to run more than once.

-- ---------- Tables ----------

-- The two sides. Each row is claimed by one login.
create table if not exists public.people (
  side       text primary key check (side in ('his', 'hers')),
  user_id    uuid unique references auth.users (id) on delete set null,
  name       text not null default '' check (char_length(name) <= 20),
  remind_at  text not null default '19:00' check (remind_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  updated_at timestamptz not null default now()
);
insert into public.people (side) values ('his'), ('hers') on conflict do nothing;

-- One row per person per day: a workout or a rest day.
create table if not exists public.days (
  side      text not null references public.people (side),
  day       date not null,
  mark      text not null check (mark in ('done', 'rest')),
  type      text check (type in ('strength','walk','run','cardio','hiit','cycle','yoga','swim','sports','other')),
  minutes   int check (minutes between 1 and 600),
  intensity text check (intensity in ('easy','moderate','hard')),
  note      text not null default '' check (char_length(note) <= 140),
  logged_at timestamptz not null default now(),
  primary key (side, day)
);

create table if not exists public.weights (
  side text not null references public.people (side),
  day  date not null,
  lb   numeric(5,1) not null check (lb > 50 and lb < 600),
  primary key (side, day)
);

create table if not exists public.scratched (
  side   text not null references public.people (side),
  target int  not null,
  at     timestamptz not null default now(),
  primary key (side, target)
);

-- Activity feed: check-ins, rest days, nudges, high fives, milestones.
create table if not exists public.feed (
  id        uuid primary key default gen_random_uuid(),
  who       text not null references public.people (side),
  to_side   text not null references public.people (side),
  kind      text not null check (kind in ('checkin','rest','nudge','cheer','milestone')),
  at        timestamptz not null default now(),
  seen      boolean not null default false,
  type      text,
  minutes   int,
  intensity text,
  msg       text check (char_length(msg) <= 120),
  lost      int,
  goal      boolean
);
create index if not exists feed_at_idx on public.feed (at desc);

-- ---------- Helper functions ----------

-- Which side ('his' or 'hers') the logged-in person has claimed, or null.
create or replace function public.my_side() returns text
language sql stable security definer set search_path = public as $$
  select side from public.people where user_id = auth.uid()
$$;

-- Sides nobody has claimed yet (shown on the "Which one are you?" screen).
create or replace function public.free_sides() returns setof text
language sql stable security definer set search_path = public as $$
  select side from public.people where user_id is null order by side desc
$$;

-- Claim a side. Works only if that side is free and you haven't claimed one already.
create or replace function public.claim_side(p_side text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if exists (select 1 from public.people where user_id = auth.uid()) then
    return (select side from public.people where user_id = auth.uid());
  end if;
  update public.people set user_id = auth.uid(), updated_at = now()
   where side = p_side and user_id is null;
  if not found then raise exception 'That side is already taken'; end if;
  return p_side;
end $$;

revoke all on function public.claim_side(text) from public, anon;
grant execute on function public.claim_side(text) to authenticated;
grant execute on function public.free_sides() to authenticated;
grant execute on function public.my_side() to authenticated;

-- ---------- Security rules (Row Level Security) ----------
-- Only the two linked people can see anything. Each person can change only their own side.

alter table public.people    enable row level security;
alter table public.days      enable row level security;
alter table public.weights   enable row level security;
alter table public.scratched enable row level security;
alter table public.feed      enable row level security;

-- Logged-out visitors get no access at all. Logged-in people get table access,
-- and the rules below narrow it down to "only the two linked people, only their own side".
revoke all on public.people, public.days, public.weights, public.scratched, public.feed from anon;
grant select, insert, update, delete on public.days, public.weights, public.scratched to authenticated;
grant select, insert on public.feed to authenticated;

-- People can only change their own name and reminder time (never who owns a side).
revoke insert, update, delete on public.people from anon, authenticated;
grant select on public.people to authenticated;
grant update (name, remind_at, updated_at) on public.people to authenticated;

drop policy if exists "members read people" on public.people;
create policy "members read people" on public.people for select to authenticated
  using (public.my_side() is not null);
drop policy if exists "edit own person" on public.people;
create policy "edit own person" on public.people for update to authenticated
  using (side = public.my_side()) with check (side = public.my_side());

do $$
declare t text;
begin
  foreach t in array array['days', 'weights', 'scratched'] loop
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.my_side() is not null)', t);
    execute format('drop policy if exists "write own side" on public.%I', t);
    execute format('create policy "write own side" on public.%I for all to authenticated using (side = public.my_side()) with check (side = public.my_side())', t);
  end loop;
end $$;

drop policy if exists "members read feed" on public.feed;
create policy "members read feed" on public.feed for select to authenticated
  using (public.my_side() is not null);
drop policy if exists "post as myself" on public.feed;
create policy "post as myself" on public.feed for insert to authenticated
  with check (who = public.my_side() and to_side <> who);
drop policy if exists "mark my messages seen" on public.feed;
create policy "mark my messages seen" on public.feed for update to authenticated
  using (to_side = public.my_side()) with check (to_side = public.my_side());

revoke update on public.feed from authenticated;
grant update (seen) on public.feed to authenticated;

-- "Undo today" removes your own check-in / rest-day post (never your partner's posts).
grant delete on public.feed to authenticated;
drop policy if exists "delete my own day posts" on public.feed;
create policy "delete my own day posts" on public.feed for delete to authenticated
  using (who = public.my_side() and kind in ('checkin', 'rest'));

-- ---------- Live syncing ----------
-- Tell Supabase to push changes to both phones instantly.
do $$
declare t text;
begin
  foreach t in array array['people', 'days', 'weights', 'scratched', 'feed'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- Notifications (Milestone 6) ----------

-- Each phone/browser that turned on notifications. Only the app's server reads these.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  side       text not null references public.people (side),
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
drop policy if exists "manage my devices" on public.push_subscriptions;
create policy "manage my devices" on public.push_subscriptions for all to authenticated
  using (side = public.my_side()) with check (side = public.my_side());

-- Marks feed posts whose notification was already sent (so it's never sent twice).
alter table public.feed add column if not exists pushed boolean not null default false;

-- Timed reminders already sent today (one daily reminder + one 9 PM alert per person).
create table if not exists public.reminder_log (
  side    text not null references public.people (side),
  day     date not null,
  kind    text not null check (kind in ('remind', 'missed')),
  sent_at timestamptz not null default now(),
  primary key (side, day, kind)
);
alter table public.reminder_log enable row level security;
revoke all on public.reminder_log from anon, authenticated;

-- The app's server (secret key) can read and write everything it needs.
grant all on public.people, public.days, public.weights, public.scratched, public.feed,
  public.push_subscriptions, public.reminder_log to service_role;

-- ---------- Reminder scheduler (Milestone 7) ----------
-- Every 5 minutes, Supabase calls the live app's reminder route.
-- Its password is generated inside the database (Vault) and never leaves it except in that call.
-- If your app's address changes, update the url below and run this section again.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'hh_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'hh_cron_secret', 'His & Hers reminder scheduler');
  end if;
end $$;

-- Lets the app's server check the scheduler's password without ever reading it.
create or replace function public.check_cron_secret(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'hh_cron_secret' and decrypted_secret = p)
$$;
revoke all on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'hh-reminders';
select cron.schedule('hh-reminders', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://his-and-hers-tracker.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'hh_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$job$);
