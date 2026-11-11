/** Shapes returned by the PaperTree API (/v1/store). */

export interface Img {
  /** URL per saved width ("160", "400", "800", "1600"). */
  urls: Record<string, string>;
  width: number;
  height: number;
  alt: string | null;
}

export interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  image: Img | null;
  productCount: number;
  children: CategoryNode[];
}

export interface BrandInfo {
  name: string;
  slug: string;
  icon: string | null;
  image: Img | null;
  isFeatured: boolean;
}

export interface StoreInfo {
  name: string;
  tagline: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  openingHours: string | null;
  logo: Img | null;
  social: { facebook: string | null; instagram: string | null; youtube: string | null; tiktok: string | null };
}

/** Firebase web settings for "Continue with Google" (public by design). */
export interface GoogleConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export interface Catalog {
  store: StoreInfo;
  categories: CategoryNode[];
  brands: BrandInfo[];
  /** null: Google sign-in is switched off. */
  google: GoogleConfig | null;
}

export interface ProductCard {
  id: number;
  slug: string;
  name: string;
  brand: { name: string; slug: string } | null;
  image: Img | null;
  /** Up to 3 more pictures, for picture-on-hover. */
  moreImages?: Img[];
  price: number;
  /** Set when on sale: the normal price. */
  regularPrice: number | null;
  /** Set when the product has one variant: it can be added straight from the card. */
  variantId: number | null;
  variantCount: number;
  inStock: boolean;
  /** "Only 3 left". */
  lowStock: number | null;
  isNew: boolean;
}

/** A home page banner (managed in the admin). */
export interface Banner {
  /** What it shows, for screen readers. */
  title: string;
  image: Img;
  /** Made for phones; else the main picture. */
  mobileImage: Img | null;
  link: string | null;
}

export interface HomeData {
  /** Shown now: the slider (up to 8) and the side offers (up to 2). */
  banners?: { hero: Banner[]; tiles: Banner[] };
  deals: ProductCard[];
  newArrivals: ProductCard[];
  bestSellers: ProductCard[];
  categoryRows: { category: { name: string; slug: string; icon: string | null }; products: ProductCard[] }[];
}

export interface ProductList {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  category: {
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    image: Img | null;
    seoTitle: string | null;
    seoDescription: string | null;
    path: { name: string; slug: string }[];
    children: { name: string; slug: string; icon: string | null; productCount: number }[];
  } | null;
  facets: {
    brands: { slug: string; name: string; count: number }[];
    price: { min: number; max: number } | null;
  };
  /** Set when searching (q). */
  search: SearchInfo | null;
}

/** What a search really looked for. */
export interface SearchInfo {
  /** The words as typed (cleaned). */
  query: string;
  /** The words searched after spelling fixes. */
  searched: string;
  corrected: boolean;
  /** No product had all the words: these have some of them. */
  partial: boolean;
  /** The words were exactly a product's SKU: its slug. */
  sku?: string | null;
}

export interface ProductVariant {
  id: number;
  values: (string | null)[];
  sku: string | null;
  price: number;
  regularPrice: number | null;
  saleEndsAt: string | null;
  weightGrams: number | null;
  image: Img | null;
  inStock: boolean;
  /** How many can be ordered (null = no limit). */
  maxQuantity: number | null;
  lowStock: number | null;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  /** Cleaned HTML. */
  description: string | null;
  brand: { name: string; slug: string } | null;
  tags: string[];
  options: { name: string; values: string[] }[];
  specs: { name: string; value: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  images: Img[];
  categoryPath: { name: string; slug: string }[];
  variants: ProductVariant[];
  related: ProductCard[];
}

export interface Suggestions {
  products: ProductCard[];
  total: number;
  categories: { name: string; slug: string; icon: string | null }[];
  brands: { name: string; slug: string }[];
  search: SearchInfo | null;
}

export interface Places {
  divisions: { id: string; name: string }[];
  districts: { id: string; name: string; divisionId: string }[];
  areas: { id: string; name: string; districtId: string; city: boolean }[];
}

export interface CartCheckLine {
  variantId: number;
  quantity: number;
  problem: 'gone' | 'out_of_stock' | 'reduced' | null;
  productId?: number;
  slug?: string;
  name?: string;
  variantLabel?: string | null;
  image?: Img | null;
  price?: number;
  regularPrice?: number | null;
  maxQuantity?: number | null;
  lineTotal?: number;
}

export interface CartCheck {
  lines: CartCheckLine[];
  itemCount: number;
  subtotal: number;
  weightKg: number;
  delivery: {
    zone: string | null;
    deliveryTime: string | null;
    fee: number | null;
    freeAbove: number | null;
    toFree: number | null;
  } | null;
}

/** An order placed on the website, for its thank-you page. */
export interface PlacedOrder {
  number: number;
  status: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  areaName: string | null;
  districtName: string;
  deliveryTime: string | null;
  paymentMethod: string;
  /** variantId: for "Order again" (null when the product was deleted). */
  items: { variantId?: number | null; name: string; variantLabel: string | null; quantity: number; unitPrice: number; lineTotal: number; image: Img | null }[];
  subtotal: number;
  discount?: number;
  deliveryFee: number;
  total: number;
}
