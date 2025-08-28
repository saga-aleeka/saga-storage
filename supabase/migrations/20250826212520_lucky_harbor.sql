/*
  # Create KV Store Table

  1. New Tables
    - `kv_store_aaac77aa`
      - `key` (text, primary key)
      - `value` (jsonb, not null)
  2. Security
    - Enable RLS on `kv_store_aaac77aa` table
    - Add policy for service role access
*/

CREATE TABLE IF NOT EXISTS kv_store_aaac77aa (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE kv_store_aaac77aa ENABLE ROW LEVEL SECURITY;

-- Allow service role to perform all operations
CREATE POLICY "Service role can manage all data"
  ON kv_store_aaac77aa
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);