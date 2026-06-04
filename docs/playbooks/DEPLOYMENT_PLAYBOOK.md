# Data Quality Platform - Deployment Playbook

## Overview

This playbook provides step-by-step instructions for deploying the Data Quality Platform across different environments (development, staging, production).

## Environment Configuration

### Environment Variables

Create `.env` files for each environment:

```bash
# .env.development
ENVIRONMENT=development
DEBUG=true
API_PORT=8000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me-with-a-32-char-random-password
POSTGRES_DB=data_quality
STORAGE_BACKEND=postgresql
LOG_LEVEL=DEBUG

# .env.staging
ENVIRONMENT=staging
DEBUG=false
API_PORT=8000
POSTGRES_HOST=staging-db.company.com
POSTGRES_PORT=5432
POSTGRES_USER=dq_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD_STAGING}
POSTGRES_DB=data_quality
STORAGE_BACKEND=postgresql
LOG_LEVEL=INFO

# .env.production
ENVIRONMENT=production
DEBUG=false
API_PORT=8000
POSTGRES_HOST=prod-db.company.com
POSTGRES_PORT=5432
POSTGRES_USER=dq_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD_PRODUCTION}
POSTGRES_DB=data_quality
STORAGE_BACKEND=postgresql
LOG_LEVEL=WARNING
```

## Development Deployment

### Local Docker Deployment
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Local Development Setup
```bash
# Backend development
cd services/api
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
python -m src.api.server

# Frontend development
cd services/frontend
npm install
npm start
```

## Staging Deployment

### Prerequisites
- Kubernetes cluster access
- Helm 3.x installed
- kubectl configured
- Docker registry access

### 1. Build and Push Images
```bash
# Build images
docker build -t company/data-quality-api:staging ./services/api
docker build -t company/data-quality-frontend:staging ./services/frontend

# Push to registry
docker push company/data-quality-api:staging
docker push company/data-quality-frontend:staging
```

### 2. Deploy to Kubernetes
```bash
# Set kubectl context
kubectl config use-context staging-cluster

# Create namespace
kubectl create namespace data-quality-staging

# Deploy using Helm
helm upgrade --install data-quality ./infrastructure/helm \
  --namespace data-quality-staging \
  --set image.tag=staging \
  --set environment=staging \
  --values ./config/staging/values.yaml
```

### 3. Verify Deployment
```bash
# Check pod status
kubectl get pods -n data-quality-staging

# Check service endpoints
kubectl get svc -n data-quality-staging

# Check ingress
kubectl get ingress -n data-quality-staging

# View logs
kubectl logs -f deployment/data-quality-api -n data-quality-staging
```

## Production Deployment

### Prerequisites
- Production Kubernetes cluster
- Database backups configured
- Monitoring and alerting setup
- SSL certificates
- Load balancer configuration

### 1. Pre-deployment Checklist
- [ ] Database backup completed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] SSL certificates valid
- [ ] Load balancer health checks configured
- [ ] Team notified of maintenance window

### 2. Build Production Images
```bash
# Build with production tag
docker build --no-cache -t company/data-quality-api:v1.0.0 ./services/api
docker build --no-cache -t company/data-quality-frontend:v1.0.0 ./services/frontend

# Security scan
docker scan company/data-quality-api:v1.0.0
docker scan company/data-quality-frontend:v1.0.0

# Push to registry
docker push company/data-quality-api:v1.0.0
docker push company/data-quality-frontend:v1.0.0
```

### 3. Database Migration
```bash
# Backup production database
pg_dump -h prod-db.company.com -U dq_user -d data_quality > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations if any
kubectl exec -it deployment/data-quality-api -n data-quality -- python manage.py migrate
```

### 4. Blue-Green Deployment
```bash
# Deploy to blue environment
helm upgrade --install data-quality-blue ./infrastructure/helm \
  --namespace data-quality \
  --set image.tag=v1.0.0 \
  --set environment=production \
  --set ingress.host=blue.data-quality.company.com \
  --values ./config/production/values.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/data-quality-api-blue -n data-quality

# Switch traffic to blue
kubectl patch ingress data-quality -n data-quality --type=json -p='[
  {"op": "replace", "path": "/spec/rules/0/host", "value": "blue.data-quality.company.com"}
]'

# Monitor for 15 minutes
# If successful, proceed to cleanup
helm uninstall data-quality-green -n data-quality

# Rename blue to production
helm upgrade --install data-quality ./infrastructure/helm \
  --namespace data-quality \
  --set image.tag=v1.0.0 \
  --set environment=production \
  --set ingress.host=data-quality.company.com \
  --values ./config/production/values.yaml
```

### 5. Post-deployment Verification
```bash
# Health checks
curl -f https://data-quality.company.com/api/health
curl -f https://data-quality.company.com/

# Database connectivity
kubectl exec deployment/data-quality-api -n data-quality -- python -c "
import psycopg2
conn = psycopg2.connect('host=prod-db.company.com user=dq_user password=$DB_PASSWORD dbname=data_quality')
print('Database connection successful')
"

# Performance monitoring
# Check response times, error rates, resource usage
```

## Infrastructure as Code

### Helm Chart Structure
```
infrastructure/helm/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment-api.yaml
│   ├── deployment-frontend.yaml
│   ├── service-api.yaml
│   ├── service-frontend.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── hpa.yaml
└── charts/
    └── postgresql/
```

### Kubernetes Manifests
```yaml
# infrastructure/k8s/production/
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-quality-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-quality-api
  template:
    metadata:
      labels:
        app: data-quality-api
    spec:
      containers:
      - name: api
        image: company/data-quality-api:v1.0.0
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: data-quality-config
        - secretRef:
            name: data-quality-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring and Observability

### Application Monitoring
```yaml
# Prometheus metrics endpoint
@app.get("/metrics")
def metrics():
    # Return Prometheus metrics
    return generate_latest()

# Health check endpoint
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0",
        "services": {
            "database": check_database_health(),
            "storage": check_storage_health()
        }
    }
```

### Infrastructure Monitoring
```yaml
# Kubernetes metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: data-quality-api
spec:
  selector:
    matchLabels:
      app: data-quality-api
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

### Logging
```python
# Structured logging
import structlog

logger = structlog.get_logger()

def log_request(request, response, duration):
    logger.info(
        "request_completed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        duration=duration,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host
    )
```

## Backup and Recovery

### Database Backup
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="data_quality_backup_$DATE.sql"

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://data-quality-backups/

# Cleanup old backups (keep last 30 days)
aws s3 ls s3://data-quality-backups/ | while read -r line; do
    createDate=`echo $line | awk {'print $1" "$2'}`
    createDate=`date -d"$createDate" +%s`
    olderThan=`date --date "30 days ago" +%s`
    if [[ $createDate -lt $olderThan ]]; then
        fileName=`echo $line | awk {'print $4'}`
        if [[ $fileName != "" ]]; then
            aws s3 rm s3://data-quality-backups/$fileName
        fi
    fi
done
```

### Application Backup
```bash
# Configuration backup
kubectl get configmap -n data-quality -o yaml > config_backup.yaml
kubectl get secret -n data-quality -o yaml > secrets_backup.yaml

# Volume snapshots (if using persistent volumes)
kubectl get pvc -n data-quality
# Create snapshots as needed
```

### Disaster Recovery
1. **Immediate Response**:
   - Assess the impact
   - Notify stakeholders
   - Activate incident response team

2. **Recovery Steps**:
   ```bash
   # Restore from backup
   kubectl delete namespace data-quality
   kubectl create namespace data-quality

   # Restore configurations
   kubectl apply -f config_backup.yaml
   kubectl apply -f secrets_backup.yaml

   # Restore database
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME < latest_backup.sql

   # Redeploy application
   helm install data-quality ./infrastructure/helm
   ```

3. **Post-recovery**:
   - Verify application functionality
   - Run comprehensive tests
   - Update monitoring dashboards
   - Document lessons learned

## Security Hardening

### Container Security
```dockerfile
# Use non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

# Minimize attack surface
RUN apt-get remove -y --purge \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Security scanning
# docker scan <image>
# trivy image <image>
```

### Network Security
```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: data-quality-network-policy
spec:
  podSelector:
    matchLabels:
      app: data-quality
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

### Secret Management
```yaml
# External secret management
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: data-quality-secrets
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: data-quality-secret
    creationPolicy: Owner
  data:
  - secretKey: db-password
    remoteRef:
      key: prod/data-quality/db-password
```

## Performance Optimization

### Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_scan_results_created_at ON scan_results(created_at);
CREATE INDEX idx_scan_results_status ON scan_results(status);

-- Partition large tables
CREATE TABLE scan_results_y2024m01 PARTITION OF scan_results
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Application Optimization
```python
# Connection pooling
from psycopg2.pool import ThreadedConnectionPool

pool = ThreadedConnectionPool(
    minconn=1,
    maxconn=20,
    host=config.DB_HOST,
    database=config.DB_NAME,
    user=config.DB_USER,
    password=config.DB_PASSWORD
)

# Caching
from cachetools import TTLCache
cache = TTLCache(maxsize=1000, ttl=300)

@cachetools.cached(cache)
def get_scan_results(scan_id):
    # Expensive operation
    pass
```

### CDN Configuration
```yaml
# CloudFront distribution for static assets
apiVersion: aws.amazon.com/v1alpha1
kind: CloudFrontDistribution
metadata:
  name: data-quality-cdn
spec:
  originConfigs:
  - domainName: data-quality.company.com
    originPath: /
  enabled: true
  defaultCacheBehavior:
    targetOriginId: data-quality-origin
    viewerProtocolPolicy: redirect-to-https
    compress: true
    cachePolicyId: CachingOptimized
```

## Troubleshooting

### Common Deployment Issues

#### Pod CrashLoopBackOff
```bash
# Check pod logs
kubectl logs -f pod/data-quality-api-xyz -n data-quality

# Check events
kubectl get events -n data-quality

# Check resource usage
kubectl top pods -n data-quality

# Debug container
kubectl exec -it pod/data-quality-api-xyz -n data-quality -- /bin/bash
```

#### Service Unavailable
```bash
# Check service endpoints
kubectl get endpoints -n data-quality

# Check service configuration
kubectl describe svc data-quality-api -n data-quality

# Test connectivity
kubectl run test-pod --image=busybox --rm -it -- wget --spider http://data-quality-api:8000/api/health
```

#### Database Connection Issues
```bash
# Check database pod
kubectl get pods -l app=postgres -n data-quality

# Check database logs
kubectl logs -f deployment/postgres -n data-quality

# Test connection
kubectl exec deployment/data-quality-api -n data-quality -- nc -zv postgres 5432
```

### Rollback Procedures

#### Quick Rollback
```bash
# Rollback to previous Helm release
helm rollback data-quality 1 -n data-quality

# Or rollback deployment
kubectl rollout undo deployment/data-quality-api -n data-quality
```

#### Full Rollback
```bash
# Scale down current deployment
kubectl scale deployment data-quality-api --replicas=0 -n data-quality

# Deploy previous version
helm install data-quality-rollback ./infrastructure/helm \
  --namespace data-quality \
  --set image.tag=v0.9.0

# Switch traffic
kubectl patch ingress data-quality -n data-quality --type=json -p='[
  {"op": "replace", "path": "/spec/backend/serviceName", "value": "data-quality-rollback"}
]'
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Tasks
- Review application logs for errors
- Check disk usage on all nodes
- Verify backup integrity
- Update security patches

#### Monthly Tasks
- Rotate database credentials
- Review and update dependencies
- Performance optimization review
- Security vulnerability assessment

#### Quarterly Tasks
- Major version updates
- Architecture review
- Disaster recovery testing
- Compliance audits

### Automated Maintenance
```yaml
# CronJob for database maintenance
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: db-maintenance
spec:
  schedule: "0 2 * * 0"  # Weekly at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: maintenance
            image: postgres:13
            command:
            - /bin/bash
            - -c
            - |
              psql -c "VACUUM ANALYZE;"
              psql -c "REINDEX DATABASE data_quality;"
          restartPolicy: OnFailure
```

## Support and Escalation

### Support Levels
1. **L1 Support**: Basic monitoring and alerting
2. **L2 Support**: Application troubleshooting
3. **L3 Support**: Code changes and architecture

### Escalation Matrix
- **P0 (Critical)**: Page all team members immediately
- **P1 (High)**: Page on-call engineer within 15 minutes
- **P2 (Medium)**: Respond within 2 hours
- **P3 (Low)**: Respond within 24 hours

### Contact Information
- **Emergency**: +1-800-HELP-NOW
- **On-call**: oncall@company.com
- **DevOps Team**: devops@company.com
- **Development Team**: dev@company.com