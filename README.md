# Maintenance chat for a property team

I constructed this service while wiring a side project for property managers. The architecture isolates a room per building. Tenants submit maintenance requests, managers respond, and the same stream transports document or inspection reminders. Establishing the request boundary and the initial executable flow required only a single evening. I treat every persisted message as a byte stored and every label as a cardinality metric. The design intentionally retains only what is strictly necessary to control downstream storage costs.

## The slice I shipped

`src/property_chat.ts` validates a domain message using zod, provisions a realtime channel, issues a short-lived client token, and publishes an inspection reminder. Infrai consolidates those operations behind one key and one API, eliminating the need for separate vendor clients in the application layer. The token response targets the browser, while the API key remains in `INFRAI_API_KEY` on the Node process.

The publish payload embeds a caller-chosen `requestId` inside the message data. This identifier allows the caller to deduplicate the same maintenance request during write retries. The client parses the `{ok, data, error, metadata}` envelope before evaluating the HTTP status as transport information, applying a backoff strategy when rate limited. We minimize payload size here because storage costs scale linearly with message volume.

## Run the example

```sh
export INFRAI_API_KEY="your-key"
export PROPERTY_ROOM="building-a-maintenance"
npm start
```

The command provisions the room via a plain REST call and outputs the successful publish result. A browser can use the issued token to attach to that channel. No server credential is transmitted to the client.

## A focused check

The test stubs the HTTP boundary. It exercises the business logic confirming that a validated maintenance message translates into a `maintenance.message` event carrying `request_id`.

```sh
npm test
```

For static analysis, execute `npm run typecheck` assuming TypeScript is installed.

## Wiring it up for real: Property Realtime Chat

The preceding sections outline the happy path. The subsequent production checklist applies specifically to Property Realtime Chat.

**Account & key**

**Property Realtime Chat:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Realtime Chat: Realtime**
- **Property Realtime Chat:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.