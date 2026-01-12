# Login Network Error Troubleshooting

If you see "Network Error" on the Login page, it usually means the browser blocked the request due to CORS or the frontend is served from a different origin than the backend expects.

## Fix
1. Backend now supports multiple allowed origins via `CORS_ORIGINS` env var.
2. Set it to include where your frontend runs, e.g.:

```
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost
```

Then restart the backend.

## Why
- Your backend previously allowed only `http://localhost:3000`.
- If you open the app via XAMPP/Apache (e.g., `http://localhost` or `http://localhost:8080`), the browser blocks requests to `http://localhost:3001` because the origin isn't in the CORS allowlist.

## Verify
Run these checks:

```
# Backend reachable
Invoke-WebRequest -Uri http://localhost:3001/api/login -Method POST -Body '{"email":"x","password":"y"}' -ContentType application/json

# Frontend origin
# Ensure your browser address bar is one of the origins listed in CORS_ORIGINS.
```

