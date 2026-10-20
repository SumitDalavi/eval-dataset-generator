# Runbook: eval-dataset-generator

## Exact Startup
```bash
npm install || pip install -r requirements.txt
npm run start || python main.py
```

## Testing
```bash
npm run test || pytest
```

## Health Check
- **Endpoint**: `/health` or `GET /`
- **Expected Response**: HTTP 200 OK with `status: healthy`.

## Failure Symptom
- Service returns `503 Service Unavailable` or connection refused.
- Logs indicate missing environment variables or port binding conflicts.

## Diagnosis
1. Check if the port is already in use using `lsof -i:<port>`.
2. Ensure dependencies are correctly mocked in `.env`.

## Recovery
1. Terminate the conflicting process.
2. Restart the application using the startup command.

## Teardown
```bash
# Send SIGINT (Ctrl+C) to the running process
kill -9 <PID>
```


---

## Release Runbook

### Release Trigger
Tag push matching `v*.*.*` (e.g., `v0.1.0`).

### Automated Pipeline Stages
1. **Quality & Validation Gate:** Validates policy syntax, manifest schemas, and configuration integrity.
2. **Distribution Packaging:** Bundles clean production manifests into `eval-dataset-generator-<tag>.tar.gz` and calculates SHA256 checksums.
3. **Syft Source SBOM:** Generates `sbom.spdx.json` adhering to SPDX 2.3 standard.
4. **GitHub Release:** Publishes release assets and release notes.

### Verification
```bash
gh release view v0.1.0 --repo SumitDalavi/eval-dataset-generator
gh release download v0.1.0 --repo SumitDalavi/eval-dataset-generator --pattern "checksums.txt"
```

### Failure Modes & Remediation
- **Linter / Test Failure:** Inspect policy syntax, configurations, or module arguments locally before tagging.
- **Checksum Mismatch:** Ensure file was completely downloaded without network truncation.

## Operations & Diagnostics Guide (v0.2.0)

### Mode Verification & Diagnostics
Inspect the active execution mode and backing provider status via the health endpoint:
```bash
# Check runtime mode and adapter status
curl -s http://localhost:8080/health | jq .
# Expected output when running without keys:
# {"status": "ok", "mode": {"database": "mock", "ai": "mock", "cache": "mock"}}
```

### Running in Mock Mode (Tier 1)
Start the service with zero external dependencies:
```bash
cp .env.example .env
# Start service without modifying .env
npm start || python main.py || go run .
```

### Running with Live Credentials (Tier 2 / 3)
Populate target credentials in `.env` and restart:
```bash
# Verify live upgrade via health check
curl -s http://localhost:8080/health | jq .mode
```

### Pulling Pre-Built OCI Image
```bash
docker pull ghcr.io/sumitdalavi/eval-dataset-generator:v0.2.0
docker run -d -p 8080:8080 --env-file .env ghcr.io/sumitdalavi/eval-dataset-generator:v0.2.0
```
