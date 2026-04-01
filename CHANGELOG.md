# Changelog

All notable changes to the Enterprise Data Quality Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-04-01

### Fixed
- **Critical: Scan functionality restored** - Fixed Docker container configuration to correctly locate Soda checks configuration files
  - Added `LAKEHOUSE_PATH`, `SODA_CONFIG_PATH`, and `SODA_CHECKS_PATH` environment variables to `docker-compose.yml`
  - Resolved "Path does not exist" errors that prevented data quality scans from executing
  - Container now properly references `/app/soda_duckdb/checks.yml` instead of incorrect lakehouse path
  - All scans now execute successfully with proper rule evaluation

### Changed
- Updated documentation generator skill for automated doc maintenance
- Version bumped across all documentation files (README.md, guides, architecture docs)

---

## [1.0.0] - 2026-03-31

### Added - Modern UI Redesign
- **Complete UI overhaul** - Transformed from multi-tab interface to modern single-page layout
  - **Unified workspace**: File upload and rule selection on same screen (side-by-side)
  - **Modal-based details**: Results and history shown in elegant popup overlays
  - **Glass-morphism design**: Modern frosted-glass header with backdrop blur effects
  - **Responsive grid layout**: 2-column desktop → 1-column tablet → stacked mobile
  - **Live preview panel**: See latest scan results immediately after execution
  - **Smooth animations**: Slide-up modals, hover effects, pulse loading states

- **Enhanced user experience**:
  - Drag-and-drop file upload with visual feedback
  - 5-category rule selection with checkboxes (Volume, Completeness, Uniqueness, Validity, Freshness)
  - One-click scan execution with loading states
  - Color-coded status badges (green/yellow/red)
  - Rule selection counter showing X/5 rules selected
  - Empty state handling with helpful prompts

- **Performance optimizations**:
  - Reduced bundle size: JavaScript 47.68 KB (gzipped), CSS 2.43 KB (gzipped)
  - Simplified component architecture: 430 lines (down from 523)
  - Optimized CSS: 600 lines (down from 800+)
  - Eliminated redundant code and unnecessary re-renders

### Added - Core Features
- **Production-ready Docker deployment** with 4-service architecture:
  - PostgreSQL 16 database for scan history
  - FastAPI backend with REST API
  - React 18 frontend with modern UI
  - Nginx reverse proxy for routing

- **Enterprise data quality scanning**:
  - Soda Core 3.4.3 integration with DuckDB 1.1.0
  - Support for volume, completeness, uniqueness, validity, and freshness checks
  - Configurable quality thresholds (95% critical, 98% warning)
  - Detailed check results with diagnostics

- **Security hardening**:
  - Non-root container users (UID 1000)
  - Read-only root filesystems
  - Capability dropping (minimal privileges)
  - Resource limits (CPU/memory constraints)
  - No new privileges security option
  - Health checks for all services

- **API endpoints**:
  - `POST /api/simple-upload` - Upload CSV and run scan with rule selection
  - `GET /api/summary` - Get scan history summary
  - `GET /api/health` - Service health check
  - `GET /docs` - Interactive API documentation (Swagger UI)

- **Documentation**:
  - Comprehensive README with quick start
  - Modern UI Guide with visual layouts
  - Rule Selection Guide with examples
  - Architecture documentation
  - Security documentation
  - Deployment playbooks
  - Contributing guidelines

### Technical Stack
- **Frontend**: React 18.2.0, react-scripts 5.0.1
- **Backend**: Python 3.11, FastAPI, Uvicorn
- **Database**: PostgreSQL 16-alpine
- **Data Quality**: Soda Core 3.4.3, DuckDB 1.1.0
- **Container**: Docker Compose with multi-stage builds
- **Environment**: GitHub Codespaces compatible

### Known Issues
- Freshness checks fail if date columns stored as text (requires datetime casting)
- Email alerting requires SMTP configuration (currently skipped)
- Soda config path warnings in logs (non-blocking, configuration works)

---

## [Unreleased]

### Planned
- Batch file upload support
- Trend visualization over time
- AI-based rule recommendations
- Custom rule templates
- Export results to Excel/PDF
- Scheduled scans
- Multi-language support
- Advanced anomaly detection visualization

---

## Version History Summary

| Version | Date       | Highlights |
|---------|------------|------------|
| 1.0.1   | 2026-04-01 | Fixed scan configuration paths |
| 1.0.0   | 2026-03-31 | Initial release with modern UI |

---

**Note**: For detailed technical changes, see individual commit messages in the git history.

**Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting changes.
