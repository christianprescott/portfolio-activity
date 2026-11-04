# Pi Activity

Share your coding habits with the public. Great for bragging on your portfolio site.

`pi-activity` serves read-only API endpoints to expose your coding activity and a component to display it.

## Getting started

Deploy pi-activity alongside your Pi agent, git repo, or project directory.

```sh
# TODO: how to start an instance
docker run --rm -p 3000:3000 pi-activity
```

### Environment Variables

Configure pi-activity's environment and behavior.

- `PORT` - port to listen on (default `3000`)
- `HOST` - host to bind (default `0.0.0.0`)
- `PI_CODING_AGENT_DIR` - Pi config directory, where sessions/ are found. (default `~/.pi/agent`)
- `PI_CODING_AGENT_SESSION_DIR` - Pi session storage directory. Overrides `PI_CODING_AGENT_DIR`

## Development

Start the web server and the component dev server. Visit the app root to preview the component UI.

```sh
docker compose up --build
open http://localhost:3000
```

### Component dev server

The `dev` service runs esbuild in watch mode with live reload on port 8000. It serves `public/` and the bundle at `/dist/pi-activity.js`, built in memory. Port 3000 serves the production build from the image.

```sh
open http://localhost:8000
```

esbuild only accepts the `Host` header `localhost`, or the name given to `--serve`. To use another hostname, set `DEV_HOST` and map the name to `0.0.0.0` in `docker-compose.override.yml`:

```yaml
services:
  dev:
    environment:
      DEV_HOST: dev.example.test
    extra_hosts:
      - 'dev.example.test:0.0.0.0'
```

Pages served from port 8000 need the `src` attribute to reach the API, for example `<pi-activity src="http://localhost:3000">`.

### Tests

```sh
docker compose run --rm pi-activity npm test
```

