# Backend Engineering Guidelines

## 1. Project Overview

This directory contains the backend API built with Node.js, Express, TypeScript, and PostgreSQL.

The backend should be maintainable, secure, easy to test, and straightforward to extend.

### Core principles

- Prefer simple, explicit code over unnecessary abstractions.
- Organize code by feature, with clear separation between layers.
- Keep HTTP handling, business logic, and database access separate.
- Follow existing project conventions before introducing new ones.
- Avoid overengineering and premature optimization.
- Do not introduce Domain-Driven Design (DDD), CQRS, event sourcing, microservices, or additional architectural layers unless explicitly requested.
- Do not rewrite working code or refactor unrelated modules when completing a focused task.

## 2. Project Structure

Organize backend code by feature.

Preferred structure:

```text
backend/
├── src/
│   ├── modules/
│   │   ├── users/
│   │   │   ├── users.routes.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.validation.ts
│   │   │   └── users.types.ts
│   │   ├── products/
│   │   └── orders/
│   ├── middleware/
│   ├── config/
│   ├── database/
│   ├── shared/
│   ├── app.ts
│   └── server.ts
├── tests/
├── migrations/
├── package.json
├── tsconfig.json
└── AGENTS.md
```

This is a guideline, not a requirement to create every file or folder. Adapt it to the existing project structure and database tooling.

Use `shared/` only for genuinely reusable functionality. Keep feature-specific code inside its corresponding module.

## 3. Architecture and Layer Responsibilities

Follow this request flow:

`Routes → Controllers → Services → Repositories → PostgreSQL`

### Routes

- Define HTTP endpoints and attach middleware.
- Connect routes to their corresponding controllers.
- Do not implement business logic or database queries in route files.

### Controllers

- Handle HTTP requests and responses.
- Read validated request input and invoke the appropriate service.
- Set appropriate HTTP status codes and response formats.
- Do not contain SQL queries, ORM calls, or substantial business logic.
- Do not pass Express `Request` or `Response` objects into services.

### Services

- Contain business operations and application-level orchestration.
- Enforce relevant business rules.
- Coordinate repositories and other required services.
- Do not depend on Express-specific types.
- Use transactions when an operation requires multiple database changes to succeed or fail atomically.
- Avoid generic services that combine unrelated features.

### Repositories

- Encapsulate database queries and persistence details.
- Use the database library or ORM already adopted by the project.
- Return data in a format appropriate for the service layer.
- Do not contain HTTP behavior or unrelated business decisions.
- Avoid unnecessary repository interfaces or generic repository abstractions.

### Middleware

- Handle cross-cutting HTTP concerns such as authentication, authorization, request logging, and error handling.
- Keep middleware focused on one responsibility.
- Do not use middleware as a substitute for business logic.

### Application startup

- Keep Express configuration in `app.ts`.
- Keep server startup and shutdown logic in `server.ts`.
- Keep environment configuration and database initialization in dedicated modules.
- Avoid creating database connections repeatedly during individual requests.

## 4. TypeScript Conventions

- Use TypeScript with strict type checking where supported by the existing configuration.
- Avoid `any`. Prefer explicit types, `unknown`, type guards, and proper validation.
- Define types and DTOs where they improve clarity or separate external input from internal data.
- Avoid duplicating types that can be derived safely from an existing source of truth.
- Prefer named exports unless the project already follows a consistent alternative.
- Use `async`/`await` for asynchronous code.
- Handle rejected promises and errors explicitly.
- Avoid non-null assertions and type casts when a safer alternative is available.
- Do not add types, interfaces, classes, or abstractions that provide no practical value.

## 5. Express API Conventions

- Use RESTful HTTP conventions consistent with the existing API.
- Keep endpoint naming, response shapes, and status codes consistent.
- Validate request bodies, path parameters, and query parameters at the HTTP boundary.
- Use the validation library already installed in the project. If none exists, propose an appropriate option before adding a dependency.
- Treat all client input as untrusted.
- Use centralized error-handling middleware.
- Return consistent, safe error responses.
- Never expose stack traces, secrets, database internals, or sensitive user data in production responses.
- Implement authentication and authorization where required.
- Authentication identifies the caller; authorization determines whether they can perform the requested action.
- Do not trust client-supplied user IDs, roles, prices, totals, or permission claims without verifying them against trusted data.
- Keep API documentation updated when the project uses OpenAPI or another API documentation system.

## 6. PostgreSQL and Database Access

- Use the PostgreSQL client, ORM, or query builder already established by the project.
- Do not introduce a second database access library without a clear reason.
- Use parameterized queries. Never concatenate untrusted input into SQL statements.
- Use transactions when multiple writes must remain consistent.
- Keep schema changes in version-controlled migrations using the existing migration workflow.
- Never modify production data or run destructive database commands without explicit authorization.
- Avoid `SELECT *` when retrieving only a subset of columns is sufficient.
- Consider appropriate indexes for frequently filtered, joined, or sorted columns.
- Avoid N+1 query patterns and unnecessary repeated database calls.
- Handle database constraints and common persistence failures appropriately.
- Use database constraints to enforce important data integrity requirements where appropriate.
- Do not expose database-specific records as public API response objects without considering the API contract.
- Keep database connection settings in environment configuration.
- Never commit database passwords, credentials, or connection strings containing secrets.

## 7. Validation and Error Handling

- Validate external input before performing business operations.
- Keep input validation separate from database persistence.
- Use meaningful application errors for expected conditions, such as a missing resource, duplicate record, or invalid operation.
- Map known errors to appropriate HTTP status codes.
- Use `400` for invalid requests, `401` for unauthenticated requests, `403` for forbidden operations, `404` for missing resources, and `409` for conflicts when appropriate.
- Do not return `500` for expected validation or business-rule failures.
- Do not silently swallow errors.
- Log unexpected errors with sufficient diagnostic context, while avoiding tokens, passwords, and sensitive personal data.

## 8. Security

- Never hardcode secrets or commit `.env` files containing credentials.
- Validate and normalize user input where appropriate.
- Use secure password hashing for stored passwords; never store plaintext passwords.
- Use parameterized database queries.
- Enforce authorization on protected operations and resource access.
- Apply sensible request-size limits and rate limits where appropriate.
- Configure CORS explicitly according to the application's requirements.
- Use secure cookie and session settings if cookies or sessions are used.
- Avoid logging secrets, authentication tokens, passwords, or sensitive payloads.
- Do not weaken security controls to make a test pass.
- Follow the existing dependency update and vulnerability-management practices.

## 9. Testing

- Follow the existing test framework and test organization.
- Write unit tests for meaningful service behavior and business rules.
- Test API behavior, validation, authentication, authorization, and error responses where relevant.
- Use integration tests for important database behavior, migrations, constraints, and transactions.
- Add regression tests for bug fixes when practical.
- Keep tests deterministic and independent of production services or production credentials.
- Use test doubles when they simplify isolated unit tests, but do not mock away the behavior an integration test is intended to verify.
- Never remove or weaken tests simply to make an implementation pass.
- Update tests when behavior intentionally changes.

## 10. Dependencies and Configuration

- Inspect `package.json`, `tsconfig.json`, and relevant project configuration before making changes.
- Reuse existing dependencies and utilities where practical.
- Add a dependency only when it provides clear value.
- Do not upgrade packages, change the module system, or alter build tooling as part of an unrelated task.
- Validate required environment variables during application startup.
- Keep configuration centralized and typed where practical.
- Provide safe defaults only for non-sensitive settings where doing so is appropriate.
- Document new environment variables and update the example environment file without real credentials.

## 11. Code Change Workflow

Before making changes:

1. Inspect the relevant implementation, tests, types, and call sites.
2. Understand the existing conventions and identify the appropriate layer.
3. Determine whether the change affects API contracts, database schemas, migrations, or security.
4. Make the smallest complete change that solves the requested problem.

While implementing:

1. Keep changes within the relevant feature whenever possible.
2. Preserve existing behavior unless a change is explicitly required.
3. Update types, validation, tests, and documentation when affected.
4. Avoid unrelated refactoring and speculative abstractions.
5. Never invent existing APIs, scripts, database tables, or environment variables; inspect the project first.

After implementing:

1. Run relevant tests.
2. Run the existing lint and type-check commands when available.
3. Verify affected migrations and database queries when applicable.
4. Review the diff for unintended changes, security issues, and broken architectural boundaries.
5. Summarize what changed and report which checks ran and whether they passed.

If a check cannot be run, state that clearly rather than claiming success.

## 12. Definition of Done

A backend change is complete when:

- It solves the requested problem.
- Responsibilities remain in the correct layers.
- Input validation and error handling are appropriate.
- Database changes are safe and migrations are included when required.
- Relevant tests are added or updated.
- Available quality checks have been run and their results reported.
- No unrelated changes or secrets are included.
- Any important assumptions or remaining limitations are documented.

## 13. Final Priority

When instructions conflict, prioritize:

1. Explicit instructions for the current task.
2. Existing project conventions and documented behavior.
3. These backend guidelines.
4. General best practices.

Prefer code that is easy for another developer to understand, test, debug, and maintain.
