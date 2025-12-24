# Database Schema - Blue Drum AI

## Core Tables

### `users`
- Links Clerk authentication to Supabase
- Stores user profile (gender, relationship status)
- Tracks login history and activity

### `vault_entries`
- Evidence storage (photos, documents, tickets)
- Links to Supabase Storage
- Includes metadata and file hashes

### `chat_analyses`
- WhatsApp chat analysis results
- Risk scores and red flags
- AI-generated insights

### `income_tracker`
- Monthly income/expense tracking
- Disposable income calculations
- Rajnesh v. Neha compliance

### `dv_incidents`
- Domestic violence incident logs
- Evidence attachments
- Medical reports

### `dowry_entries`
- Dowry gift documentation
- Transfer evidence
- Witness contacts

## Logging & Analytics Tables

### `audit_logs`
- All data changes tracked
- Before/after values
- User actions

### `api_logs`
- All API requests logged
- Performance metrics
- Error tracking

### `user_activities`
- User behavior tracking
- Feature usage
- Session activity

### `user_sessions`
- Login session tracking
- Device information
- Location data

### `user_preferences`
- User settings
- Notification preferences
- Privacy levels

### `compliance_logs`
- GDPR requests
- Data export/deletion
- Consent management

## Migrations

Run migrations in Supabase SQL Editor in this order:

1. `001_initial_schema.sql` - Core tables
2. `004_audit_logs.sql` - Logging & analytics tables
3. `002_rls_policies.sql` - Row Level Security (optional)
4. `003_storage_setup.sql` - Storage policies (optional)

## Legacy Tables

- `waitlist` - Waitlist signups
- `risk_checks` - Risk calculator results

