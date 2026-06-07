export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
};

const PRODUCTS: Product[] = [
  {
    id: "starter",
    name: "Starter プラン",
    description: "個人開発者向けの軽量プラン。基本的な機能を試せます。",
    price: 980,
  },
  {
    id: "pro",
    name: "Pro プラン",
    description: "チーム開発に最適。優先サポートと高い上限を提供します。",
    price: 4980,
  },
  {
    id: "enterprise",
    name: "Enterprise プラン",
    description: "大規模組織向け。SSO や監査ログ、専任サポート付き。",
    price: 19800,
  },
  {
    id: "addon-analytics",
    name: "Analytics アドオン",
    description: "売上やコンバージョンを可視化する分析ダッシュボード。",
    price: 1500,
  },
  {
    id: "addon-storage",
    name: "Storage アドオン",
    description: "追加のファイルストレージ容量を購入できます。",
    price: 800,
  },
];

/** Filter products by a case-insensitive query over name and description. */
export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return PRODUCTS;
  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
}

// In-memory favorites keyed by user id. A real app would persist these.
const favoritesByUser = new Map<string, Set<string>>();

function favoritesFor(userId: string): Set<string> {
  let set = favoritesByUser.get(userId);
  if (!set) {
    set = new Set();
    favoritesByUser.set(userId, set);
  }
  return set;
}

export function getFavorites(userId: string): Set<string> {
  return favoritesFor(userId);
}

export function setFavorite(
  userId: string,
  productId: string,
  favorite: boolean,
): void {
  const set = favoritesFor(userId);
  if (favorite) {
    set.add(productId);
  } else {
    set.delete(productId);
  }
}
