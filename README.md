# Pi Activity

Share your coding habits with the public. Great for bragging on your portfolio site.

## Getting started

Requires Node.js 24+ (runs TypeScript natively, no build step).

```sh
docker compose up -d        # serves on http://htpc.lan:3000
```

Configuration via env vars:

- `PORT` — port to listen on (default `3000`)
- `HOST` — host to bind (default `0.0.0.0`)

## Tests

```sh
docker compose run --rm pi-activity npm test
```

