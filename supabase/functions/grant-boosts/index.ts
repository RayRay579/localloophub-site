import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const REVENUECAT_SECRET_KEY = Deno.env.get("REVENUECAT_SECRET_KEY") ?? "";

const BOOST_PACKS: Record<string, number> = {
  localloophub_boost_1: 1,
  localloophub_boost_6: 6,
  localloophub_boost_10: 10,
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !REVENUECAT_SECRET_KEY) {
    return jsonResponse({ error: "Server not configured" }, 500);
  }

  const { productId, appUserId } = await req.json().catch(() => ({}));
  if (!appUserId || typeof appUserId !== "string") {
    return jsonResponse({ error: "Bad request", reason: "missing_app_user_id" }, 400);
  }
  const productFilter = typeof productId === "string" && BOOST_PACKS[productId] ? productId : null;

  const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${appUserId}`, {
    headers: {
      Authorization: `Bearer ${REVENUECAT_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!rcRes.ok) {
    const msg = await rcRes.text();
    return jsonResponse({ error: "RevenueCat error", detail: msg }, 502);
  }
  const rc = await rcRes.json();
  const nonSubs = rc?.subscriber?.non_subscriptions ?? {};

  const purchases: Array<{ purchaseId: string; productId: string; purchasedAt: string | null }> = [];
  const cutoffIso = Deno.env.get("BOOSTS_CUTOFF_ISO") ?? "";
  const cutoffMs = cutoffIso ? Date.parse(cutoffIso) : NaN;
  const productIds = productFilter ? [productFilter] : Object.keys(BOOST_PACKS);
  for (const pid of productIds) {
    const rows = Array.isArray(nonSubs?.[pid]) ? nonSubs[pid] : [];
    if (!rows.length) continue;

    const filtered = rows
      .map((row: any) => {
        const purchasedAt = row?.purchase_date ?? null;
        const purchasedMs = purchasedAt ? Date.parse(purchasedAt) : NaN;
        return { row, purchasedAt, purchasedMs };
      })
      .filter(({ purchasedMs }) => {
        if (!cutoffIso || Number.isNaN(cutoffMs)) return true;
        if (Number.isNaN(purchasedMs)) return true;
        return purchasedMs >= cutoffMs;
      })
      .sort((a, b) => {
        if (Number.isNaN(a.purchasedMs) && Number.isNaN(b.purchasedMs)) return 0;
        if (Number.isNaN(a.purchasedMs)) return 1;
        if (Number.isNaN(b.purchasedMs)) return -1;
        return b.purchasedMs - a.purchasedMs;
      });

    const latest = filtered[0];
    if (!latest) continue;

    const purchaseId =
      latest.row?.id ??
      latest.row?.original_transaction_id ??
      latest.row?.store_transaction_id ??
      (latest.purchasedAt ? `${pid}:${latest.purchasedAt}` : null);
    if (!purchaseId) continue;

    purchases.push({
      purchaseId: String(purchaseId),
      productId: pid,
      purchasedAt: latest.purchasedAt ?? null,
    });
  }

  if (!purchases.length) {
    return jsonResponse({ granted: 0, extraBoosts: null, newPurchases: 0 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const purchaseIds = purchases.map((p) => p.purchaseId);
  const { data: existing } = await supabaseAdmin
    .from("boost_purchases")
    .select("purchase_id")
    .eq("user_id", appUserId)
    .in("purchase_id", purchaseIds);
  const existingSet = new Set((existing ?? []).map((row: any) => row.purchase_id));
  const newPurchases = purchases.filter((p) => !existingSet.has(p.purchaseId));

  if (!newPurchases.length) {
    return jsonResponse({ granted: 0, extraBoosts: null, newPurchases: 0 });
  }

  const insertRows = newPurchases.map((p) => ({
    user_id: appUserId,
    purchase_id: p.purchaseId,
    product_id: p.productId,
    purchased_at: p.purchasedAt,
  }));
  const { error: insertError } = await supabaseAdmin.from("boost_purchases").insert(insertRows);
  if (insertError) return jsonResponse({ error: "Insert failed", detail: insertError.message }, 500);

  const totalAdded = newPurchases.reduce((sum, p) => sum + (BOOST_PACKS[p.productId] ?? 0), 0);
  if (totalAdded > 0) {
  const { error: incError } = await supabaseAdmin.rpc("increment_boosts", {
    p_user_id: appUserId,
    p_amount: totalAdded,
  });
    if (incError) return jsonResponse({ error: "Increment failed", detail: incError.message }, 500);
  }

  const { data: balanceRow } = await supabaseAdmin
    .from("user_boosts")
    .select("extra_boosts")
    .eq("user_id", appUserId)
    .maybeSingle();

  return jsonResponse({
    granted: totalAdded,
    extraBoosts: balanceRow?.extra_boosts ?? null,
    newPurchases: newPurchases.length,
  });
});
