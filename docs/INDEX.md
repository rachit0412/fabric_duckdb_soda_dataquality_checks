# 📚 Documentation Index — Canonical Reference

**Version:** 1.0.0  
**Last Updated:** 2026-04-11  
**Status:** Single Source of Truth

Welcome to the **Enterprise Data Quality Platform** documentation. This is the **canonical index** for all project information. All historical documentation has been consolidated and archived in `/archive/`.

---

## 🎯 Navigation Hub

### 🚀 Getting Started (Start Here)
| Document | Purpose |
|----------|---------|
| [OVERVIEW.md](OVERVIEW.md) | System architecture, components, and design principles |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Setup instructions for local dev, Docker, and production |
| [API.md](API.md) | REST API endpoints, request/response contracts, examples |

### 📖 Reference Documentation
| Document | Purpose |
|----------|---------|
| [DATABASE.md](DATABASE.md) | Database schema, table definitions, relationships |
| [RUNBOOK.md](RUNBOOK.md) | Operations guide: troubleshooting, common tasks, debugging |

### 🛠️ Developer Resources
| Document | Purpose |
|----------|---------|
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Development setup, code standards, PR guidelines |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Detailed system architecture and design rationale |
| [../SECURITY.md](../SECURITY.md) | Security features, hardening, compliance |

### 📊 Decision & Risk Tracking
| Document | Purpose |
|----------|---------|
| [DECISION_LOG.md](DECISION_LOG.md) | Architecture decisions (ADRs), approvals, rationale |
| [RAID_LOG.md](RAID_LOG.md) | Risks, assumptions, dependencies, issues |

### 🏗️ Architecture & Design
| Document | Purpose |
|----------|---------|
| [architecture/](architecture/) | Deep-dive architecture documentation (ADRs) |
| [ADRs/](ADRs/) | Architecture Decision Records with approval status |

### 📋 Guides & Troubleshooting
| Document | Purpose |
|----------|---------|
| [guides/](guides/) | User guides and how-to articles |
| [playbooks/](playbooks/) | Operational playbooks and procedures |

---

## 🎯 Quick Links by Role

### 👨‍💻 Backend Developer
1. **Getting Started:** [DEPLOYMENT.md](DEPLOYMENT.md) → Local setup
2. **API Contracts:** [API.md](API.md) → Endpoint specifications  
3. **Database:** [DATABASE.md](DATABASE.md) → Schema reference
4. **Development:** [../CONTRIBUTING.md](../CONTRIBUTING.md) → Code standards
5. **Troubleshooting:** [RUNBOOK.md](RUNBOOK.md) → Common issues

### 👨‍🎨 Frontend Developer
1. **Getting Started:** [DEPLOYMENT.md](DEPLOYMENT.md) → Frontend setup
2. **API Contracts:** [API.md](API.md) → Response formats
3. **Development:** [../CONTRIBUTING.md](../CONTRIBUTING.md) → Code standards
4. **Troubleshooting:** [RUNBOOK.md](RUNBOOK.md) → API issues

### 🚀 DevOps / Infrastructure
1. **Deployment:** [DEPLOYMENT.md](DEPLOYMENT.md) → Docker setup
2. **Database:** [DATABASE.md](DATABASE.md) → Schema & migrations
3. **Security:** [../SECURITY.md](../SECURITY.md) → Hardening
4. **Troubleshooting:** [RUNBOOK.md](RUNBOOK.md) → Operations

### 👨‍💼 Project Manager / Stakeholder
1. **Overview:** [OVERVIEW.md](OVERVIEW.md) → Architecture & features
2. **Decisions:** [DECISION_LOG.md](DECISION_LOG.md) → Approvals & impact
3. **Risks:** [RAID_LOG.md](RAID_LOG.md) → Issues & mitigation

---

## 📚 Documentation Principles

### ✅ These docs are:
- **Single Source of Truth:** Only one canonical version exists
- **Evidence-Based:** All claims verified against actual code
- **Current:** Updated with each release (v1.0.0+)
- **Linked:** Internal navigation is navigation is complete and valid
- **Actionable:** Contains commands, examples, and clear steps

### ❌ Archived Docs
Historical documentation has been archived in `/archive/`:
- `/archive/phases/` - Phase reports (P0-P6, Phase01, etc.)
- `/archive/deprecated/` - Old variants (ARCHITECTURE_OVERVIEW.md, etc.)
- See [/archive/README.md](/archive/README.md) for retention policy

**To find archived docs:**
```bash
git log --follow --oneline -- archive/
find archive/ -name "*.md"
```

---

## 🔄 Documentation Maintenance

### When to Update Docs
- ✅ After merging code changes
- ✅ After architecture decisions
- ✅ After deployment or operations changes
- ✅ During weekly docs audit (Fridays)

### How to Update Docs
1. Edit relevant `.md` file
2. Verify links are valid
3. Cross-reference related docs
4. Commit with message: `docs: Update [filename] - [reason]`

### Broken Links / Inconsistencies
Report issues or inconsistencies:
- Update the doc immediately (don't defer)
- Reference code/evidence in commit message
- Link-check: `grep -r "\[.*\](.*\.md)" docs/`

---

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-11 | M1 Release: Canonical docs baseline |

---

## 🤝 Questions or Updates?

- **API Question?** → See [API.md](API.md) or run `curl http://localhost:8000/docs`
- **Setup Issue?** → Follow [DEPLOYMENT.md](DEPLOYMENT.md), then see [RUNBOOK.md](RUNBOOK.md)
- **Architecture Question?** → Read [OVERVIEW.md](OVERVIEW.md) + [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **Bug or Issue?** → Check [RUNBOOK.md](RUNBOOK.md) troubleshooting section
- **Decision/Approval?** → Review [DECISION_LOG.md](DECISION_LOG.md)

---

**Last Reviewed:** 2026-04-11  
**Maintained By:** Documentation Team  
**Next Review:** 2026-04-18
