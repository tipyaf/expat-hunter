import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/sourcing', destination: '/recherche', permanent: true },
      { source: '/pipeline', destination: '/suivi', permanent: true },
      { source: '/profile', destination: '/profil', permanent: true },
      { source: '/profile/setup', destination: '/profil/setup', permanent: true },
      { source: '/settings', destination: '/parametres', permanent: true },
    ]
  },
}

export default withNextIntl(nextConfig)
