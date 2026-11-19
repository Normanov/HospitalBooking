# DentaCore

DentaCore is a React/Vite clinic UI with an ASP.NET Core 8 API. The API includes JWT access tokens, rotating refresh cookies, permission policies, appointment booking, clinical records, billing, and SignalR. Visitors first see the public clinic landing page; booking, the patient portal, and staff CRM use the API. Staff can manage appointments and patient records, authorized clinicians can update odontograms and prescriptions, reception can record payments, and the owner can manage staff permissions and view reports/audit events. See [SRS.md](./SRS.md) for scope and known limitations.

## Run locally

Prerequisites: Node.js, npm, and the .NET 8 SDK.

1. Configure a base64-encoded JWT signing key (at least 32 bytes) and bootstrap SuperAdmin credentials in the same PowerShell session:

   ```powershell
   $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
   $keyBytes = New-Object byte[] 32
   $rng.GetBytes($keyBytes)
   $env:Jwt__Key = [Convert]::ToBase64String($keyBytes)
   $rng.Dispose()
   $env:DENTACORE_BOOTSTRAP_ADMIN_EMAIL = "owner@example.com"
   $env:DENTACORE_BOOTSTRAP_ADMIN_PASSWORD = "use-a-unique-password-of-at-least-12-characters"
   ```

2. Start the API:

   ```powershell
   dotnet run --project server\DentaCore.Api
   ```

   Development uses SQLite by default and creates the schema automatically. The Vite proxy expects the API at `http://localhost:5000`; set `DENTACORE_API_PROXY` if it runs elsewhere.

3. In a second terminal, install frontend dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000`. Visitors can browse the clinic before choosing online booking, sign-in, or patient registration. Staff can sign in with the bootstrap account.

5. In another terminal, start the staff portal:

   ```powershell
   npm run dev:admin
   ```

   Open `http://localhost:3001`. This portal is login-only for Super Admin, doctors, and receptionists; patient registration is not available there.

## Run with Docker Compose (PostgreSQL)

Prerequisite: Docker Desktop with Compose.

1. Create a local `.env` file containing fresh secrets. Run this in PowerShell from the project root:

   ```powershell
   $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
   $dbBytes = New-Object byte[] 32
   $jwtBytes = New-Object byte[] 32
   $adminBytes = New-Object byte[] 32
   $rng.GetBytes($dbBytes)
   $rng.GetBytes($jwtBytes)
   $rng.GetBytes($adminBytes)
   $rng.Dispose()
   @(
     "DENTACORE_DB_PASSWORD=$([BitConverter]::ToString($dbBytes).Replace('-', ''))"
     "DENTACORE_JWT_KEY=$([Convert]::ToBase64String($jwtBytes))"
     "DENTACORE_BOOTSTRAP_ADMIN_EMAIL=admin@dentacore.local"
     "DENTACORE_BOOTSTRAP_ADMIN_PASSWORD=$([BitConverter]::ToString($adminBytes).Replace('-', ''))"
     "DENTACORE_WEB_PORT=8080"
     "DENTACORE_ADMIN_PORT=8081"
   ) | Set-Content -Encoding ascii .env
   ```

   Keep `.env` private; it is excluded from Docker build contexts and source control.

2. Build and start the application:

   ```powershell
   docker compose -f docker-compose.yml up --build -d
   docker compose -f docker-compose.yml ps
   ```

   Open `http://localhost:8080` for the public clinic site and `http://localhost:8081` for the separate staff login. Refresh cookies are scoped by origin, so the two portals do not overwrite each other's sessions; after upgrading from an earlier version, sign in to each portal again. PostgreSQL data and API data-protection keys are kept in named Docker volumes, so authentication cookies remain valid when the API container is recreated. The API applies EF Core migrations at startup, then creates the bootstrap owner if those credentials are configured. The owner email and generated password are in `.env`.

   For local HTTP Compose, the API trusts forwarded scheme/IP headers only from the web container and allows non-secure cookies. When terminating HTTPS in front of Compose, set `DENTACORE_COOKIES_REQUIRE_HTTPS=true` and ensure the proxy forwards `X-Forwarded-Proto: https`.

3. Check API/database readiness and logs:

   ```powershell
   Invoke-RestMethod http://localhost:8080/health
   Invoke-RestMethod http://localhost:8080/api/v1/auth/csrf
   docker compose -f docker-compose.yml logs --tail 100 api
   ```

   Stop the containers without deleting data using `docker compose -f docker-compose.yml down`. **Do not** add `-v` unless you intend to delete the database and data-protection volumes.

The monorepo keeps the React application under `frontend/` and the .NET solution under `backend/`. Build the backend with `dotnet build backend/DentaCore.sln`; its projects are `DentaCore.Domain`, `DentaCore.Application`, `DentaCore.Infrastructure`, and `DentaCore.Api`.

The public catalog reads active doctors and services from PostgreSQL. A new database starts with roles and permissions but no clinic-specific doctors or services; add those records through the API before accepting online bookings.

## Validate

```powershell
npm run lint
npm run build
dotnet build server\DentaCore.Api\DentaCore.Api.csproj
```

For production, provide secrets through a secret manager, terminate HTTPS at a trusted reverse proxy, and review migrations before deployment. Docker Compose is a single-host deployment baseline, not a substitute for production monitoring, backups, or high availability.
