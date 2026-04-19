/**
 * Shared HTML/plain-text email conventions: typography, spacing, signature, legal footer.
 */

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const BILLING_EMAIL_FOOTER_TEXT = [
  "—",
  "",
  "FileRight Solutions is operated by FileRight Document Facilitation Services",
  "DTI-Registered, Philippines",
  "",
  "This email and any attachments are confidential and intended solely for the recipient. If you received this in error, please notify us and delete this email immediately.",
].join("\n");

const BODY_FONT =
  "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;";
const P_BODY = `margin:0 0 14px;${BODY_FONT}font-size:15px;line-height:1.55;color:#334155;`;
const P_TIGHT = `margin:0 0 4px;${BODY_FONT}font-size:15px;line-height:1.55;color:#334155;`;

/** One logical paragraph (single line-height block; no extra blank lines inside). */
export function emailParagraphHtml(innerHtml: string): string {
  return `<p style="${P_BODY}">${innerHtml}</p>`;
}

/**
 * Closing: “Sincerely,” on its own line, signer name on the next line (no `Sincerely,  Reiner` on one line).
 */
export function emailSignatureHtml(signerName = "Reiner"): string {
  const safe = escapeHtml(signerName);
  return `<p style="margin:22px 0 0;${BODY_FONT}font-size:15px;line-height:1.5;color:#334155;">Sincerely,</p><p style="${P_TIGHT}"><strong>${safe}</strong></p>`;
}

export function emailSignatureText(signerName = "Reiner"): string {
  return `Sincerely,\n${signerName}`;
}

export function billingEmailFooterHtml(): string {
  return `<div style="margin-top:28px;padding-top:22px;border-top:1px solid #e2e8f0;${BODY_FONT}font-size:12px;line-height:1.6;color:#64748b;max-width:560px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0 0 12px 0;">
        <div style="font-size:13px;font-weight:600;color:#334155;letter-spacing:0.02em;">FileRight Solutions</div>
        <div style="margin-top:6px;color:#475569;">Operated by <strong style="color:#1e293b;font-weight:600;">FileRight Document Facilitation Services</strong></div>
        <div style="margin-top:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">DTI-Registered · Philippines</div>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 0 0 0;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
          This email and any attachments are confidential and intended solely for the recipient. If you received this in error, please notify us and delete this email immediately.
        </p>
      </td>
    </tr>
  </table>
</div>`;
}

/** Optional logo + product line above the salutation (pass from `config` on the server). */
export type WrapEmailBrandingOpts = {
  baseUrl: string;
  siteName: string;
  brandName?: string;
};

/** Logo uses `{baseUrl}/icon.png` when baseUrl is absolute http(s). */
export function emailBrandedHeaderHtml(opts: WrapEmailBrandingOpts): string {
  const base = (opts.baseUrl || "").trim().replace(/\/+$/, "");
  const site = escapeHtml(opts.siteName.trim());
  const alt = escapeHtml((opts.brandName || opts.siteName).trim());
  const showImg = /^https?:\/\//i.test(base);
  const imgSrc = showImg ? `${base}/icon.png` : "";
  const logoCell = showImg
    ? `<td width="56" valign="middle" style="padding:0 14px 0 0;margin:0;">
        <img src="${imgSrc}" width="48" height="48" alt="${alt}" style="display:block;width:48px;height:48px;border-radius:10px;border:1px solid #e2e8f0;background:#1e40af;" />
      </td>`
    : "";

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 22px;padding:0 0 20px;border-bottom:1px solid #e2e8f0;">
  <tr>
    ${logoCell}
    <td valign="middle" style="padding:0;margin:0;">
      <div style="${BODY_FONT}font-size:18px;font-weight:700;color:#0f172a;line-height:1.25;letter-spacing:-0.02em;">${site}</div>
    </td>
  </tr>
</table>`;
}

/** Wrap main HTML so clients get consistent outer width and base font (inner should be block elements). */
export function wrapEmailMainHtml(innerBlocks: string, branding?: WrapEmailBrandingOpts | null): string {
  const header =
    branding?.siteName?.trim()
      ? emailBrandedHeaderHtml({
          baseUrl: (branding.baseUrl || "").trim(),
          siteName: branding.siteName.trim(),
          brandName: branding.brandName,
        })
      : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#ffffff;">
  <tr>
    <td style="padding:20px 16px 28px;${BODY_FONT}">
      <div style="max-width:560px;margin:0 auto;">
        ${header}
        ${innerBlocks}
      </div>
    </td>
  </tr>
</table>`;
}

/** Plain text blocks joined with a single blank line (no triple spacing). */
export function joinTextParagraphs(lines: string[]): string {
  return lines
    .map((s) => s.trimEnd())
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convert plain text (paragraphs separated by blank lines) to simple HTML paragraphs. */
export function textToEmailHtmlParagraphs(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return blocks
    .map((b) => `<p style="${P_BODY}">${escapeHtml(b).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}
