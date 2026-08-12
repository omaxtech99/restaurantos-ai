# API Foundation

## Conventions

- REST under `/api/v1`
- Modular NestJS monolith
- DTO validation on every endpoint
- Standard response envelope
- Centralized error handling
- Structured logging
- Swagger / OpenAPI
- Health checks (process, database, Redis)

## Response envelope

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "error": null
}
```

## Error envelope

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "details": null
  }
}
```
