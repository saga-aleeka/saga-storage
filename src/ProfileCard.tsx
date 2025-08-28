import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function ProfileCard() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // ensure row exists
      await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id" });
      const { data } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      setUsername(data?.username ?? "");
    })();
  }, []);

  const save = async () => {
    setStatus("Saving…");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ username, updated_at: new Date().toISOString() }).eq("id", user.id);
    setStatus("Saved!");
    setTimeout(() => setStatus(""), 1000);
  };

  return (
    <div className="max-w-md p-4 rounded-2xl border bg-white space-y-3">
      <label className="block">
        <span className="text-sm">Username</span>
        <input
          className="mt-1 w-full rounded-lg border p-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="yourname"
        />
      </label>
      <button className="px-4 py-2 rounded-lg border" onClick={save}>Save</button>
      <div className="text-sm opacity-60">{status}</div>
    </div>
  );
}
