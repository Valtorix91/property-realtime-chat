import assert from "node:assert/strict";
import { publishMaintenanceMessage } from "./property_chat.ts";

process.env.INFRAI_API_KEY ??= "test-key";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_input, init) => {
  const body = JSON.parse(String(init?.body));
  assert.equal(body.event, "maintenance.message");
  assert.equal(body.data.request_id, "req-1");
  return new Response(JSON.stringify({ ok: true, data: { published: true }, metadata: {} }), { status: 200 });
};
const result = await publishMaintenanceMessage({ room: "building-a", sender: "tenant-7", text: "Leaking tap", requestId: "req-1" });
assert.equal(result.published, true);
globalThis.fetch = originalFetch;
console.log("publish boundary test passed");
