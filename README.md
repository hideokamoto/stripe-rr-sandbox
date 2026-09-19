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
  (`products.search`)。
- **意図分類・レコメンド評価**: [`typesafe/jev`](https://developers.cloudflare.com/ai/models/typesafe/jev/)
  (Workers AI 上の構造化評価モデル)。ネイティブの Workers AI Run エンドポイント
  (`/ai/run/typesafe/jev`) を直接叩いています。

## なぜこの構成か (設計方針)

最初のバージョンは「gpt-oss にツールを持たせて、検索するかどうか・何を検索するか
を全部自律的に決めさせる」エージェント方式でした。しかしこれには実用上の弱点が
ありました。

- gpt-oss に Stripe Search Query Language (`~` / `:` / `AND`/`OR`混在不可 など)
  を毎回正しく書かせるのは壊れやすい。
- レコメンドの根拠(なぜその商品を勧めるか)が gpt-oss の主観に丸投げになる。
- 「架空の商品をでっち上げない」がプロンプトでの注意書き止まりで、構造的な
  歯止めになっていない。

そこで、検索・評価のステップを **gpt-oss の外に出し、決まった順序のパイプライン**
にしました。gpt-oss は「すでに検索・採点済みの実データ」だけを見て返事を書く、
最後の1ステップだけを担当します。

```
1. ユーザー入力からクエリを作る   … jev (Choice) がカテゴリ分類 → コードでクエリ組み立て
2. Stripe Search API で検索       … Stripe Search API (products.search)
3. 検索結果を評価してレコメンド   … jev (Score/Noul) が適合度と要エスカレーション判定
4. 返事をつくる                   … gpt-oss が、採点済みの実データだけを根拠に応答
```

jev の Choice/Score/Noul は「決まった選択肢・基準に対する確信度付きの評価」が
得意なモデルなので、1 (カテゴリという固定選択肢からの分類) と 3 (候補への適合度
採点) に使い、自由記述の応答生成 (4) は gpt-oss に任せています。

適合度スコアや「要エスカレーション」判定は **チャットUIには表示しません**。
ユーザーは自分に対する採点結果を見ても嬉しくないですし、実際に人間へ引き継ぐ
機能もまだ無いので、押しても何も起きないボタンを出すのは誠実ではありません。
これらは gpt-oss が返事の順序・言い回しを決めるための裏方シグナルとしてのみ
使っています。

## アーキテクチャ

```
app/routes/home.tsx                 チャットUI (@ai-sdk/react の useChat)
app/routes/api.chat.ts              チャットAPI (パイプライン実行 + gpt-ossの応答生成)
app/lib/shopping-assistant.server.ts  jevによるカテゴリ分類・適合度採点パイプライン
app/lib/stripe.server.ts              Stripe Search API ラッパー
app/lib/workers-ai.server.ts          Workers AI provider / jev REST呼び出し
app/lib/product-taxonomy.ts           商品カテゴリの定義 (分類器・シード両方で共有)
app/lib/chat-message.ts               チャットのUIメッセージ型 (商品カードのdata part)
scripts/seed-products.ts              サンプル商品をStripeへ投入するスクリプト
```

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
`app/lib/product-taxonomy.ts` のカテゴリ (`footwear` / `outerwear` /
`electronics` / `mobility`) を `metadata.category` として設定しており、
チャット側のカテゴリ分類もこの値を使います。

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

- これはサンプル実装です。決済フロー (Checkout Session 等) や実際の人間への
  引き継ぎ処理 (通知・チケット発行等) は含まれておらず、商品の検索・レコメンド
  までを扱います。
- 商品カテゴリの分類は `app/lib/product-taxonomy.ts` に定義した固定のカテゴリ
  (footwear / outerwear / electronics / mobility) の中から選ぶ方式です。
  どれにも当てはまらない要望は `active:'true'` のみの緩い検索にフォールバック
  します。
- `typesafe/jev` はサードパーティ (TypeSafe) のモデルです。利用条件は
  [TypeSafe の利用規約](https://docs.typesafe.ai/legal.md) を参照してください。
- gpt-oss や jev の応答内容はモデルの推論結果であり、実際の在庫・決済可否を
  保証するものではありません。
