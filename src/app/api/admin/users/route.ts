import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/admin/users
 * Returns all users with site + backlink counts.
 * Uses service role to bypass RLS.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Also connect to old DB for backlink counts
  const oldDb = process.env.NETWORK_SUPABASE_URL && process.env.NETWORK_SUPABASE_SERVICE_KEY
    ? createClient(process.env.NETWORK_SUPABASE_URL, process.env.NETWORK_SUPABASE_SERVICE_KEY)
    : null;

  // Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, name, role, plan_id, subscription_status, created_at, last_active_at")
    .order("created_at", { ascending: false });

  if (!profiles) return NextResponse.json({ users: [] });

  // Get auth users for last_sign_in_at
  const authData: Record<string, { lastSignIn: string | null; signInCount: number }> = {};
  let authPage = 1;
  while (true) {
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ page: authPage, perPage: 100 });
    if (!authUsers || authUsers.length === 0) break;
    for (const u of authUsers) {
      // Supabase doesn't track sign-in count natively, but we can infer activity
      authData[u.id] = {
        lastSignIn: u.last_sign_in_at || null,
        signInCount: u.app_metadata?.sign_in_count ?? (u.last_sign_in_at ? 1 : 0),
      };
    }
    if (authUsers.length < 100) break;
    authPage++;
  }

  // Count sites per user (service role bypasses RLS)
  const siteCounts: Record<string, number> = {};
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("client_sites")
      .select("user_id")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    for (const s of data) {
      siteCounts[s.user_id] = (siteCounts[s.user_id] ?? 0) + 1;
    }
    if (data.length < 1000) break;
    offset += 1000;
  }

  // Count backlinks from NEW DB
  const blCounts: Record<string, number> = {};
  offset = 0;
  while (true) {
    const { data } = await supabase
      .from("backlinks")
      .select("user_id")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    for (const b of data) {
      blCounts[b.user_id] = (blCounts[b.user_id] ?? 0) + 1;
    }
    if (data.length < 1000) break;
    offset += 1000;
  }

  // Count backlinks from OLD DB (mapped by email)
  const oldBlCounts: Record<string, number> = {};
  const oldCreatedAt: Record<string, string> = {}; // email -> original created_at
  if (oldDb) {
    try {
      // Build email->new_id map
      const emailToNewId: Record<string, string> = {};
      for (const p of profiles) {
        if (p.email) emailToNewId[p.email] = p.id;
      }

      // Get old auth users for email mapping + original created_at
      const oldUsers: Record<string, string> = {}; // old_id -> email
      let page = 1;
      while (true) {
        const res = await fetch(`${process.env.NETWORK_SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`, {
          headers: { apikey: process.env.NETWORK_SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${process.env.NETWORK_SUPABASE_SERVICE_KEY!}` },
        });
        const data = await res.json();
        for (const u of data.users ?? []) {
          oldUsers[u.id] = u.email;
          if (u.email && u.created_at) oldCreatedAt[u.email] = u.created_at;
        }
        if ((data.users ?? []).length < 100) break;
        page++;
      }

      // Count old backlinks per old user_id
      const oldBl: Record<string, number> = {};
      offset = 0;
      while (true) {
        const { data } = await oldDb
          .from("backlinks")
          .select("user_id")
          .eq("status", "live")
          .range(offset, offset + 999);
        if (!data || data.length === 0) break;
        for (const b of data) {
          oldBl[b.user_id] = (oldBl[b.user_id] ?? 0) + 1;
        }
        if (data.length < 1000) break;
        offset += 1000;
      }

      // Map old counts to new user IDs via email
      for (const [oldId, count] of Object.entries(oldBl)) {
        const email = oldUsers[oldId];
        if (email) {
          const newId = emailToNewId[email];
          if (newId) oldBlCounts[newId] = count;
        }
      }
    } catch (e) {
      console.error("[admin/users] Error fetching old backlinks:", e);
    }
  }

  const users = profiles.map(d => {
    // Use the earliest date between old and new DB as real registration date
    const newDate = d.created_at || "";
    const oldDate = d.email ? oldCreatedAt[d.email] : "";
    let realDate = newDate;
    if (oldDate && newDate) {
      realDate = new Date(oldDate) < new Date(newDate) ? oldDate : newDate;
    } else if (oldDate) {
      realDate = oldDate;
    }

    const auth = authData[d.id];

    return {
      id: d.id,
      name: d.name || d.email?.split("@")[0] || "Sem nome",
      email: d.email || "",
      plan: d.plan_id || "starter",
      role: d.role || "client",
      status: d.subscription_status || "trialing",
      sites: siteCounts[d.id] ?? 0,
      backlinks: (blCounts[d.id] ?? 0) + (oldBlCounts[d.id] ?? 0),
      joined: realDate?.split("T")[0] || "",
      lastActive: d.last_active_at,
      lastSignIn: auth?.lastSignIn || null,
    };
  });

  return NextResponse.json({ users, total: users.length });
}
