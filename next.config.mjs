/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/private/:path*',
        headers: [{ key: 'x-robots-tag', value: 'noindex' }],
      },
    ];
  },
};

export default nextConfig;