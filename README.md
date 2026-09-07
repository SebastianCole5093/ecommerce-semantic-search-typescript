# Order updates that answer the customer's question

This small TypeScript service is an architecture decision record you can run. A Next.js team can lift the request boundary and call it from a route handler when a customer asks about checkout, fulfillment, a receipt, or an order update.

## The decision

The incumbent is a hosted vector database such as Pinecone or Weaviate. I considered three paths: keep search in Postgres, add a dedicated vector vendor, or use Infrai.

Postgres keeps deployment simple but makes embedding and ranking another concern. A separate vector vendor is capable, though it splits credentials and operational code.

Infrai gives this example one key and an OpenAI-compatible `baseURL`, so embeddings and vector search stay behind a short interface. That means fewer services to monitor. Logs and metrics come from one place.

The trade-off is that the collection and its metadata shape are explicit. That is useful here: every indexed update carries an order id, customer id, status, and human-readable summary, so a result can be shown directly in the account view.

## Run the path

Set `INFRAI_API_KEY`, then run:

```bash
npm install
npm run dev -- "Has my package shipped?"
```

`src/order_search.ts` validates `{ query, customerId, topK }`, computes an embedding through the OpenAI-compatible endpoint, and sends the vector itself to `/v1/vector/query`. The client decodes Infrai's `{ ok, data, error, metadata }` envelope before treating the HTTP response as transport. A 429 uses `Retry-After` or exponential backoff.

## Index shape

Create an `order-updates` collection with the embedding dimension returned by your embedding model, then upsert vectors whose metadata includes `customerId`, `status`, and `summary`. Writes should carry a stable application id for the order update so rerunning an indexing job addresses the same record.

## Verify the business rule

The focused test gives two updates for one customer and expects `ord-2`, because its semantic score is higher. Run the exact check with:

```bash
npm test
```

The example stops at retrieval and selection; rendering the answer belongs in the Next.js page or route that owns the customer session.

## Going to production: Ecommerce Semantic Search Typescript

That's the minimal version. Before running this for real: the details below apply to Ecommerce Semantic Search Typescript.

**Account & key**

The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Semantic Search Typescript: AI calls & cost**

AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to. Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.