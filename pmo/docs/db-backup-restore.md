# Database Backup & Restore Procedures

**Last Updated**: 2025-11-21
**Database**: PostgreSQL 16
**Hosting**: Render Managed PostgreSQL (or equivalent)

---

## Overview

This document describes the backup and restore procedures for the AI Consulting PMO Platform database.

### Backup Strategy

| Backup Type       | Frequency            | Retention | Location            |
| ----------------- | -------------------- | --------- | ------------------- |
| **Automated**     | Daily at 2:00 AM UTC | 30 days   | Render backups      |
| **Manual**        | Before deployments   | 7 days    | Local + S3          |
| **Point-in-Time** | Continuous           | 7 days    | Render (if enabled) |

---

## Automated Backups

### Render Managed Backups

Render automatically creates daily backups for managed PostgreSQL databases.

**Configuration**:

1. Navigate to your database in Render dashboard
2. Go to "Backups" tab
3. Verify daily backups are enabled
4. Set retention period: **30 days**

**Schedule**: Daily at 2:00 AM UTC

**Retention**:

- Daily backups: 30 days
- Weekly backups: 90 days (if available)

**Storage**: Encrypted in Render's backup storage

### Verification

**Check backup status**:

1. Log into Render dashboard
2. Select your database service
3. Click "Backups" tab
4. Verify recent backup exists (within last 24 hours)

**Automated Alerts**:

- Set up email notifications for failed backups
- Monitor backup job status weekly

---

## Manual Backups

### When to Create Manual Backups

- ✅ Before deploying database migrations
- ✅ Before major data transformations
- ✅ Before restoring from a backup
- ✅ Monthly archival backups

### Using pg_dump

**Prerequisites**:

```bash
# Install PostgreSQL client tools
# macOS
brew install postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql-client-16
```

**Create Backup**:

```bash
# Export DATABASE_URL from Render or .env
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Create backup with timestamp
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --file="backup_$(date +%Y%m%d_%H%M%S).dump"

# Or using connection parameters
pg_dump \
  --host=<host> \
  --port=5432 \
  --username=<user> \
  --dbname=<database> \
  --format=custom \
  --compress=9 \
  --file="backup_$(date +%Y%m%d_%H%M%S).dump"
```

**Backup Options**:

- `--format=custom`: Binary format (required for pg_restore)
- `--compress=9`: Maximum compression
- `--no-owner`: Exclude ownership information
- `--no-acl`: Exclude access privileges

**Verify Backup**:

```bash
# Check file size (should be > 0)
ls -lh backup_*.dump

# List contents
pg_restore --list backup_20251121_120000.dump | head -20
```

---

## Backup Storage

### Local Storage (Development)

```bash
# Create backups directory
mkdir -p ~/backups/pmo-db

# Move backup
mv backup_*.dump ~/backups/pmo-db/

# Keep only last 7 days
find ~/backups/pmo-db -name "backup_*.dump" -mtime +7 -delete
```

### Cloud Storage (Production)

**Option 1: AWS S3**

```bash
# Install AWS CLI
brew install awscli  # macOS
# or: sudo apt-get install awscli  # Linux

# Configure AWS credentials
aws configure

# Upload backup
aws s3 cp backup_20251121_120000.dump \
  s3://your-bucket/pmo-backups/ \
  --storage-class STANDARD_IA

# Set lifecycle policy for auto-deletion after 90 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-bucket \
  --lifecycle-configuration file://lifecycle.json
```

**lifecycle.json**:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "pmo-backups/",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

**Option 2: Render Disk Storage**

If your Render service has persistent disk:

```bash
# SSH into Render service
render ssh <service-name>

# Create backup directory
mkdir -p /opt/render/backups

# Create backup
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --file="/opt/render/backups/backup_$(date +%Y%m%d_%H%M%S).dump"
```

**Note**: Render ephemeral storage is lost on deploys. Use external storage for long-term backups.

---

## Restore Procedures

### Restore to Staging

**Use Case**: Test a backup or investigate an issue

**Steps**:

1. **Create a new database instance** (don't overwrite production!)

```bash
# Via Render dashboard:
# 1. Create new PostgreSQL instance: "pmo-staging-restore"
# 2. Copy the DATABASE_URL
```

2. **Restore from backup**

```bash
# Set target database URL
export RESTORE_DB_URL="postgresql://user:pass@host:5432/pmo_staging_restore"

# Restore from local backup file
pg_restore \
  --dbname=$RESTORE_DB_URL \
  --clean \
  --no-owner \
  --no-acl \
  --verbose \
  backup_20251121_120000.dump

# Or restore from Render backup
# (Download backup from Render dashboard first)
```

3. **Verify restoration**

```bash
# Connect to restored database
psql $RESTORE_DB_URL

# Check tables exist
\dt

# Check record counts
SELECT 'users' AS table_name, COUNT(*) FROM "User";
SELECT 'clients' AS table_name, COUNT(*) FROM "Client";
SELECT 'projects' AS table_name, COUNT(*) FROM "Project";

# Exit psql
\q
```

4. **Point staging app to restored database**

Update `DATABASE_URL` in Render staging service to point to restore instance.

### Restore to Production (Emergency)

**⚠️ Use only in emergencies. This will overwrite production data!**

**Prerequisites**:

- [ ] Incident declared
- [ ] Root cause identified
- [ ] All team members notified
- [ ] Backup of current state created (even if corrupted)
- [ ] Rollback plan documented

**Steps**:

1. **Create backup of current (corrupted) database**

```bash
export DATABASE_URL="<production-db-url>"

pg_dump $DATABASE_URL \
  --format=custom \
  --file="pre_restore_backup_$(date +%Y%m%d_%H%M%S).dump"
```

2. **Put application in maintenance mode**

```bash
# Option 1: Render maintenance mode
# Dashboard → Service → Settings → Enable Maintenance Mode

# Option 2: Scale down to 0 instances
# Dashboard → Service → Scale → Set to 0

# Option 3: Update API to return 503
# (If you have a maintenance mode feature flag)
```

3. **Verify no active connections**

```bash
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM pg_stat_activity
  WHERE datname = current_database()
    AND pid <> pg_backend_pid();
"
```

4. **Terminate active connections** (if any)

```bash
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND pid <> pg_backend_pid();
"
```

5. **Restore from backup**

```bash
# Restore with --clean to drop existing objects first
pg_restore \
  --dbname=$DATABASE_URL \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose \
  backup_20251121_120000.dump 2>&1 | tee restore.log

# Review restore.log for errors
grep -i error restore.log
```

6. **Verify restoration**

```bash
# Connect and verify
psql $DATABASE_URL

# Check critical tables
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Client";
SELECT COUNT(*) FROM "Project";

# Check recent data
SELECT * FROM "User" ORDER BY "createdAt" DESC LIMIT 5;

\q
```

7. **Bring application back online**

```bash
# Restart API service
# Render: Dashboard → Service → Manual Deploy → Deploy latest commit

# OR disable maintenance mode
```

8. **Monitor for issues**

```bash
# Watch logs
render logs <service-name> --tail

# Check health endpoint
curl https://api.pmo.yourdomain.com/api/healthz

# Test critical flows
# - Login
# - View clients
# - Create project
```

9. **Document incident**

Create incident report:

- Incident timeline
- Root cause
- Data loss (if any)
- Actions taken
- Preventive measures

---

## Point-in-Time Recovery (PITR)

If Render supports PITR (or using AWS RDS):

### Enable PITR

**Render**: Check if available in your plan

**AWS RDS**:

```bash
aws rds modify-db-instance \
  --db-instance-identifier pmo-db \
  --backup-retention-period 7 \
  --apply-immediately
```

### Restore to Specific Time

```bash
# Render: Use dashboard to restore to timestamp

# AWS RDS:
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier pmo-db \
  --target-db-instance-identifier pmo-db-pitr-restore \
  --restore-time 2025-11-21T10:30:00Z
```

---

## Backup Testing

### Monthly Backup Drill

**Schedule**: First Monday of each month

**Procedure**:

1. Download latest automated backup from Render
2. Create new staging database instance
3. Restore backup to staging instance
4. Verify data integrity:
   - Check record counts match production
   - Verify recent data is present
   - Test application functionality
5. Document results
6. Destroy staging instance

**Success Criteria**:

- ✅ Backup file downloads without errors
- ✅ Restore completes in < 10 minutes
- ✅ All tables present
- ✅ Record counts match production (±5%)
- ✅ Application can connect and query data

---

## Backup Monitoring

### Automated Checks

**Script**: `scripts/check-backups.sh`

```bash
#!/bin/bash
# Check if backups are up to date

# Get last backup time from Render API
LAST_BACKUP=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/databases/$DATABASE_ID/backups" \
  | jq -r '.[0].createdAt')

# Check if backup is older than 36 hours
BACKUP_AGE=$(( ($(date +%s) - $(date -d "$LAST_BACKUP" +%s)) / 3600 ))

if [ $BACKUP_AGE -gt 36 ]; then
  echo "⚠️ Last backup is $BACKUP_AGE hours old!"
  # Send alert (email, Slack, etc.)
  exit 1
else
  echo "✅ Backup is fresh ($BACKUP_AGE hours old)"
  exit 0
fi
```

**Cron Job** (run daily):

```bash
# Add to crontab
0 9 * * * /path/to/check-backups.sh
```

---

## Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

### Target Metrics

| Metric                  | Target   | Current                  |
| ----------------------- | -------- | ------------------------ |
| **RPO** (Max data loss) | 24 hours | 24 hours (daily backups) |
| **RTO** (Max downtime)  | 1 hour   | TBD                      |

### Improving RTO

- [ ] Document and practice restore procedure
- [ ] Automate restore process
- [ ] Use PITR for sub-24-hour RPO
- [ ] Set up standby database (high availability)

---

## Retention Policy

| Backup Type      | Keep For | Reason                      |
| ---------------- | -------- | --------------------------- |
| Daily automated  | 30 days  | Compliance, recent recovery |
| Weekly manual    | 90 days  | Monthly archival            |
| Pre-deployment   | 7 days   | Quick rollback              |
| Incident backups | 1 year   | Post-mortem, legal          |

**Cleanup**:

```bash
# Delete backups older than 90 days (S3)
aws s3 ls s3://your-bucket/pmo-backups/ \
  | awk '{print $4}' \
  | while read file; do
    age=$(( ($(date +%s) - $(date -d "$(echo $file | grep -oP '\d{8}')" +%s)) / 86400 ))
    if [ $age -gt 90 ]; then
      aws s3 rm "s3://your-bucket/pmo-backups/$file"
    fi
  done
```

---

## Disaster Recovery Plan

### Scenarios

1. **Database corruption**: Restore from latest backup
2. **Accidental data deletion**: Restore from PITR or latest backup
3. **Complete infrastructure failure**: Restore to new infrastructure
4. **Ransomware**: Restore from offline/immutable backup

### Communication Plan

**Incident Response Team**:

- Lead: [Name]
- Database Admin: [Name]
- DevOps: [Name]
- Communications: [Name]

**Notification Channels**:

- Internal: Slack #incidents
- External: Status page (status.pmo.yourdomain.com)

---

## Checklist

### Daily

- [ ] Verify automated backup completed successfully

### Weekly

- [ ] Check backup storage usage
- [ ] Review backup logs for errors

### Monthly

- [ ] Test backup restoration (backup drill)
- [ ] Review and update documentation
- [ ] Audit backup retention policy

### Quarterly

- [ ] Rotate backup encryption keys (if applicable)
- [ ] Review disaster recovery plan
- [ ] Update RTO/RPO metrics

---

## Tools & Resources

**Backup Tools**:

- `pg_dump` - PostgreSQL backup utility
- `pg_restore` - PostgreSQL restore utility
- `pg_basebackup` - Base backup for PITR

**Monitoring**:

- Render Dashboard - View automated backups
- AWS S3 - Cloud backup storage
- Cron - Automated backup checks

**Documentation**:

- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/16/backup.html)
- [Render Managed Databases](https://render.com/docs/databases)
- [AWS RDS Backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)

---

**Document Maintained By**: DevOps Team
**Emergency Contact**: [Email/Phone]
**Last Drill**: TBD
**Next Scheduled Drill**: First Monday of next month
