import createMDX from '@next/mdx';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

if (process.env.CF_DEV === '1') {
  initOpenNextCloudflareForDev();
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-frontmatter', ['yaml']]],
    rehypePlugins: [],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  experimental: {
    // Barrel packages: rewrite `import { X } from 'pkg'` to the specific
    // submodule so the bundler doesn't pull the whole re-export surface.
    // `radix-ui` (unified package) is imported by name across many files;
    // without this it balloons the client chunks (part of the ~97KB unused JS
    // Lighthouse flagged on `/`). lucide-react gets the same treatment.
    optimizePackageImports: ['radix-ui', 'lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);
