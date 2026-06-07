import { Form, redirect, useFetcher } from "react-router";
import type { Route } from "./+types/products";
import {
  getUserFromRequest,
  userContext,
} from "../lib/auth.server";
import {
  listProducts,
  setFavorite,
  type Product,
} from "../lib/products.server";

/**
 * Auth middleware: require an authenticated user for this route. Runs on the
 * server before the loader/action. When no user is present we redirect to the
 * login page, otherwise we stash the user in the router context so the loader
 * can read it without re-parsing the request.
 */
export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }, next) => {
    const user = getUserFromRequest(request);
    if (!user) {
      const url = new URL(request.url);
      const redirectTo = url.pathname + url.search;
      throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
    context.set(userContext, user);
    return next();
  },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const products = listProducts(q);
  return { user, q, products };
}

export function meta({ data }: Route.MetaArgs) {
  const count = data?.products.length ?? 0;
  const q = data?.q ?? "";

  const title = q
    ? `「${q}」の検索結果（${count}件）| 商品一覧`
    : `商品一覧（${count}件）`;
  const description = q
    ? `「${q}」に一致する商品が${count}件見つかりました。`
    : `全${count}件の商品を取り扱っています。お気に入りの商品を見つけましょう。`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const id = String(formData.get("id") ?? "");
  const favorite = formData.get("favorite") === "true";

  const product = setFavorite(id, favorite);
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  return { id: product.id, favorite: product.favorite };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { products, q } = loaderData;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">商品一覧</h1>

      <Form method="get" role="search" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="商品を検索..."
          aria-label="商品を検索"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          検索
        </button>
      </Form>

      {products.length === 0 ? (
        <p className="text-gray-500">該当する商品が見つかりませんでした。</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </ul>
      )}
    </main>
  );
}

function ProductRow({ product }: { product: Product }) {
  const fetcher = useFetcher<typeof action>();

  // Optimistic UI: while a toggle is in flight, reflect the submitted value
  // immediately instead of waiting for the server response.
  const favorite = fetcher.formData
    ? fetcher.formData.get("favorite") === "true"
    : product.favorite;

  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="font-medium">{product.name}</p>
        <p className="text-sm text-gray-500">{product.description}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          ${product.price}/mo
        </p>
      </div>

      <fetcher.Form method="post">
        <input type="hidden" name="id" value={product.id} />
        {/* Submit the desired next state (the opposite of the current one). */}
        <input type="hidden" name="favorite" value={String(!favorite)} />
        <button
          type="submit"
          aria-pressed={favorite}
          aria-label={
            favorite ? "お気に入りから削除" : "お気に入りに追加"
          }
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            favorite
              ? "border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-950"
              : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
          }`}
        >
          {favorite ? "★ お気に入り" : "☆ お気に入りに追加"}
        </button>
      </fetcher.Form>
    </li>
  );
}
