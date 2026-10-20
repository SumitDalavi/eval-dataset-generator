# Changelog for eval-dataset-generator

## [Unreleased]
- Added `docs/decisions.md` to document architectural trade-offs.
- Added `docs/runbook.md` with explicit startup and diagnostic steps.
- Identified known limitations in README for transparency.


---

## [v0.1.0] — 2026-10-20
### Added
- **Release Automation:** Added `.github/workflows/release.yml` with automated catalog validation, tarball packaging, and SPDX SBOM generation.
- **Supply Chain Security:** Generated Anchore Syft SPDX JSON SBOM and cryptographic SHA-256 checksums.
- **Release Verification:** Added release verification documentation, badges, and operational runbook.
