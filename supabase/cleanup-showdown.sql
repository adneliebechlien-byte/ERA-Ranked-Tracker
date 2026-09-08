-- Kjør denne i Supabase sitt SQL Editor for å fjerne Solo/Duo Showdown-kamper
-- som ble lagret før vi ekskluderte dem fra Ranked-statistikken.
delete from ranked_battles where ranked_format = 'ffa';
