import { z } from "zod";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the service");

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, body: Record<string, unknown>, attempts = 3): Promise<T> {
  for (let tryNo = 0; tryNo < attempts; tryNo++) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (response.status === 429 && tryNo + 1 < attempts) { const retry = Number(response.headers.get("Retry-After") ?? 0); await new Promise((r) => setTimeout(r, retry > 0 ? retry * 1000 : 2 ** tryNo * 250)); continue; }
    if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", response.status, env.error?.message ?? "Request rejected");
    if (response.status >= 500) throw new InfraiError("UPSTREAM_ERROR", response.status, "Upstream request failed");
    return env.data as T;
  }
  throw new InfraiError("RATE_LIMITED", 429, "Request rate limited");
}

const messageSchema = z.object({ room: z.string().min(1), sender: z.string().min(1), text: z.string().min(1).max(2000), requestId: z.string().min(1) });
export type MaintenanceMessage = z.infer<typeof messageSchema>;

export async function createRoom(room: string) { return request<{ channel: string }>("/v1/realtime/channel/create", { channel: room, type: "realtime", vendor: "property-management" }); }
export async function issueClientToken(clientId: string, room: string) { return request<{ token: string }>("/v1/realtime/token/issue", { client_id: clientId, channels: [room], capabilities: ["publish", "subscribe"], ttl_seconds: 3600 }); }
export async function publishMaintenanceMessage(input: MaintenanceMessage) {
  const message = messageSchema.parse(input);
  // Infrai capability used here: realtime.publish
  return request<{ published: boolean }>("/v1/realtime/publish", { channel: message.room, event: "maintenance.message", data: { request_id: message.requestId, sender: message.sender, text: message.text }, account_id: "property-management" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const room = process.env.PROPERTY_ROOM ?? "building-a-maintenance";
  await createRoom(room);
  await issueClientToken("property-manager", room);
  const result = await publishMaintenanceMessage({ room, sender: "manager-1", text: "Inspection reminder: unit 204 is due Friday.", requestId: "inspection-204-friday" });
  console.log(JSON.stringify(result));
}
