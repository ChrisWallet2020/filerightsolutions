/** @type {import('next').NextConfig} */

/**
 * Server Actions CSRF protection: allow these Host headers (host[:port], no protocol).
 * See https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#allowedorigins
 */
function serverActionAllowedOrigins() {
  const set = new Set(["localhost:3000"]);

  const addFromUrl = (value) => {
    if (!value || typeof value !== "string") return;
    const v = value.trim();
    if (!v) return;
    try {
      const u = new URL(v.includes("://") ? v : `https://${v}`);
      if (u.host) set.add(u.host);
    } catch {
      /* ignore */
    }
  };

  addFromUrl(process.env.SITE_BASE_URL);
  if (process.env.VERCEL_URL) addFromUrl(`https://${process.env.VERCEL_URL}`);

  const extra = process.env.SERVER_ACTION_ALLOWED_ORIGINS?.split(/[\s,]+/).filter(Boolean) || [];
  extra.forEach(addFromUrl);

  return Array.from(set);
}

const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: serverActionAllowedOrigins() },
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/admin-chris",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: "/admin-chris/:path*",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/admin-chris",
        destination: "/admin",
      },
      {
        source: "/admin-chris/:path*",
        destination: "/admin/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
