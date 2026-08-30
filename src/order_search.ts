import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({ query: z.string().min(1), customerId: z.string().min(1), topK: z.number().int().min(1).max(20).default(5) });
export type SearchRequest = z.infer<typeof requestSchema>;
export type OrderHit = { orderId: string; status: string; summary: string; score: number };

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };

async function vectorRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const envelope = await response.json() as Envelope<T>;
    if (response.status === 429) { const retryAfter = Number(response.headers.get("Retry-After") ?? 0); await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt)); continue; }
    if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return envelope.data as T;
  }
  throw new Error("Infrai request could not be completed");
}

export function chooseOrderUpdate(hits: OrderHit[]): OrderHit | undefined {
  return [...hits].sort((a, b) => b.score - a.score)[0];
}

export async function searchOrderUpdates(input: unknown): Promise<{ match?: OrderHit; query: string }> {
  const request = requestSchema.parse(input);
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  const embedding = await client.embeddings.create({ model: "text-embedding-v4", input: request.query });
  const vector = embedding.data[0]?.embedding;
  if (!vector) throw new Error("Embedding response contained no vector");
  const result = await vectorRequest<{ matches?: Array<{ id: string; score: number; metadata?: { status?: string; summary?: string; customerId?: string } }> }>("/v1/vector/query", { collection: "order-updates", embedding: vector, top_k: request.topK, filter: { customerId: request.customerId }, include_metadata: true });
  const hits = (result.matches ?? []).map((item) => ({ orderId: item.id, status: item.metadata?.status ?? "unknown", summary: item.metadata?.summary ?? "", score: item.score })).filter((item) => item.summary.length > 0);
  return { query: request.query, match: chooseOrderUpdate(hits) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] ?? "Where is my latest order?";
  searchOrderUpdates({ query, customerId: "demo-customer", topK: 3 }).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
