# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Agent Chat (`/chat`)

An MCP-enabled agent chat built with the Vercel AI SDK, all running on
Cloudflare Workers AI:

- **Judgment layer**: [`typesafe/jev`](https://developers.cloudflare.com/ai/models/typesafe/jev/),
  a structured-decision model, decides whether the
  [Context7](https://context7.com) remote MCP server (up-to-date library
  docs) is needed to answer the user's message. It returns a calibrated
  `yes`/`no` choice rather than free text.
- **Response generation**: [`@cf/openai/gpt-oss-20b`](https://developers.cloudflare.com/workers-ai/models/)
  generates the actual reply, with Context7's MCP tools attached only when
  Jev says they're needed.

Both models are called over Cloudflare's REST API (no Workers runtime
required), so this still runs on the existing Node/Docker server. Copy
`.env.example` to `.env` and fill in:

- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` — required for both models.
- `CLOUDFLARE_AI_GATEWAY_ID` — required only for gpt-oss-20b, since
  `@cf/`-prefixed Workers AI models called through
  `/ai/v1/chat/completions` require an AI Gateway ID. `typesafe/jev` is a
  third-party model and routes through the account's default gateway
  automatically, so it doesn't need this.
- `CONTEXT7_API_KEY` — optional; Context7's remote MCP endpoint works
  without a key at a lower rate limit.

Relevant files: `app/lib/jev.server.ts`, `app/lib/mcp.server.ts`,
`app/lib/chat.server.ts`, `app/routes/api.chat.ts`, `app/routes/chat.tsx`.

> **Note**: this was implemented and typechecked/built successfully, but not
> exercised against a real Cloudflare account (no credentials were available
> in this environment), so the exact Jev `/ai/run` request shape and the
> `cf-aig-gateway-id` requirement are derived from Cloudflare's published
> docs, not confirmed against a live response. Verify with real credentials
> before relying on it in production.

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
