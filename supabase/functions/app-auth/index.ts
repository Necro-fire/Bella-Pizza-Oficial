// Edge function: server-side authentication for the POS.
// Credentials live in the (now locked-down) app_settings table and are NEVER
// exposed to the browser. This function validates them with the service role
// and mints a real Supabase session so the Data API can require an
// authenticated identity (closing the public read/write exposure).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

async function readSettings(keys: string[]): Promise<Record<string, string>> {
  const { data } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", keys);
  const map: Record<string, string> = {};
  (data || []).forEach((r: { key: string; value: unknown }) => {
    let v = r.value;
    if (typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        if (typeof parsed === "string") v = parsed;
      } catch (_) { /* plain string */ }
    }
    map[r.key] = v == null ? "" : String(v);
  });
  return map;
}

async function writeSetting(key: string, value: string) {
  await admin.from("app_settings").upsert({ key, value }, { onConflict: "key" });
}

// Lazily create a single shared auth user that backs every POS session.
async function ensurePosUser(): Promise<{ email: string; password: string }> {
  const s = await readSettings(["pos_user_email", "pos_user_password"]);
  if (s.pos_user_email && s.pos_user_password) {
    return { email: s.pos_user_email, password: s.pos_user_password };
  }
  const email = `pos-${crypto.randomUUID()}@bellapizza.local`;
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && !`${error.message}`.includes("already")) {
    throw new Error("Falha ao provisionar usuário de sessão");
  }
  await writeSetting("pos_user_email", email);
  await writeSetting("pos_user_password", password);
  return { email, password };
}

async function mintSession() {
  const { email, password } = await ensurePosUser();
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error("Falha ao criar sessão");
  return data.session;
}

async function requireSession(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await admin.auth.getUser(token);
  return !!data.user;
}

const companyInfo = (s: Record<string, string>) => ({
  companyName: s.company_name || "",
  companyAddress: s.company_address || "",
  companyPhone: s.company_phone || "",
  cnpj: s.auth_cnpj || "",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, ...payload } = await req.json();

    switch (action) {
      case "login": {
        const s = await readSettings([
          "auth_cnpj", "auth_password",
          "company_name", "company_address", "company_phone",
        ]);
        if (
          onlyDigits(payload.cnpj) === onlyDigits(s.auth_cnpj) &&
          payload.password === s.auth_password &&
          s.auth_password !== ""
        ) {
          const session = await mintSession();
          return json({ success: true, session, ...companyInfo(s) });
        }
        return json({ success: false });
      }

      case "recover_password": {
        const s = await readSettings(["auth_pin", "auth_password"]);
        if (payload.pin && payload.pin === s.auth_pin) {
          return json({ success: true, password: s.auth_password });
        }
        return json({ success: false });
      }

      case "recover_pin": {
        const s = await readSettings(["auth_cnpj", "auth_password", "auth_pin"]);
        if (
          onlyDigits(payload.cnpj) === onlyDigits(s.auth_cnpj) &&
          payload.password === s.auth_password
        ) {
          return json({ success: true, pin: s.auth_pin });
        }
        return json({ success: false });
      }

      // ---- Authenticated actions below ----
      case "unlock_pin": {
        if (!(await requireSession(req))) return json({ success: false }, 401);
        const s = await readSettings(["auth_pin"]);
        return json({ success: !!payload.pin && payload.pin === s.auth_pin });
      }

      case "get_company": {
        if (!(await requireSession(req))) return json({ success: false }, 401);
        const s = await readSettings([
          "company_name", "company_address", "company_phone", "auth_cnpj",
        ]);
        return json({ success: true, ...companyInfo(s) });
      }

      case "change_password": {
        if (!(await requireSession(req))) return json({ success: false }, 401);
        const s = await readSettings(["auth_password"]);
        if (payload.currentPassword === s.auth_password) {
          await writeSetting("auth_password", payload.newPassword);
          return json({ success: true });
        }
        return json({ success: false });
      }

      case "change_pin": {
        if (!(await requireSession(req))) return json({ success: false }, 401);
        const s = await readSettings(["auth_pin"]);
        if (payload.currentPin === s.auth_pin) {
          await writeSetting("auth_pin", payload.newPin);
          return json({ success: true });
        }
        return json({ success: false });
      }

      case "set_cnpj": {
        if (!(await requireSession(req))) return json({ success: false }, 401);
        await writeSetting("auth_cnpj", payload.cnpj);
        return json({ success: true });
      }

      case "set_company": {
        if (!(await requireSession(req))) return json({ success: false }, 401);
        if (payload.companyName !== undefined) await writeSetting("company_name", payload.companyName);
        if (payload.companyAddress !== undefined) await writeSetting("company_address", payload.companyAddress);
        if (payload.companyPhone !== undefined) await writeSetting("company_phone", payload.companyPhone);
        return json({ success: true });
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    console.error("app-auth error", e);
    return json({ success: false, error: "internal_error" }, 500);
  }
});
