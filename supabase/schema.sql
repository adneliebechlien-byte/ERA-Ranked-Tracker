-- Kjør denne i Supabase sitt SQL Editor (Supabase-prosjektet ditt -> SQL Editor -> New query)
-- for å opprette tabellen appen lagrer ranked-kamper i.

create table if not exists ranked_battles (
  id bigint generated always as identity primary key,
  tag text not null,
  player_name text not null,
  battle_time timestamptz not null,
  map text not null,
  mode text not null,
  brawler_id integer not null,
  brawler_name text not null,
  outcome text not null check (outcome in ('win', 'loss', 'draw')),
  trophy_change integer,
  ranked_format text not null check (ranked_format in ('ffa', 'team')),
  rating integer, -- kun satt for ranked_format = 'team'; antatt rank-poeng (se lib/brawlstars/types.ts)
  teammates jsonb default '[]'::jsonb, -- de to andre spillerne på laget: [{"tag": "...", "name": "..."}]
  created_at timestamptz default now(),
  unique (tag, battle_time)
);

create index if not exists ranked_battles_tag_idx on ranked_battles (tag);
create index if not exists ranked_battles_battle_time_idx on ranked_battles (battle_time desc);

-- Row Level Security skrus på, men appen bruker kun service_role-nøkkelen
-- server-side (som alltid går forbi RLS), så vi trenger ingen policies her
-- ennå. Legger vi til klient-side lesing senere (f.eks. en offentlig
-- statistikkside uten server-komponent), lager vi en egen read-only policy da.
alter table ranked_battles enable row level security;
