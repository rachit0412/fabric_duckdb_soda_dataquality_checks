# 📚 Documentation Index

**Version:** 1.0.0 | **Last Updated:** 2026-03-31

Welcome to the Enterprise Data Quality Platform documentation. This index provides quick access to all platform documentation.

---

## 🚀 Getting Started

Start here if you're new to the platform:

1. **[Quick Start](../README.md#quick-start)** - 60-second deployment guide
2. **[Quick Reference](QUICK_REFERENCE.md)** - Command cheatsheet (auto-generated)
3. **[Architecture Overview](../ARCHITECTURE.md)** - System design essentials

---

## 📖 Core Documentation

### Root Documentation (Project Overview)
| Document | Description | Auto-Updated |
|----------|-------------|--------------|
| [README.md](../README.md) | Project overview, quick start, usage examples | 🟢 Yes |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | System architecture and design principles | ⚪ Manual |
| [SECURITY.md](../SECURITY.md) | Security features, hardening, attack scenarios | ⚪ Manual |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Developer guide for contributors | ⚪ Manual |

### Auto-Generated Documentation
| Document | Description | Source |
|----------|-------------|--------|
| [API_REFERENCE.md](API_REFERENCE.md) | REST API endpoints, models, examples | Extracted from `src/api/server.py` |
| [COMPONENTS.md](COMPONENTS.md) | Component architecture and data flow | Extracted from source code |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Commands, configuration, directory structure | Generated from templates |

**Update docs:** Run `.\generate-docs.ps1` (or configure git pre-commit hook)

---

## 📂 Documentation by Category

### 🏗️ Architecture & Design
- [Architecture Overview](../ARCHITECTURE.md) - Compact system design
- [Detailed Architecture](architecture/ARCHITECTURE_DETAILED.md) - Full technical documentation
- [Components Reference](COMPONENTS.md) - Component breakdown (auto-generated)

### 🐳 Deployment & Operations
- [Docker Setup Guide](deployment/DOCKER_SETUP.md) - Container deployment instructions
- [Docker Ready Checklist](deployment/DOCKER_READY.md) - Pre-deployment validation
- [Containerization Guide](deployment/CONTAINERIZATION.md) - Containerization details
- [PostgreSQL Setup](deployment/POSTGRES_SETUP.md) - Database configuration
- [Storage Options](deployment/STORAGE_OPTIONS.md) - PostgreSQL vs Cosmos DB

### 🔐 Security
- [Security Guide](../SECURITY.md) - Security features and hardening
- [Security Testing](../test-security.ps1) - Automated security validation

### 🌐 API & Integration
- [API Reference](API_REFERENCE.md) - REST endpoints (auto-generated)
- [Interactive API Docs](http://localhost:8000/docs) - Swagger UI (when running)

### 📖 User Guides
- [UI Guide](guides/UI_GUIDE.md) - Web dashboard usage
- [Testing Guide](guides/TESTING.md) - Testing procedures

### 🎯 Playbooks
- [Development Playbook](playbooks/DEVELOPMENT_PLAYBOOK.md) - Developer workflows
- [Deployment Playbook](playbooks/DEPLOYMENT_PLAYBOOK.md) - Deployment procedures

### 🛠️ Maintenance
- [Documentation Maintenance](DOCUMENTATION_MAINTENANCE.md) - How to maintain docs

---

## 🔄 Documentation Automation

### Auto-Generated Documentation
The following files are **automatically generated** from source code:

- `docs/API_REFERENCE.md` - Extracted from FastAPI decorators
- `docs/COMPONENTS.md` - Extracted from class structures
- `docs/QUICK_REFERENCE.md` - Generated from templates
- `README.md` (version stamp) - Updated with project version

### Regenerate Documentation
```powershell
# Manual update
.\generate-docs.ps1

# Automatic (git hook)
git config core.hooksPath .githooks
```

See: [.githooks/README.md](../.githooks/README.md) for git hook setup

---

## 🗂️ Documentation Structure

```
.
├── README.md                    # 🟢 Auto-updated (version stamp)
├── ARCHITECTURE.md              # ⚪ Manual (compact overview)
├── SECURITY.md                  # ⚪ Manual (security guide)
├── CONTRIBUTING.md              # ⚪ Manual (developer guide)
│
├── docs/
│   ├── README.md                # This file (documentation index)
│   ├── API_REFERENCE.md         # 🟢 Auto-generated
│   ├── COMPONENTS.md            # 🟢 Auto-generated
│   ├── QUICK_REFERENCE.md       # 🟢 Auto-generated
│   ├── DOCUMENTATION_MAINTENANCE.md  # ⚪ Manual
│   │
│   ├── architecture/
│   │   └── ARCHITECTURE_DETAILED.md  # ⚪ Manual
│   │
│   ├── deployment/
│   │   ├── DOCKER_SETUP.md      # ⚪ Manual
│   │   ├── DOCKER_READY.md      # ⚪ Manual
│   │   ├── CONTAINERIZATION.md  # ⚪ Manual
│   │   ├── POSTGRES_SETUP.md    # ⚪ Manual
│   │   └── STORAGE_OPTIONS.md   # ⚪ Manual
│   │
│   ├── guides/
│   │   ├── UI_GUIDE.md          # ⚪ Manual
│   │   └── TESTING.md           # ⚪ Manual
│   │
│   └── playbooks/
│       ├── DEVELOPMENT_PLAYBOOK.md   # ⚪ Manual
│       └── DEPLOYMENT_PLAYBOOK.md    # ⚪ Manual
│
├── .githooks/
│   ├── pre-commit               # Auto-doc generation hook
│   └── README.md                # Git hook setup guide
│
└── generate-docs.ps1            # Documentation generator script
```

**Legend:**
- 🟢 Auto-generated from source code
- ⚪ Manually maintained

---

## 🔍 Finding Documentation

### By Task
- **Deploy the platform** → [README.md Quick Start](../README.md#quick-start)
- **Understand the architecture** → [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Use the API** → [API_REFERENCE.md](API_REFERENCE.md)
- **Secure the platform** → [SECURITY.md](../SECURITY.md)
- **Develop features** → [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Maintain docs** → [DOCUMENTATION_MAINTENANCE.md](DOCUMENTATION_MAINTENANCE.md)

### By Role
- **DevOps Engineer** → Deployment docs, Docker guides, security
- **Data Engineer** → API reference, usage examples, integration
- **Developer** → Contributing guide, component docs, architecture
- **Security Analyst** → Security guide, attack scenarios, hardening

---

**Last Generated:** 2026-03-31 | **Tool:** Manual + `generate-docs.ps1`
