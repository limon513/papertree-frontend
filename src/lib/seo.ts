import { SITE_URL } from './utils';

/** Google's breadcrumb data: Home › Paper › Art paper. */
export const breadcrumbs = (items: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ name: 'Home', href: '/' }, ...items].map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: SITE_URL + item.href,
  })),
});
