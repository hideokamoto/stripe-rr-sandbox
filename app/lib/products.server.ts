export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  favorite: boolean;
}

/**
 * In-memory product store. Replace with a real database in production.
 */
const products: Product[] = [
  {
    id: "starter",
    name: "Starter Plan",
    description: "Perfect for individuals getting started.",
    price: 9,
    favorite: false,
  },
  {
    id: "pro",
    name: "Pro Plan",
    description: "For growing teams that need more power.",
    price: 29,
    favorite: true,
  },
  {
    id: "business",
    name: "Business Plan",
    description: "Advanced features for larger organizations.",
    price: 99,
    favorite: false,
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    description: "Custom solutions with dedicated support.",
    price: 299,
    favorite: false,
  },
];

/** Return products filtered by a free-text query against name/description. */
export function listProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );
}

/** Set the favorite flag for a product and return the updated record. */
export function setFavorite(id: string, favorite: boolean): Product | undefined {
  const product = products.find((p) => p.id === id);
  if (product) product.favorite = favorite;
  return product;
}
