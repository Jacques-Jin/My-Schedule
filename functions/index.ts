import { serveSite } from "./adapter.mjs";
import { handleRequest } from "./handler.mjs";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const handler = serveSite(handleRequest, {
  createClient,
  env: (key: string) => {
    const v = Deno.env.get(key);
    if (!v) throw new Error(`missing env ${key}`);
    return v;
  },
});

Deno.serve(handler);
