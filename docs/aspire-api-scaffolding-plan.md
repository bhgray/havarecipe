# Application Scaffolding Plan: Aspire + .NET 10 API

Scope: orchestrate local dependencies (database, cache) with Aspire, and stand up the API project. UI layer is deferred.

## 1. Orchestration: Aspire

As of early 2026 the toolkit ships as **Aspire 13**, aligned with the .NET 10 LTS release (it dropped the ".NET" prefix in branding and is now positioned as a multi-language orchestrator — C#, Python, TypeScript, Go — though our use is all .NET). It's the right tool for what you described: an **AppHost** project declares the resources your app depends on (Postgres, Redis, the API itself), Aspire pulls and runs them as Docker containers locally, wires up connection strings and service discovery automatically via environment variables, and gives you a local dashboard with logs, health, and distributed traces for every resource.

Solution shape:

```
HavaRecipe.sln
  /HavaRecipe.AppHost           - orchestration project (defines resources, references the API)
  /HavaRecipe.ServiceDefaults   - shared telemetry/health-check/resilience wiring
  /HavaRecipe.Api               - the .NET 10 Web API
  /HavaRecipe.Api.Tests         - integration tests
  /docs
```

The AppHost is a small `Program.cs`-style project (Aspire 13 also supports a single-file `apphost.cs` with no `.csproj`, if you want to start minimal). A Postgres + Redis + API setup looks roughly like:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume(); // persists data across container restarts

var recipeDb = postgres.AddDatabase("recipedb");

var cache = builder.AddRedis("cache");

builder.AddProject<Projects.HavaRecipe_Api>("api")
    .WithReference(recipeDb)
    .WithReference(cache);

builder.Build().Run();
```

Running the AppHost starts Postgres, Redis, pgAdmin, and the API together, opens the Aspire dashboard, and injects `ConnectionStrings__recipedb` / `ConnectionStrings__cache` into the API automatically — no manual container management or hardcoded connection strings.

## 2. Persistence: Postgres (container, via Aspire), not SQLite

You asked whether to use a database or something simpler for now. Given the goal is specifically to exercise Aspire's container orchestration, I'd recommend going straight to **PostgreSQL as an Aspire-managed container**, rather than starting with SQLite and migrating later. Reasoning:

- Aspire makes a real containerized Postgres essentially as low-friction as SQLite (`AddPostgres()` is one line), so the "simpler for now" option doesn't save much setup effort but does cost you a later migration.
- Postgres has native `jsonb` columns. Recipe data is naturally JSON-LD (schema.org `Recipe`) — storing the raw JSON-LD blob in a `jsonb` column alongside a handful of indexed relational columns (id, slug, name, created date) gives you flexible schema evolution without fighting a rigid relational model for every recipe field. EF Core + Npgsql supports mapping to `jsonb` directly.
- `AddPostgres().WithPgAdmin()` gives you a full web-based database browser wired into the Aspire dashboard automatically — which directly addresses your "visibility into data" requirement (see section 4).
- It's production-representative from day one, so there's no "swap the database later" migration risk once real usage patterns emerge.

If you want an even lighter starting point for the very first iteration (e.g., before you've written any endpoints), Aspire does have a first-party **SQLite hosting integration** — no container required, file-based, with an optional `WithSqliteWeb()` companion for a browser-based data viewer. It's a reasonable fallback if you'd rather defer Docker entirely for a week, but I'd treat it as a stepping stone, not the target — you'll want to swap to Postgres before real data modeling begins, since `jsonb` and concurrent-access behavior differ meaningfully between the two.

**Recommendation: Postgres via Aspire from the start.**

## 3. Caching

Add Redis the same way (`builder.AddRedis("cache")`), referenced from the API. No caching logic needs to be written yet — just get the resource declared and referenced so the AppHost topology reflects the target architecture, even if the API doesn't use it meaningfully until later.

## 4. API Project Structure

For a single API growing feature-by-feature, I'd recommend **Vertical Slice Architecture** over a traditional layered (Controllers / Services / Repositories) or Clean Architecture setup. Each feature — e.g., "create a recipe," "get a recipe by id" — owns its endpoint, request/response contracts, validation, and data access together in one place, rather than being spread across separate layers. This keeps early development fast (no ceremony of interfaces/abstractions for a single implementation) and scales reasonably as features are added, since slices are independent of each other by design. It pairs naturally with .NET 10 minimal APIs.

Suggested structure inside `HavaRecipe.Api`:

```
HavaRecipe.Api/
  Program.cs                      - builds app, registers DbContext, maps endpoint groups
  Data/
    RecipeDbContext.cs
    Migrations/
  Features/
    Recipes/
      CreateRecipe.cs              - request/response records + minimal API endpoint + handler
      GetRecipe.cs
      ListRecipes.cs
  Shared/
    Endpoints.cs                   - route group registration helpers
    Errors.cs                      - shared problem-details/error shaping
```

Each `Feature` file typically contains the endpoint delegate, its request/response DTOs, and a small handler method that talks to `RecipeDbContext` directly — no repository abstraction needed at this scale. Cross-cutting concerns (validation, mapping) can be split into companion files (`CreateRecipe.Validator.cs`) if a slice grows large, but avoid introducing that ceremony before it's needed.

## 5. Visibility Into Data / Testing API Calls

A few pieces line up to give you exactly the kind of visibility you're asking for:

**API exploration**: .NET 10 dropped Swagger/Swashbuckle from the default templates in favor of the built-in `Microsoft.AspNetCore.OpenApi` package, which generates an OpenAPI 3.1 document natively (including Native AOT support). For an interactive UI on top of it, add `Scalar.AspNetCore` — it serves a modern API explorer at `/scalar` where you can browse and execute endpoints directly against the running API, similar to what Swagger UI used to provide.

**Database browsing**: `WithPgAdmin()` on the Postgres resource gives you a full pgAdmin web UI, automatically pointed at your container, reachable from a link in the Aspire dashboard. You can inspect tables, run ad hoc queries, and watch data change as you exercise the API — no separate DB client setup needed.

**Request/response tracing**: The Aspire dashboard itself shows structured logs and distributed traces for every request across the API, Postgres, and Redis, correlated by request — useful for seeing exactly what a given API call did without attaching a debugger.

**Scripted requests**: A checked-in `.http` file (supported natively by Visual Studio, VS Code, and Rider) is a lightweight way to keep a running collection of example requests against your endpoints, version-controlled alongside the code.

**Integration testing**: rather than the older `WebApplicationFactory` + Testcontainers combination, use the `Aspire.Hosting.Testing` package's `DistributedApplicationTestingBuilder`. It boots your actual AppHost topology (real Postgres container, real Redis container) for the duration of a test run, handling service discovery and connection strings the same way the AppHost does locally — so integration tests exercise the real database rather than an in-memory substitute, without you hand-rolling container lifecycle management.

## Summary of Recommendations

| Decision | Recommendation |
| --- | --- |
| Orchestrator | Aspire 13 (AppHost + ServiceDefaults projects) |
| Database | PostgreSQL, containerized via Aspire, `jsonb` column for recipe JSON-LD + indexed relational columns for querying |
| Cache | Redis via Aspire, declared now even if unused initially |
| API architecture | Vertical Slice Architecture with .NET 10 minimal APIs, feature folders under `Features/` |
| API exploration | `Microsoft.AspNetCore.OpenApi` + Scalar UI at `/scalar` |
| DB visibility | pgAdmin via `WithPgAdmin()`, surfaced in the Aspire dashboard |
| Testing | `Aspire.Hosting.Testing` / `DistributedApplicationTestingBuilder` for integration tests against real containers |

Sources: [Aspire 13 / .NET 10 overview](https://windowsforum.com/threads/net-10-lts-arrives-with-c-14-visual-studio-2026-aspire-13-and-copilot.389084/), [Aspire PostgreSQL hosting integration](https://aspire.dev/integrations/databases/postgres/postgres-host/), [Aspire SQLite hosting integration](https://aspire.dev/integrations/databases/sqlite/sqlite-host/), [Aspire Redis integration](https://aspire.dev/integrations/caching/redis/redis-get-started/), [.NET 10 OpenAPI/Scalar changes](https://codewithmukesh.com/blog/dotnet-swagger-alternatives-openapi/), [Vertical Slice Architecture in .NET 10](https://antondevtips.com/blog/how-to-structure-production-apps-with-vertical-slice-architecture-in-dotnet-in-2026), [Aspire integration testing](https://devblogs.microsoft.com/dotnet/getting-started-with-testing-and-dotnet-aspire/)
