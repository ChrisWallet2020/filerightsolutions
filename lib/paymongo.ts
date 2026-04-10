import { config } from "@/lib/config";

type CreateCheckoutInput = {
  orderId: string;
  amountPhp: number;
  customerName: string;
  customerEmail: string;
};

type CreateCheckoutResult = {
  checkoutId: string;
  checkoutUrl: string;
  rawResponse: string;
};

function authHeaderFromSecret(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

function normalizeMethods(raw: string[]): string[] {
  // PayMongo checkout_session.payment_method_types — include qrph for BSP QR Ph (multi-wallet QR).
  const allowed = new Set(["qrph", "gcash", "paymaya", "card", "grab_pay"]);
  const out = raw
    .map((m) => m.trim().toLowerCase())
    .filter((m) => allowed.has(m));
  return out.length ? out : ["qrph", "gcash", "paymaya"];
}

export async function createPayMongoCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const secretKey = config.paymongo.secretKey.trim();
  if (!secretKey) {
    throw new Error("PAYMONGO_NOT_CONFIGURED");
  }

  const amount = Math.max(1, Math.floor(input.amountPhp)) * 100;
  const methods = normalizeMethods(config.paymongo.paymentMethodTypes);
  const successUrl = `${config.baseUrl}/payment/status?orderId=${encodeURIComponent(input.orderId)}&state=PENDING`;
  const cancelUrl = `${config.baseUrl}/account/payment`;

  const payload = {
    data: {
      attributes: {
        billing: {
          name: input.customerName,
          email: input.customerEmail,
        },
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        line_items: [
          {
            currency: "PHP",
            amount,
            name: `Service fee - ${input.orderId}`,
            quantity: 1,
          },
        ],
        payment_method_types: methods,
        description: `Payment for order ${input.orderId}`,
        reference_number: input.orderId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
    },
  };

  const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
    method: "POST",
    headers: {
      Authorization: authHeaderFromSecret(secretKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const reason =
      parsed?.errors?.[0]?.detail ||
      parsed?.errors?.[0]?.code ||
      parsed?.errors?.[0]?.title ||
      raw ||
      `HTTP_${res.status}`;
    throw new Error(`PAYMONGO_CREATE_FAILED:${reason}`);
  }

  const checkoutId = String(parsed?.data?.id || "").trim();
  const checkoutUrl = String(parsed?.data?.attributes?.checkout_url || "").trim();
  if (!checkoutId || !checkoutUrl) {
    throw new Error("PAYMONGO_MISSING_CHECKOUT_URL");
  }

  return { checkoutId, checkoutUrl, rawResponse: raw };
}
