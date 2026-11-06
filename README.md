# Portfolio Activity

Share your coding habits with the public. Great for bragging on your portfolio site.

`portfolio-activity` serves read-only API endpoints to expose your coding activity and a component to display it.

## Getting started

Deploy portfolio-activity alongside your Pi agent, git repo, or project directory.

```sh
# TODO: how to start an instance
docker run --rm -p 3000:3000 portfolio-activity
```

### Environment Variables

Configure portfolio-activity's environment and behavior.

- `PORT` - port to listen on (default `3000`)
- `HOST` - host to bind (default `0.0.0.0`)
- `PI_CODING_AGENT_DIR` - Pi config directory, where sessions/ are found. (default `~/.pi/agent`)
- `PI_CODING_AGENT_SESSION_DIR` - Pi session storage directory. Overrides `PI_CODING_AGENT_DIR`
- `PORTFOLIO_ACTIVITY_PROJECT_DIR` - directory containing project directories for Git and filesystem activity. These sources are skipped when this is unset.

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
