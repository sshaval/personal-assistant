import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Behind Netlify's proxy, the internal Host the server sees differs from the
      // public domain, so Next's Server Action CSRF origin-check rejects every
      // action POST (login, task add/edit, etc.) unless the public origin is
      // listed here. Add any custom domain here too once one is attached.
      allowedOrigins: ["claudiathehelper.netlify.app"],
    },
  },
};

export default nextConfig;
