import type { WrapEmailBrandingOpts } from "./formatting";
import { config } from "@/lib/config";

/** Logo + product line for HTML client emails (uses live `config` / env). */
export function clientEmailBranding(): WrapEmailBrandingOpts {
  return {
    baseUrl: config.baseUrl,
    siteName: config.siteName,
    brandName: config.brandName,
  };
}
