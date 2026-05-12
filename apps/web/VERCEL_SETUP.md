# Vercel Deployment Setup

## Environment Variables Required

To deploy this application on Vercel, you need to configure the following environment variables in your Vercel project settings:

### Required Variables:

1. **DATABASE_URL**
   - Your Neon PostgreSQL database connection string
   - Format: `postgresql://user:password@host:5432/database?sslmode=require`
   - Get this from your Neon dashboard: https://console.neon.tech

2. **NEXTAUTH_SECRET**
   - A random secret string for NextAuth.js
   - Generate one using: `openssl rand -base64 32`
   - Or visit: https://generate-secret.vercel.app/32

3. **NEXTAUTH_URL**
   - Your production URL
   - Format: `https://your-app.vercel.app`
   - Vercel will auto-set this, but you can override it

4. **OPENAI_API_KEY** (Optional)
   - Only needed if using AI chat features
   - Get from: https://platform.openai.com/api-keys

---

## Step-by-Step Deployment Guide

### 1. Add Environment Variables in Vercel

```bash
# Go to: https://vercel.com/your-username/your-project/settings/environment-variables

# Add these variables:
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-app.vercel.app
OPENAI_API_KEY=sk-your-key-here  # Optional
```

### 2. Run Database Migrations

After deploying, run migrations to set up your database:

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Run migration script
vercel env pull .env.local
cd apps/web
npx tsx scripts/migrate.ts
```

### 3. Seed Initial Data (Optional)

```bash
cd apps/web
npx tsx db/seed.ts
# Or seed specific content:
npx tsx db/seed-react19.ts
npx tsx db/seed-python.ts
```

---

## Troubleshooting

### Build Error: DATABASE_URL is not defined

**Solution**: The code now handles missing DATABASE_URL during build. Just ensure it's set in Vercel environment variables for runtime.

### Migration Errors

**Problem**: Tables don't exist or schema is outdated

**Solution**:
```bash
cd apps/web
npx tsx scripts/migrate.ts
```

### Authentication Issues

**Problem**: Login/signup not working

**Solution**: 
1. Check NEXTAUTH_SECRET is set
2. Check NEXTAUTH_URL matches your domain
3. Clear browser cookies and try again

---

## Vercel CLI Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check logs
vercel logs

# View environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

---

## Post-Deployment Checklist

- [ ] Environment variables are set in Vercel
- [ ] Database migrations have been run
- [ ] Can access the homepage
- [ ] Can sign up and login
- [ ] Dashboard loads correctly
- [ ] Courses page shows content
- [ ] Playground is accessible

---

## Quick Verification

After deployment, test these flows:

1. ✅ Visit homepage → Should load without errors
2. ✅ Sign up → Should auto-login and redirect to dashboard
3. ✅ Login → Should redirect to dashboard
4. ✅ Browse courses → Should show course list with search/filter
5. ✅ Access dashboard → Should show user stats

---

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Run migrations if database errors occur
4. Check browser console for client-side errors

For more help, see:
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Neon Docs: https://neon.tech/docs
