import assert from "node:assert/strict";
import { chooseOrderUpdate } from "../src/order_search.js";

const selected = chooseOrderUpdate([{ orderId: "ord-1", status: "packed", summary: "Packed", score: 0.71 }, { orderId: "ord-2", status: "shipped", summary: "Shipped", score: 0.89 }]);
assert.equal(selected?.orderId, "ord-2");
console.log("order update decision: highest semantic score wins");
