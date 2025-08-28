import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://evsipoodragfmwivhaya.supabase.co";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2c2lwb29kcmFnZm13aXZoYXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MDA2MjEsImV4cCI6MjA3MTQ3NjYyMX0.jQLb_Uape_BtQL148B4EU3ySkiv87ziJLKdIe2DC6IM";

export const supabase = createClient(url, anon);
