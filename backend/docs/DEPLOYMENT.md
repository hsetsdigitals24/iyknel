# FMCG Backend - Deployment Guide

## Production Deployment on Hetzner VPS

### Prerequisites
- Hetzner VPS (Ubuntu 22.04 LTS recommended, 8GB RAM, 4 vCPU)
- Domain name
- SSL certificates (Let's Encrypt)
- Docker & Docker Compose installed
- GitHub Actions configured for CI/CD

---

## Step 1: VPS Setup

### 1.1 Initial Server Configuration
```bash
# SSH into VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
apt install -y git

# Create app directory
mkdir -p /app/fmcg-backend
cd /app/fmcg-backend
```

### 1.2 Clone Repository
```bash
git clone https://github.com/your-org/fmcg-backend.git .
cd /app/fmcg-backend
```

### 1.3 Create Production Environment File
```bash
# securely copy from local or create on VPS
nano .env.production

# Fill in with production values:
DATABASE_URL=postgresql://fmcg_prod_user:STRONG_PASSWORD@postgres:5432/fmcg_b2b_prod
REDIS_URL=redis://redis:6379
JWT_SECRET=GENERATE_STRONG_SECRET_KEY
PAYSTACK_SECRET_KEY=pk_live_actual_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_actual_key
SMTP_HOST=smtp.mailgun.org
SMTP_USER=postmaster@mail.yourdomain.com
SMTP_PASSWORD=mailgun_password
FRONTEND_URL=https://app.yourdomain.com
FRONTEND_PRODUCTION_URL=https://app.yourdomain.com
NODE_ENV=production
LOG_LEVEL=info
```

---

## Step 2: Configure SSL/TLS

### 2.1 Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 2.2 Generate Certificates
```bash
# Request certificate from Let's Encrypt
certbot certonly --standalone -d api.yourdomain.com

# Certificates stored in /etc/letsencrypt/live/api.yourdomain.com/
```

### 2.3 Update nginx.conf
```bash
# Update packages/nginx.conf to include SSL:
# Listen on 443 with certificates
# Redirect 80 → 443

# Reference certificate paths:
# ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
```

### 2.4 Auto-Renew Certificates
```bash
# Create renewal script
cat > /etc/cron.d/certbot-renewal << EOF
0 2 * * * certbot renew --quiet && systemctl reload nginx
EOF
```

---

## Step 3: Docker Compose Configuration

### 3.1 Create docker-compose.prod.yml
```bash
# Copy and modify for production:
cp docker-compose.yml docker-compose.prod.yml

# Edit docker-compose.prod.yml:
# - Remove build: sections, use pre-built images from registry
# - Add restart: always to all services
# - Add resource limits (memory, CPU)
# - Set NODE_ENV=production
```

### 3.2 Update Environment Variables
```bash
# In docker-compose.prod.yml, reference .env.production:
env_file:
  - .env.production
```

---

## Step 4: Database Backup Strategy

### 4.1 Automated Backups
```bash
# Create backup script
cat > /app/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec fmcg-postgres pg_dump -U fmcg_user -d fmcg_b2b > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/fmcg/

echo "Backup completed: db_$DATE.sql.gz"
EOF

chmod +x /app/backup-db.sh

# Schedule daily backups
echo "0 2 * * * /app/backup-db.sh" | crontab -
```

### 4.2 Restore from Backup
```bash
# To restore:
gunzip -c /app/backups/db_TIMESTAMP.sql.gz | docker exec -i fmcg-postgres psql -U fmcg_user -d fmcg_b2b
```

---

## Step 5: Deployment Script

### 5.1 Create Deploy Script
```bash
cat > /app/deploy.sh << 'EOF'
#!/bin/bash
set -e

cd /app/fmcg-backend

echo "🚀 Starting FMCG Backend Deployment..."

# Pull latest code
git pull origin main

# Build images (if not using pre-built)
docker-compose -f docker-compose.prod.yml build

# Run migrations
docker-compose -f docker-compose.prod.yml exec -T postgres npm run prisma:migrate

# Stop old containers gracefully
docker-compose -f docker-compose.prod.yml down

# Start new containers
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
sleep 10

# Health check
if curl -f http://localhost/api/products/health > /dev/null; then
  echo "✅ Deployment successful!"
  # Optional: Send notification to Slack
else
  echo "❌ Health check failed!"
  docker-compose -f docker-compose.prod.yml down
  exit 1
fi
EOF

chmod +x /app/deploy.sh
```

### 5.2 Git Webhook for Auto-Deploy
```bash
# Create webhook listener on port 8000
# When push to main branch → run /app/deploy.sh
# Use service like https://github.com/adnanh/webhook or similar
```

---

## Step 6: Monitoring & Logging

### 6.1 Set Up Logging
```bash
# Create log directory
mkdir -p /app/logs

# Update docker-compose.prod.yml to mount logs:
volumes:
  - /app/logs:/var/log/app

# Rotate logs
cat > /etc/logrotate.d/fmcg << EOF
/app/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
}
EOF
```

### 6.2 Health Monitoring
```bash
# Create monitoring script
cat > /app/monitor.sh << 'EOF'
#!/bin/bash

# Check if all services are running
services=("auth-service" "product-service" "pricing-service" "buyer-service" \
          "cart-checkout-service" "order-service" "payment-service" \
          "inventory-service" "notification-service")

for service in "${services[@]}"; do
  if ! docker-compose ps | grep -q "$service.*Up"; then
    echo "❌ $service is DOWN"
    # Can send alert here
  fi
done

# Check disk space
DISK_USAGE=$(df /app | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "⚠️  Disk usage at ${DISK_USAGE}%"
fi

# Check database connectivity
if ! docker exec fmcg-postgres pg_isready -U fmcg_user > /dev/null; then
  echo "❌ Database connection failed"
fi
EOF

chmod +x /app/monitor.sh

# Schedule monitoring every 5 minutes
echo "*/5 * * * * /app/monitor.sh" | crontab -
```

---

## Step 7: Performance Tuning

### 7.1 PostgreSQL Optimization
```bash
# Edit PostgreSQL configuration in docker-compose.prod.yml
command: 
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=1GB"
  - "-c"
  - "work_mem=16MB"
  - "-c"
  - "maintenance_work_mem=64MB"
```

### 7.2 Redis Optimization
```bash
# Update redis configuration
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### 7.3 Nginx Caching
```bash
# Enable caching for product searches
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=products:10m max_size=100m

location /api/products {
  proxy_cache products;
  proxy_cache_valid 200 5m;
  # ...
}
```

---

## Step 8: Verification Checklist

Before going live:

- [ ] SSL certificates installed and auto-renewing
- [ ] Database backups automated and tested
- [ ] All services pass health checks
- [ ] Performance tested (< 3s response time)
- [ ] Scaling tested (100+ concurrent users)
- [ ] Logs being captured and rotated
- [ ] Monitoring alerts configured
- [ ] Disaster recovery plan documented
- [ ] Team trained on deployment process

---

## Rollback Procedure

If deployment fails:

```bash
# Option 1: Revert to previous version
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml down
git checkout previous-commit-hash
docker-compose -f docker-compose.prod.yml up -d

# Option 2: Restore from backup
/app/backup-restore.sh timestamp
```

---

## Scheduled Maintenance

```bash
# Create maintenance window script
cat > /app/maintenance.sh << 'EOF'
#!/bin/bash

# Show maintenance page
# Run database cleanup
docker-compose -f docker-compose.prod.yml exec postgres vacuumdb -U fmcg_user fmcg_b2b

# Clear old logs
find /app/logs -mtime +30 -delete

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

echo "Maintenance completed"
EOF

# Run monthly (first Sunday at 2:00 AM)
echo "0 2 * * 0 /app/maintenance.sh" | crontab -
```

---

## Emergency Contacts & Runbooks

Document:
1. **On-call escalation contacts**
2. **Critical incident runbook** (database corruption, service down, etc.)
3. **Payment failure handling** (Paystack/Flutterwave issues)
4. **Data breach response**
5. **Performance debugging** (query optimization, caching)

---

## Post-Deployment Validation

```bash
# Run full health suite
curl http://localhost/api/products/health
curl http://localhost/api/auth/health
curl http://localhost/api/orders/health
curl http://localhost/api/payments/health
curl http://localhost/api/inventory/health

# Load test critical paths
# Test order creation → payment → inventory flow
# Verify tiered pricing calculations
```

---

## Support & Escalation

- **Infrastructure Issues**: Contact Hetzner support
- **Database Performance**: Check PostgreSQL logs
- **Service Failures**: Review Docker logs
- **Payment Processing**: Contact Paystack/Flutterwave support
- **Email Delivery**: Check SMTP/Mailgun status

---

## Scaling for Growth

When traffic grows:

1. **Horizontal scaling**: Run multiple instances of services behind load balancer
2. **Database optimization**: Add read replicas for reporting
3. **Cache layer**: Expand Redis for product catalog
4. **CDN**: Use Cloudflare for R2 media delivery
5. **Queue scaling**: Separate Bull workers on dedicated containers

See `docs/SCALING.md` for detailed scaling architecture.
