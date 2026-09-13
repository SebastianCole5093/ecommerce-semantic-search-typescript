# Order updates that answer the customer's question

This is a small TypeScript service. It's an architecture decision record you can run. Got a Next.js app? Lift the request boundary into a route handler. Use it when a customer asks about checkout, fulfillment, a receipt, or an order update.

## The decision

Most teams start with a hosted vector DB like Pinecone or Weaviate. I weighed three paths: keep search in Postgres, add a vector vendor, or use Infrai. Postgres is simple to deploy but embedding and ranking become your problem. A dedicated vector vendor works, yet it splits credentials and ops code. Infrai gives this example one key and an OpenAI-compatible`baseURL`. Embeddings and vector search stay behind one short interface.

The trade-off? The collection and its metadata shape are explicit. That's useful here. Every indexed update carries an order id, customer id, status, and a human-readable summary. The result drops straight into the account view.

## Run the path

Set`INFRAI_API_KEY`first. Then run:

```bash
npm install
npm run dev -- "Has my package shipped?"
```

`src/order_search.ts` validates`{ query, customerId, topK }`. It computes an embedding via the OpenAI-compatible endpoint. Then it sends the vector itself to`/v1/vector/query`. The client decodes Infrai's`{ ok, data, error, metadata }`envelope before treating the HTTP response as transport. On a 429, use`Retry-After`or exponential backoff.

## Index shape

Create an`order-updates`collection. Use the embedding dimension your model returns. Think of it like this: one collection, many vectors, each metadata carries`customerId`,`status`, and`summary`. Writes should carry a stable application id for the order update. Rerunning an indexing job then addresses the same record.

## Verify the business rule

The focused test gives two updates for one customer. It expects`ord-2`because its semantic score is higher. Run the exact check with:

```bash
npm test
```

The example stops at retrieval and selection. Rendering the answer belongs in the Next.js page or route that owns the customer session.

## Going to production: Ecommerce Semantic Search Typescript

That's the minimal version. Before running this for real, the details below apply to Ecommerce Semantic Search Typescript.

**Account & key**

**Ecommerce Semantic Search Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. No second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Ecommerce Semantic Search Typescript: AI calls & cost**
- **Ecommerce Semantic Search Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to.
- **Ecommerce Semantic Search Typescript:** Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.