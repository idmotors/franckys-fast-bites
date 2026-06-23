import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price_ar: number;
  category: string | null;
  image_url: string | null;
  available: boolean;
}

export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("available", true)
    .order("category");
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
});
