import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://nevvoh.com';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Per-route SEO head tags (title, description, canonical, OpenGraph, Twitter, JSON-LD).
 * Each route should render exactly one <SEO />.
 */
export function SEO({ title, description, path, ogType = 'website', jsonLd }: SEOProps) {
  const url = `${SITE_URL}${path}`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
