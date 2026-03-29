# Data Quality Platform - Development Playbook

## Overview

This playbook guides developers through setting up the development environment, contributing to the codebase, and following best practices for the Data Quality Platform.

## Development Environment Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Git
- VS Code (recommended) with extensions:
  - Python
  - Pylance
  - Docker
  - GitLens

### 1. Clone and Setup
```bash
git clone <repository-url>
cd fabric_duckdb_soda_dataquality_checks

# Copy environment template
cp .env.example .env

# Start development environment
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Backend Development Setup
```bash
cd services/api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Start development server
python -m src.api.server
```

### 3. Frontend Development Setup
```bash
cd services/frontend

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

## Code Organization

### Directory Structure
```
services/
├── api/                    # API Service
│   ├── src/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Business logic
│   │   ├── storage/       # Data persistence
│   │   └── utils/         # Utilities
│   ├── tests/             # Unit tests
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile         # API container
├── frontend/              # Frontend Service
│   ├── src/               # React application
│   ├── public/            # Static assets
│   ├── package.json       # Node dependencies
│   └── Dockerfile         # Frontend container
└── scanner/               # Scanner Service (future)

docs/                      # Documentation
├── architecture/         # System architecture docs
└── playbooks/            # Operational guides

infrastructure/           # Infrastructure as Code
├── docker/              # Docker configurations
├── helm/                # Kubernetes Helm charts
└── k8s/                 # Kubernetes manifests

config/                   # Configuration files
├── development/         # Dev environment configs
├── staging/             # Staging configs
└── production/          # Production configs

scripts/                  # Build and deployment scripts
├── build/               # Build scripts
├── deploy/              # Deployment scripts
└── test/                # Testing scripts
```

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Implement Changes
- Follow the established patterns
- Add tests for new functionality
- Update documentation
- Ensure code quality

### 3. Run Tests
```bash
# Backend tests
cd services/api
pytest

# Frontend tests
cd services/frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 4. Code Quality Checks
```bash
# Python linting
black src/
flake8 src/

# Frontend linting
cd services/frontend
npm run lint
```

### 5. Commit Changes
```bash
git add .
git commit -m "feat: add your feature description"
```

### 6. Create Pull Request
- Push branch to remote
- Create PR with description
- Request code review

## API Development Guidelines

### Endpoint Structure
```python
@app.post("/api/resource", response_model=ResponseModel)
async def create_resource(request: RequestModel):
    """
    Create a new resource.
    
    - Validates input data
    - Processes business logic
    - Returns appropriate response
    """
    # Implementation
    pass
```

### Error Handling
```python
try:
    # Business logic
    result = await process_data(data)
    return SuccessResponse(data=result)
except ValidationError as e:
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### Data Validation
```python
from pydantic import BaseModel, Field
from typing import Optional

class SodaCheck(BaseModel):
    name: str = Field(..., description="Check name")
    check_type: str = Field(..., description="Type of check")
    column: Optional[str] = Field(None, description="Target column")
    # Additional fields...
```

## Frontend Development Guidelines

### Component Structure
```jsx
import React, { useState, useEffect } from 'react';
import './Component.css';

function DataQualityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/health');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h2>System Health: {data?.status}</h2>
    </div>
  );
}

export default DataQualityDashboard;
```

### API Integration
```jsx
// Custom hook for API calls
import { useState, useEffect } from 'react';
import axios from 'axios';

function useApi(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(endpoint);
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return { data, loading, error };
}
```

## Testing Strategy

### Unit Tests
```python
# tests/test_scanner.py
import pytest
from src.core.scanner import EnhancedDataQualityScanner

class TestDataQualityScanner:
    def test_scan_execution(self):
        scanner = EnhancedDataQualityScanner()
        # Test implementation
        assert True

    def test_result_parsing(self):
        # Test result parsing logic
        assert True
```

### Integration Tests
```python
# tests/test_api_integration.py
import pytest
from fastapi.testclient import TestClient
from src.api.server import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "status" in response.json()

def test_dynamic_scan():
    payload = {
        "table_name": "test_table",
        "checks": [{"name": "test", "check_type": "missing", "column": "test_col"}]
    }
    response = client.post("/api/dynamic-scan", json=payload)
    assert response.status_code == 200
```

### Frontend Tests
```jsx
// src/components/__tests__/Dashboard.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

test('renders dashboard', () => {
  render(<Dashboard />);
  const linkElement = screen.getByText(/dashboard/i);
  expect(linkElement).toBeInTheDocument();
});
```

## Code Quality Standards

### Python Standards
- **PEP 8** compliance
- **Type hints** for all functions
- **Docstrings** for modules, classes, and functions
- **Black** formatting
- **Flake8** linting

### JavaScript/React Standards
- **ES6+** syntax
- **Functional components** with hooks
- **TypeScript** for type safety (future)
- **ESLint** configuration
- **Prettier** formatting

### Commit Message Convention
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

## Security Best Practices

### Input Validation
- Validate all user inputs
- Use parameterized queries
- Sanitize file uploads
- Implement rate limiting

### Authentication & Authorization
```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Environment Variables
```python
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
```

## Performance Optimization

### Database Optimization
- Use connection pooling
- Implement proper indexing
- Optimize queries
- Cache frequently accessed data

### API Optimization
- Implement pagination
- Use background tasks for heavy operations
- Compress responses
- Cache static assets

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis

## Debugging and Troubleshooting

### Common Issues

#### API Connection Issues
```bash
# Check API logs
docker-compose logs data-quality-api

# Test API connectivity
curl http://localhost:8000/api/health

# Check network connectivity
docker-compose exec data-quality-api ping postgres
```

#### Frontend Build Issues
```bash
# Clear cache
cd services/frontend
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version
npm --version
```

#### Database Issues
```bash
# Check database logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U postgres -d data_quality

# Check database status
docker-compose exec postgres pg_isready -U postgres
```

### Debug Tools

#### Python Debugging
```python
import pdb; pdb.set_trace()  # Add breakpoint
# or
import ipdb; ipdb.set_trace()  # Enhanced debugger
```

#### Frontend Debugging
```javascript
// Console logging
console.log('Debug info:', data);

// React DevTools
// Install React DevTools browser extension

// Network debugging
// Use browser DevTools Network tab
```

#### Docker Debugging
```bash
# Enter container
docker-compose exec data-quality-api bash

# Check environment
env | grep -E "(POSTGRES|API)"

# Check running processes
ps aux

# Check disk usage
df -h
```

## Contributing Guidelines

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Ensure CI passes
5. Submit PR with description
6. Address review comments
7. Merge after approval

### Code Review Checklist
- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Breaking changes documented

### Release Process
1. Update version numbers
2. Update changelog
3. Create release branch
4. Run full test suite
5. Tag release
6. Deploy to staging
7. Deploy to production

## Support and Resources

### Getting Help
- **Documentation**: Check `docs/` directory
- **Issues**: Create GitHub issues
- **Discussions**: Use GitHub discussions
- **Wiki**: Project wiki for guides

### Learning Resources
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/)
- [Soda Core Documentation](https://docs.soda.io/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Team Contacts
- **Tech Lead**: tech-lead@company.com
- **DevOps**: devops@company.com
- **QA**: qa@company.com