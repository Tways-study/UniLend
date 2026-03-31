// ============================================================
// UniLend — Supabase Client Configuration
// ============================================================
// Replace these values with your project's URL and anon key.
// Find them in: Supabase Dashboard → Project Settings → API
// ============================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL  = "https://xehbnoualfxrbjugdjcf.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaGJub3VhbGZ4cmJqdWdkamNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MzU3MzUsImV4cCI6MjA5MDUxMTczNX0.7DK4GCOBjLEMD0ZgpPgh6G5Uz1PpCoYRiI-x7c37Eag";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
