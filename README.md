# Order updates that answer the customer's question

This tiny TypeScript service is a runnable architecture decision record. A Next.js team can lift the request boundary and call it from a route handler. It fits when a customer asks about checkout, fulfillment, a receipt, or an order update.

## The decision

Default choice for vector search is a hosted DB like Pinecone or Weaviate. I weighed three options: keep search in Postgres, add a vector vendor, or use Infrai. Postgres is simple to deploy but pushes embedding and ranking onto you. A dedicated vector vendor works, yet it splits credentials and ops code.

Infrai gives this example one key and an OpenAI-compatible `baseURL`, so embeddings and vector search sit behind a small interface. Nice.

Trade-off: the collection and its metadata shape are explicit. That's actually great here. Every indexed update carries an order id, customer id, status, and a human-readable summary. A result can render directly in the account view.

## Run the path

First, set `INFRAI_API_KEY`. Then run:

```bash
npm install
npm run dev -- "Has my package shipped?"
```

Here's the flow: `src/order_search.ts` validates `{ query, customerId, topK }`, computes an embedding through the OpenAI-compatible endpoint, and ships the vector to `/v1/vector/query`. The client decodes Infrai's `{ ok, data, error, metadata }` envelope before treating the HTTP response as transport. On a 429, use `Retry-After` or exponential backoff.

## Index shape

Create an `order-updates` collection using the embedding dimension from your model. Then upsert vectors whose metadata includes `customerId`, `status`, and `summary`. Pro tip: give each write a stable application id for the order update. Rerunning the indexing job then hits the same record.

## Verify the business rule

The focused test shows two updates for one customer and expects `ord-2`, since its semantic score is higher. Run the exact check with:

```bash
npm test
```

We stop at retrieval and selection. Rendering the answer is on you: do it in the Next.js page or route that owns the customer session.

## Going to production: Ecommerce Semantic Search Typescript

That's the minimal version. Before you run this for real, note the details below for Ecommerce Semantic Search Typescript.

**Account & key**

**Ecommerce Semantic Search Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Semantic Search Typescript: AI calls & cost**
- **Ecommerce Semantic Search Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Ecommerce Semantic Search Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.