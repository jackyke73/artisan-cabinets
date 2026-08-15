/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer and xlsx are Node-only; keep them out of the client bundle
  // and let them run in server components / route handlers.
  serverExternalPackages: ["@react-pdf/renderer", "xlsx"],
};

export default nextConfig;
