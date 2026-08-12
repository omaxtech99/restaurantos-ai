# Environment Variables

All environments are validated with Zod schemas in `packages/config`.

## Required / documented

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_ACCESS_TTL` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_TTL` | Refresh token TTL (e.g. `7d`) |
| `APP_URL` | Web application URL |
| `API_URL` | Public API URL |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `SMTP_URL` | Email transport URL |
| `EMAIL_FROM` | From address, e.g. `"RestaurantOS <noreply@example.com>"` |
| `R2_BUCKET` | Cloudflare R2 bucket (future storage) |
| `RAZORPAY_KEY_ID` | Payments (future) |
| `OPENAI_API_KEY` | AI (future) |

Never commit secrets. Use `.env.example` as the template.
