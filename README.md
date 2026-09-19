# AI Chat Commerce Sample

Cloudflare Workers AI・Stripe Search API・Vercel AI SDK を組み合わせた、
AIチャットコマースのサンプルアプリです。React Router (framework mode) 上に
チャットUIとチャットAPIを実装しています。

## 使っている技術

- **接客LLM**: [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) の
  [`@cf/openai/gpt-oss-120b`](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/)
  (gpt-oss)。OpenAI Chat Completions 互換エンドポイント
  (`/ai/v1/chat/completions`) 経由で [Vercel AI SDK](https://ai-sdk.dev/) の
  `streamText` から呼び出しています。
- **商品検索**: [Stripe Search API](https://docs.stripe.com/search)
  (`products.search`)。gpt-oss が Stripe Search Query Language でクエリを組み立て、
  ツール呼び出しとして実行します。
- **購入アシスト**: [`typesafe/jev`](https://developers.cloudflare.com/ai/models/typesafe/jev/)
  (Workers AI 上の構造化評価モデル)。会話の文脈から購入意欲スコアと
  人間の担当者へのエスカレーション要否を評価します。ネイティブの
  Workers AI Run エンドポイント (`/ai/run/typesafe/jev`) を直接叩いています。

## アーキテクチャ

```
app/routes/home.tsx        チャットUI (@ai-sdk/react の useChat)
app/routes/api.chat.ts     チャットAPI (streamText + tools)
app/lib/workers-ai.server.ts  Workers AI provider / jev評価ヘルパー
app/lib/stripe.server.ts      Stripe Search API ラッパー
app/lib/chat-tools.server.ts  searchProducts / assessPurchaseIntent ツール定義
scripts/seed-products.ts      サンプル商品をStripeへ投入するスクリプト
```

商品検索・購入意欲評価はいずれも LLM から呼び出せる「ツール」として実装しており、
gpt-oss が会話の流れに応じて自律的に呼び出します。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` に以下を設定してください。

| 変数 | 取得方法 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare ダッシュボード右サイドバー、または `wrangler whoami` |
| `CLOUDFLARE_API_TOKEN` | ダッシュボード > My Profile > API Tokens > "Workers AI" テンプレートで発行 (Account > Workers AI > Read 権限が必要) |
| `STRIPE_SECRET_KEY` | Stripe ダッシュボード > Developers > API keys。RAK (制限付きキー) を推奨 |
| `CHAT_MODEL_ID` (任意) | 既定は `@cf/openai/gpt-oss-120b`。軽量な `@cf/openai/gpt-oss-20b` にも変更可 |

`npm run dev` / `npm run build` は React Router の Vite プラグインが `.env` を
自動的に読み込みます。本番実行 (`npm start`, Docker 等) では、デプロイ先の
環境変数機能でこれらを設定してください。

### 3. サンプル商品の投入 (任意)

Stripe アカウントにサンプル商品が無い場合、以下でシードできます。

```bash
npm run seed
```

Stripe Search API のインデックス反映には数十秒〜1分ほどかかることがあります。
投入直後は検索結果が空になる場合があるので、少し待ってから試してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

`http://localhost:5173` でチャットUIが開きます。

## ビルド・型チェック

```bash
npm run typecheck
npm run build
```

## Docker デプロイ

```bash
docker build -t ai-chat-commerce-sample .
docker run -p 3000:3000 \
  -e CLOUDFLARE_ACCOUNT_ID=... \
  -e CLOUDFLARE_API_TOKEN=... \
  -e STRIPE_SECRET_KEY=... \
  ai-chat-commerce-sample
```

## 注意事項

- これはサンプル実装です。決済フロー (Checkout Session 等) は含まれておらず、
  商品の検索とレコメンド、購入意欲の可視化までを扱います。
- `typesafe/jev` はサードパーティ (TypeSafe) のモデルです。利用条件は
  [TypeSafe の利用規約](https://docs.typesafe.ai/legal.md) を参照してください。
- gpt-oss や jev の応答内容はモデルの推論結果であり、実際の在庫・決済可否を
  保証するものではありません。
