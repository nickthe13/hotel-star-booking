# Database Connection Troubleshooting

## Current Issue
Unable to connect to Supabase database: `db.nxzxnnzbpqrjbjfoznyk.supabase.co`

## Error Message
```
P1001: Can't reach database server at db.nxzxnnzbpqrjbjfoznyk.supabase.co:5432
```

## Possible Causes & Solutions

### 1. Project Still Initializing
Supabase projects take 2-3 minutes to fully initialize after creation.

**Solution:**
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `hotel-star-booking-db`
3. Check if the status shows **Active** (green indicator)
4. Wait until initialization completes

### 2. Verify Connection String
**Steps to get the correct connection string:**
1. In your Supabase project, click **Settings** (gear icon)
2. Click **Database** in the left sidebar
3. Scroll to **Connection string** section
4. Select **URI** format
5. Copy the full connection string
6. Make sure to replace `[YOUR-PASSWORD]` with your actual password

**Important:** Your password has special characters that need URL encoding:
- `&` should be `%26`
- `$` should be `%24`

Example:
```
Original password: 27Yv&$qU_z3rm6U
URL-encoded: 27Yv%26%24qU_z3rm6U
```

### 3. Try Connection Pooler (Alternative Port)
If port 5432 doesn't work, try the connection pooler on port 6543:

**Get Pooler Connection String:**
1. Same steps as above
2. Look for **Connection Pooler** section
3. Use the pooler URL (usually on port 6543)

Update your `.env`:
```env
DATABASE_URL="postgresql://postgres:27Yv%26%24qU_z3rm6U@db.nxzxnnzbpqrjbjfoznyk.supabase.co:6543/postgres?pgbouncer=true"
```

### 4. Check Network/Firewall
**Test connectivity:**
```bash
# Windows
Test-NetConnection db.nxzxnnzbpqrjbjfoznyk.supabase.co -Port 5432

# Or try with connection pooler
Test-NetConnection db.nxzxnnzbpqrjbjfoznyk.supabase.co -Port 6543
```

If connection fails:
- Check if your firewall/antivirus is blocking the connection
- Try from a different network
- Check if your ISP blocks PostgreSQL ports

### 5. Verify Project is Active (Not Paused)
Free tier projects can be paused due to inactivity.

**Check and unpause:**
1. Go to Supabase dashboard
2. Select your project
3. If paused, there will be a banner with an "Unpause" button
4. Click **Unpause** and wait for reactivation

### 6. Reset Database Password
If you're unsure about the password:

1. Go to **Settings** → **Database**
2. Scroll to **Database password** section
3. Click **Reset database password**
4. Copy the new password
5. Update your `.env` file with URL-encoded password

## Testing the Connection

Once you've verified the above, test the connection:

```bash
cd backend

# Test Prisma connection
npx prisma db pull

# If successful, run migrations
npx prisma migrate dev --name init
```

## Current Configuration

Your current `.env` DATABASE_URL:
```env
DATABASE_URL="postgresql://postgres:27Yv%26%24qU_z3rm6U@db.nxzxnnzbpqrjbjfoznyk.supabase.co:5432/postgres"
```

## Next Steps After Connection Works

1. Run Prisma migrations to create tables:
   ```bash
   npm run prisma:migrate
   ```

2. Verify tables in Supabase:
   - Go to **Table Editor** in your Supabase dashboard
   - You should see all 8 tables: User, Hotel, Room, Booking, etc.

3. Optional: Open Prisma Studio to view/edit data:
   ```bash
   npm run prisma:studio
   ```

4. Start the NestJS server:
   ```bash
   npm run start:dev
   ```

## Still Having Issues?

If none of the above works:
1. Try creating a new Supabase project
2. Use the default database settings
3. Make sure you're using the latest connection string format
4. Contact Supabase support if the issue persists
