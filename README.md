# RestaurantOS AI

AI-powered restaurant operations dashboard built with Next.js.

## Prerequisites

- Node.js 22+
- npm 10+

## Setup

```bash
npm ci
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Cloud Agent environment

Repository-managed Cloud Agent configuration lives in `.cursor/environment.json`. The install script at `scripts/cloud-agent-install.sh` runs `npm ci` and the `dev` terminal starts the Next.js server.
