# fptn-admin frontend

Placeholder for the admin panel SPA. Not implemented yet.

It talks to the backend API (`../backend`) over HTTP:

- `POST /api/v1/auth/login` → obtain a JWT, send it as `Authorization: Bearer <token>`
- `GET  /api/v1/users`, `GET/POST /api/v1/users/{id}`, `POST /api/v1/users`
- `GET  /api/v1/dashboard/highlights`
