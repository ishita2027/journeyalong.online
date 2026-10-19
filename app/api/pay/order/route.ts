import { PRICE_PAISE, config, json, razorpay, userFrom, type PaidPlan } from "@/lib/payServer";

export const runtime = "nodejs";

/** Creates a Razorpay order for the signed-in user. The amount is set here, never by the browser. */
export async function POST(req: Request) {
  const cfg = config();
  if (!cfg) return json({ error: "not_configured" }, 503);
  const user = await userFrom(req, cfg.sbSecret);
  if (!user) return json({ error: "sign_in" }, 401);

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  if (plan !== "plus" && plan !== "deep") return json({ error: "bad_plan" }, 400);

  try {
    const order = await razorpay("/orders", cfg.keyId, cfg.keySecret, {
      amount: PRICE_PAISE[plan as PaidPlan],
      currency: "INR",
      receipt: `ja_${Date.now().toString(36)}`,
      notes: { user_id: user.id, plan },
    });
    return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: cfg.keyId, email: user.email ?? "" });
  } catch {
    return json({ error: "razorpay" }, 502);
  }
}
