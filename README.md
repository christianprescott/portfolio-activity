# Portfolio Activity

Share your coding habits with the public. Great for bragging on your portfolio site.

`portfolio-activity` serves read-only API endpoints to expose your coding activity and a component to display it.

## Getting started

Deploy portfolio-activity alongside your Pi agent, git repo, or project directory.

```sh
docker run --rm --name portfolio-activity -p 3000:3000 \
  -v /path/to/your/projects:/workspace:ro \
  -v ~/.pi/agent:/data/.pi/agent:ro \
  -e PORTFOLIO_ACTIVITY_PROJECT_DIR=/workspace \
  -e PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS=https://yourdomain.example \
  -e PI_CODING_AGENT_DIR=/data/.pi/agent \
  ghcr.io/christianprescott/portfolio-activity:latest
```

Then load the custom element on your page and configure it for your host:

```html
<head>
  <script type="module" src="https://yourdomain.example/dist/portfolio-activity.js"></script>
</head>
<body>
  <portfolio-activity count="4" displayName="Christian" />
</body>
```

### Environment Variables

Configure portfolio-activity's environment and behavior.

- `PORT` - port to listen on (default `3000`)
- `HOST` - host to bind (default `0.0.0.0`)
- `PI_CODING_AGENT_DIR` - Pi config directory, where sessions/ are found. (default `~/.pi/agent`)
- `PI_CODING_AGENT_SESSION_DIR` - Pi session storage directory. Overrides `PI_CODING_AGENT_DIR`
- `PORTFOLIO_ACTIVITY_PROJECT_DIR` - directory containing project directories for Git and filesystem activity. These sources are skipped when this is unset.
- `PORTFOLIO_ACTIVITY_ALLOWED_ORIGINS` - optional semicolon-separated list of exact origins allowed to load the component module and access the API from a browser (for example, `https://portfolio.example;https://another.example`). Whitespace around each origin is trimmed. Leave unset to disable cross-origin access. Do not include paths or trailing slashes. Quote the value when setting it in a shell, since an unquoted semicolon ends a shell command.

## Development

Start the web server and the frontend dev server. Visit the app root to preview the component UI.

```sh
docker compose up --build
open http://localhost:3000
```

### esbuild

An unconventional method is used to serve dev mode assets from the same host as the server: two esbuild processes run, one to write changes to disk and one to serve the EventSource after build.

To enable live reload on a named host you'll need to set the DEV_HOST variable:

```yaml
services:
  dev:
    environment:
      DEV_HOST: dev.example.test
    extra_hosts:
      - 'dev.example.test:0.0.0.0'
```

### Tests

Tests are currently entirely AI generated and I make no claimes to their effectiveness.

```sh
docker compose run --rm app npm test
```
