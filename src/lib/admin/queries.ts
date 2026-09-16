import "server-only";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { DEMO_ADMINS, DEMO_FIELDS, DEMO_ORDERS, DEMO_PRODUCTS, demoOrder } from "./demo";
import type {
  AdminRow,
  OrderDetail,
  OrderFieldWithTranslations,
  OrderRow,
  ProductWithTranslations,
} from "./types";

/**
 * Every read here runs on the anon key with the administrator's own session, so
 * RLS is what grants it — not a service-role key that would make the policies
 * decorative.
 */

export const PHOTO_BUCKET = "product-photos";

/** Demo mode never reaches the database — see `env.consoleDemo`. */
const demo = () => env.consoleDemo;

/** Public URL for a stored photo. Storage paths are relative; the site needs absolute. */
export function photoUrl(path: string | null): string | null {
  if (!path) return null;
  // The fixtures point straight at files in `public`, so nothing in the demo
  // depends on storage being configured.
  if (path.startsWith("/")) return path;
  return `${env.supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

export async function listProducts(): Promise<ProductWithTranslations[]> {
  if (demo()) return DEMO_PRODUCTS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_translations(locale, name, note)")
    .order("position");

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductWithTranslations[];
}

export async function getProduct(slug: string): Promise<ProductWithTranslations | null> {
  if (demo()) return DEMO_PRODUCTS.find((row) => row.slug === slug) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_translations(locale, name, note)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProductWithTranslations | null) ?? null;
}

export async function listFields(): Promise<OrderFieldWithTranslations[]> {
  if (demo()) return DEMO_FIELDS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_fields")
    .select("*, order_field_translations(locale, label, placeholder, help, options)")
    .order("position");

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderFieldWithTranslations[];
}

export async function listOrders(): Promise<OrderRow[]> {
  if (demo()) return DEMO_ORDERS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderRow[];
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  if (demo()) return demoOrder(id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, order_items(id, variant, qty, unit_price_rsd, name_snapshot)," +
        " order_answers(field_key, label_snapshot, value, position)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OrderDetail | null) ?? null;
}

export async function listAdmins(): Promise<AdminRow[]> {
  if (demo()) return DEMO_ADMINS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admins")
    .select("user_id, email, created_at")
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminRow[];
}

/** Who is asking. The team screen needs it to refuse self-revocation. */
export async function currentUserId(): Promise<string | null> {
  if (demo()) return DEMO_ADMINS[0]?.user_id ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** The three figures on the overview. One round trip each, counts only. */
export async function overviewCounts(): Promise<{
  products: number;
  fields: number;
  newOrders: number;
}> {
  if (demo()) {
    return {
      products: DEMO_PRODUCTS.length,
      fields: DEMO_FIELDS.length,
      newOrders: DEMO_ORDERS.filter((order) => order.status === "new").length,
    };
  }

  const supabase = await createClient();
  const [products, fields, orders] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("order_fields").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return {
    products: products.count ?? 0,
    fields: fields.count ?? 0,
    newOrders: orders.count ?? 0,
  };
}
