/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled on purpose: StrictMode double-invokes effects in dev, which opens a
  // second WebSocket connection per client. That races the drawer/host mapping
  // and the per-drawer "wordChoices" delivery. Production never double-mounts.
  reactStrictMode: false,
};

export default nextConfig;
