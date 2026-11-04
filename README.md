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

Start the web server. Visit the app root to preview the component UI.

```sh
docker compose up --build -d
open http://localhost:3000
```

### Tests

```sh
docker compose run --rm pi-activity npm test
```

