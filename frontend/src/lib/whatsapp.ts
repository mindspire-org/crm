export function normalizeWhatsappPhone(
  phoneRaw?: string,
  opts?: { defaultCountryCode?: string }
): string | null {
  const defaultCountryCode = String(opts?.defaultCountryCode || "92").replace(/[^0-9]/g, "");
  const raw = String(phoneRaw || "").trim();
  if (!raw) return null;

  // Strip everything except digits
  let digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;

  // Convert international prefix 00xxxxxxxx -> xxxxxxxx
  if (digits.startsWith("00")) digits = digits.slice(2);

  // If it starts with 0, assume local format and prepend default country code
  if (digits.startsWith("0") && defaultCountryCode) {
    digits = digits.replace(/^0+/, "");
    if (digits) digits = `${defaultCountryCode}${digits}`;
  }

  // Basic length sanity
  if (digits.length < 7 || digits.length > 15) return null;

  return digits;
}

export function buildWhatsappUrl(phoneRaw?: string, message?: string, opts?: { defaultCountryCode?: string }): string | null {
  const phone = normalizeWhatsappPhone(phoneRaw, opts);
  if (!phone) return null;
  const msg = String(message || "");
  return `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

export function openWhatsappChat(phoneRaw?: string, message?: string, opts?: { defaultCountryCode?: string }) {
  const url = buildWhatsappUrl(phoneRaw, message, opts);
  if (!url) return { ok: false as const, reason: "invalid_phone" as const };
  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true as const };
}
