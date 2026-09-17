import { baseUrl } from './sitemap';
import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}