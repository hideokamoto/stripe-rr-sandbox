import { Form, redirect, useFetcher } from "react-router";
import type { Route } from "./+types/products";
import { getSession } from "~/sessions.server";
import { getUserById } from "~/auth.server";
import { userContext } from "~/context";
import {
  getFavorites,
  searchProducts,
  setFavorite,
} from "~/products.server";

/**
 * Auth gate for this route. Runs before the loader/action; if the visitor has
 * no valid session it redirects to /login (preserving where they were headed),
 * otherwise it publishes the user onto the request context.
 */
const requireAuth: Route.MiddlewareFunction = async ({ request, context }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;
    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const user = await getUserById(userId);
  if (!user) {
    throw redirect("/login");
  }

  context.set(userContext, user);
};

export const middleware: Route.MiddlewareFunction[] = [requireAuth];

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext)!; // guaranteed by requireAuth middleware
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const favorites = getFavorites(user.id);
  const products = searchProducts(q).map((product) => ({
    ...product,
    favorite: favorites.has(product.id),
  }));

  return { q, products, total: products.length };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(userContext)!; // guaranteed by requireAuth middleware
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "");
  const favorite = formData.get("favorite") === "true";

  if (!productId) {
    return { ok: false as const, error: "productId is required" };
  }

  setFavorite(user.id, productId, favorite);
  return { ok: true as const, productId, favorite };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const q = loaderData?.q ?? "";
  const total = loaderData?.total ?? 0;

  const title = q
    ? `「${q}」の検索結果（${total}件） | 商品一覧`
    : "商品一覧";
  const description = q
    ? `「${q}」に一致する商品が${total}件見つかりました。`
    : `取り扱い中の全${total}件の商品を一覧で表示します。`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "robots", content: q ? "noindex" : "index,follow" },
  ];
}

type ProductWithFavorite = Awaited<
  ReturnType<typeof loader>
>["products"][number];

function FavoriteButton({ product }: { product: ProductWithFavorite }) {
  const fetcher = useFetcher<typeof action>();

  // Optimistic state: while the request is in flight use the value we just
  // submitted, otherwise fall back to the server-provided state.
  const favorite = fetcher.formData
    ? fetcher.formData.get("favorite") === "true"
    : product.favorite;

  const isPending = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="favorite" value={String(!favorite)} />
      <button
        type="submit"
        aria-pressed={favorite}
        aria-label={
          favorite
            ? `${product.name}をお気に入りから外す`
            : `${product.name}をお気に入りに追加`
        }
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        {favorite ? "★ お気に入り" : "☆ お気に入りに追加"}
      </button>
    </fetcher.Form>
  );
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { q, products, total } = loaderData;

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">商品一覧</h1>

      <Form method="get" role="search" className="flex gap-2 mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="商品名やキーワードで検索..."
          aria-label="商品を検索"
          className="border rounded px-3 py-2 flex-1"
        />
        <button type="submit" className="border rounded px-4 py-2">
          検索
        </button>
      </Form>

      <p className="text-sm text-gray-500 mb-4">
        {q ? `「${q}」の検索結果: ${total}件` : `${total}件の商品`}
      </p>

      {products.length === 0 ? (
        <p>該当する商品が見つかりませんでした。</p>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-start justify-between gap-4 border rounded p-4"
            >
              <div>
                <h2 className="font-semibold">{product.name}</h2>
                <p className="text-sm text-gray-600">{product.description}</p>
                <span className="text-sm font-medium">
                  ¥{product.price.toLocaleString("ja-JP")}
                </span>
              </div>
              <FavoriteButton product={product} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
