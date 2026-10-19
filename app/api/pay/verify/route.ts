import { createHmac, timingSafeEqual } from "crypto";
import { PERIOD_DAYS, PRICE_PAISE, admin, config, json, razorpay, userFrom } from "@/lib/payServer";

export const runtime = "nodejs";

/** Checks Razorpay's signature, confirms the order belongs to this user and is paid, then turns the plan on. */
export async function POST(req: Request) {
  const cfg = config();
  if (!cfg) return json({ error: "not_configured" }, 503);
  const user = await userFrom(req, cfg.sbSecret);
  if (!user) return json({ error: "sign_in" }, 401);

  const b = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
  const orderId = b.razorpay_order_id || "";
  const paymentId = b.razorpay_payment_id || "";
  const signature = b.razorpay_signature || "";
  if (!/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId) || !/^[a-f0-9]{64}$/.test(signature)) {
    return json({ error: "bad_request" }, 400);
  }

  const expected = createHmac("sha256", cfg.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return json({ error: "bad_signature" }, 400);

  try {
    const order = await razorpay(`/orders/${orderId}`, cfg.keyId, cfg.keySecret);
    const plan = order?.notes?.plan as "plus" | "deep";
    if (order?.notes?.user_id !== user.id || (plan !== "plus" && plan !== "deep")) return json({ error: "not_yours" }, 403);
    if (order.amount !== PRICE_PAISE[plan]) return json({ error: "amount" }, 400);

    const db = admin(cfg.sbSecret);
    const { data: cur } = await db
      .from("subscriptions")
      .select("plan, razorpay_payment_id, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    // Same payment sent twice: nothing to add.
    if (cur?.razorpay_payment_id === paymentId) return json({ plan: cur.plan, until: cur.current_period_end });

    // Paying again before the month ends adds 30 days on top of what's left.
    const now = Date.now();
    const curEnd = cur?.current_period_end ? Date.parse(cur.current_period_end) : 0;
    const start = curEnd > now ? curEnd : now;
    const until = new Date(start + PERIOD_DAYS * 864e5).toISOString();

    const { error } = await db.from("subscriptions").upsert(
      { user_id: user.id, plan, razorpay_payment_id: paymentId, current_period_end: until, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return json({ plan, until });
  } catch {
    return json({ error: "server" }, 502);
  }
}
