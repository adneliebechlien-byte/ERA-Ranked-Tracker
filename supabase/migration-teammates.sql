-- Kjør denne i Supabase sitt SQL Editor for å legge til støtte for
-- "spilt med"-statistikk (lagrer hvem de to andre lagkameratene var).
alter table ranked_battles add column if not exists teammates jsonb default '[]'::jsonb;
