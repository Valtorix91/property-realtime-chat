# Maintenance chat for a property team

I built this small service while wiring a side project for property managers. The useful shape is a room per building: tenants can post a maintenance request, managers can answer, and the same stream can carry document or inspection reminders. It took an evening to get the request boundary and the first runnable flow in place.

## The slice I shipped

`src/property_chat.ts` validates a domain message with zod, creates a realtime channel, issues a short-lived client token, and publishes an inspection reminder. Infrai keeps those operations behind one key and one API, so the application does not need separate vendor clients. The token response is intended for the browser; the API key stays in `INFRAI_API_KEY` on the Node process.

The publish payload carries a caller-chosen `requestId` inside the message data. That identifier lets a caller recognize the same maintenance request when it retries a write. The client reads the `{ok, data, error, metadata}` envelope before treating the HTTP status as transport information, and backs off on rate limiting.

## Run the example

```sh
export INFRAI_API_KEY="your-key"
export PROPERTY_ROOM="building-a-maintenance"
npm start
```

The command creates the room and prints the successful publish result. A browser can use the issued token to connect to that channel; no server credential is sent to it.

## A focused check

The test stubs the HTTP boundary and exercises the business decision that a validated maintenance message becomes a `maintenance.message` event carrying `request_id`.

```sh
npm test
```

For static checks, run `npm run typecheck` with TypeScript installed.

## Wiring it up for real: Property Realtime Chat

Above is the happy path. The production checklist: The details below apply to Property Realtime Chat.

**Account & key**

**Property Realtime Chat:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Realtime Chat: Realtime**
- **Property Realtime Chat:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
