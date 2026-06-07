import { data, Form, redirect } from "react-router";
import type { Route } from "./+types/login";
import { commitSession, getSession } from "~/sessions.server";

function safeRedirectTo(value: FormDataEntryValue | string | null): string {
  const target = typeof value === "string" ? value : "";
  // Only allow same-origin, absolute paths to avoid open-redirects.
  return target.startsWith("/") && !target.startsWith("//")
    ? target
    : "/products";
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const url = new URL(request.url);
  const redirectTo = safeRedirectTo(url.searchParams.get("redirectTo"));

  if (session.has("userId")) {
    throw redirect(redirectTo);
  }

  return data(
    { error: session.get("error"), redirectTo },
    { headers: { "Set-Cookie": await commitSession(session) } },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));

  // Demo auth: any non-empty email is accepted and used as the user id.
  if (!email) {
    session.flash("error", "メールアドレスを入力してください。");
    return redirect("/login", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  session.set("userId", email);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export function meta() {
  return [{ title: "ログイン" }];
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { error, redirectTo } = loaderData;

  return (
    <main className="container mx-auto p-4 max-w-sm">
      <h1 className="text-2xl font-bold mb-4">ログイン</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <Form method="post" className="flex flex-col gap-3">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <label className="flex flex-col gap-1">
          <span>メールアドレス</span>
          <input
            type="email"
            name="email"
            required
            className="border rounded px-3 py-2"
          />
        </label>
        <button type="submit" className="border rounded px-4 py-2">
          ログイン
        </button>
      </Form>
    </main>
  );
}
