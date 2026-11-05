import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getProducts } from '@/lib/api';
import { links } from '@/lib/utils';
import { listParams, ProductListing, type SearchParams } from '@/components/listing/product-listing';

interface Props {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<SearchParams>;
}

/** The last part of /product-category/paper/art-paper/ is the category. */
const slugOf = (parts: string[]) => decodeURIComponent(parts[parts.length - 1] ?? '');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = await getProducts({ category: slugOf((await params).slug), pageSize: 1 });
  const c = list.category!;
  return {
    title: c.seoTitle ?? `${c.name} — buy online in Bangladesh`,
    description: c.seoDescription ?? c.description ?? `Shop ${c.name.toLowerCase()} online with cash on delivery across Bangladesh.`,
    alternates: { canonical: links.category(c.path.map((p) => p.slug)) },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const list = await getProducts({ category: slugOf(slug), ...listParams(query) });
  const category = list.category!;
  const path = category.path.map((p) => p.slug);

  // One address per category: send /product-category/art-paper/ to /product-category/paper/art-paper/.
  const canonical = links.category(path);
  if (slug.map(decodeURIComponent).join('/') !== path.join('/')) {
    const q = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => typeof e[1] === 'string')).toString();
    permanentRedirect(q ? `${canonical}?${q}` : canonical);
  }

  return (
    <ProductListing
      title={category.name}
      intro={category.description}
      crumbs={category.path.slice(0, -1).map((p, i) => ({ name: p.name, href: links.category(path.slice(0, i + 1)) }))}
      list={list}
      params={query}
      path={canonical}
      subcategories={category.children.map((c) => ({
        name: c.name,
        href: links.category([...path, c.slug]),
        icon: c.icon,
        count: c.productCount,
      }))}
    />
  );
}
