import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// VIKTIG: SUPABASE_SERVICE_ROLE_KEY har full skrivetilgang til databasen
// og skal ALDRI ha NEXT_PUBLIC_-prefiks eller sendes til klienten. Denne
// filen brukes kun server-side, aldri i en "use client"-fil.
//
// Klienten opprettes "lat" (kun ved faktisk bruk, ikke når filen
// importeres). Dette hindrer at en bygge-prosess (f.eks. på Vercel) kan
// feile bare fordi modulen ble lastet inn et sted uten at variablene var
// satt ennå — feilen kommer først når koden faktisk prøver å snakke med
// databasen, ikke ved import.

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY mangler. Sett begge i .env.local (lokalt) eller under Environment Variables (Vercel)."
    );
  }

  cached = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  return cached;
}
