/* kv_store.tsx
   Simple KV wrapper using Supabase.
   Table schema (example):
   CREATE TABLE kv_store_aaac77aa (
     key TEXT PRIMARY KEY,
     value JSONB NOT NULL
   );
*/

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

// Change this if your table name differs
const TABLE = "kv_store_aaac77aa";

// Build a client. Prefer service-role key if present, else fall back to anon.
function client() {
  const url =
    Deno.env.get("SUPABASE_URL") ||
    Deno.env.get("VITE_SUPABASE_URL"); // your value
  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || // preferred on server
    Deno.env.get("VITE_SUPABASE_ANON_KEY"); // fallback

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for server operations.",
    );
  }

  console.log(`Using Supabase client with ${key.includes('service_role') ? 'service_role' : 'anon'} key`);
  
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Set
export const set = async (key: string, value: any): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(TABLE).upsert({ key, value });
  if (error) throw new Error(error.message || 'Supabase operation failed with no specific message.');
};

// Get
export const get = async (key: string): Promise<any> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Supabase operation failed with no specific message.');
  return data?.value;
};

// Delete
export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(TABLE).delete().eq("key", key);
  if (error) throw new Error(error.message || 'Supabase operation failed with no specific message.');
};

// Multi-set
export const mset = async (keys: string[], values: any[]): Promise<void> => {
  const supabase = client();
  const rows = keys.map((k, i) => ({ key: k, value: values[i] }));
  const { error } = await supabase.from(TABLE).upsert(rows);
  if (error) throw new Error(error.message || 'Supabase operation failed with no specific message.');
};

// Multi-get
export const mget = async (keys: string[]): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .in("key", keys);
  if (error) throw new Error(error.message || 'Supabase operation failed with no specific message.');
  return data?.map((d) => d.value) ?? [];
};

// Multi-delete
export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(TABLE).delete().in("key", keys);
  if (error) throw new Error(error.message || 'Supabase operation failed with no specific message.');
};

// Prefix search
export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(TABLE)
    .select("key,value")
    .like("key", `${prefix}%`);
  if (error) throw new Error(error.message || 'Supabase operation failed with no specific message.');
  return data?.map((d) => d.value) ?? [];
};
