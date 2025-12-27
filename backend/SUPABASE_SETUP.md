# Supabase Database Setup Guide

## Quick Setup Steps

### 1. Create Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email

### 2. Create a New Project
1. Click "New Project"
2. Fill in the details:
   - **Name**: hotel-booking-db
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free (generous limits)
3. Click "Create new project"
4. Wait 2-3 minutes for setup

### 3. Get Database Connection String
1. In your project dashboard, click "Settings" (gear icon)
2. Click "Database" in the left sidebar
3. Scroll down to "Connection string"
4. Select "URI" format
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
6. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the password you created

### 4. Connection String Format
Your final DATABASE_URL should look like:
```
postgresql://postgres:your_password_here@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

**Security Note**: Never commit this to git!

## What You Get (Free Tier)
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth per month
- Unlimited API requests
- Auto backups
- Perfect for development!

## Next Steps
Once you have your connection string:
1. Copy it to your `.env` file
2. Run Prisma migrations
3. Start building!
