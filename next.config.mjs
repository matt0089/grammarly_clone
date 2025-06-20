/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['tree-sitter', 'tree-sitter-javascript', 'tree-sitter-typescript'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
