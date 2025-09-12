# Supabase Setup Guide

This guide will help you set up Supabase authentication for the Optiqo Dashboard.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `optiqo-dashboard`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
5. Click "Create new project"

## 2. Get Your Project Credentials

1. Go to Settings → API
2. Copy the following values:
   - Project URL
   - Project API Key (anon/public)
   - Service Role Key (secret)

## 3. Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration (optional)
DATABASE_URL=your_postgresql_connection_string
```

## 4. Set Up Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `docs/database/schema.sql`
3. Run the SQL script to create the required tables and policies

## 5. Configure Authentication Settings

1. Go to Authentication → Settings
2. Configure the following:

### Site URL
- Set to your production domain (e.g., `https://yourdomain.com`)
- For development, use `http://localhost:3000`

### Redirect URLs
Add these URLs to the allowed redirect URLs:
- `http://localhost:3000/auth/callback` (development)
- `https://yourdomain.com/auth/callback` (production)

### Email Templates
Customize the email templates for:
- Confirm signup
- Reset password
- Magic link

### Email Settings
- Configure your email provider (SMTP)
- Or use Supabase's built-in email service

## 6. Test the Authentication Flow

1. Start your development server: `npm run dev`
2. Navigate to `/signup` and create a test account
3. Check your email for the confirmation link
4. Click the confirmation link to complete signup
5. Test the login flow at `/login`
6. Test password reset at `/forgot-password`

## 7. Production Deployment

### Vercel Deployment
1. Add your environment variables to Vercel:
   - Go to your project settings
   - Add the environment variables from step 3
2. Deploy your application
3. Update the Site URL and Redirect URLs in Supabase to match your production domain

### Other Platforms
- Add the same environment variables to your hosting platform
- Update Supabase settings with your production domain

## 8. Security Considerations

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Use strong passwords** for your database
3. **Enable Row Level Security (RLS)** - already configured in the schema
4. **Regularly rotate your API keys**
5. **Monitor authentication logs** in Supabase dashboard

## 9. Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your environment variables are correctly set
   - Ensure you're using the correct anon key (not service role key for client-side)

2. **"Email not confirmed" error**
   - Check your email settings in Supabase
   - Verify the redirect URL is correctly configured

3. **Database connection errors**
   - Ensure your database is running
   - Check that the schema has been applied correctly

4. **CORS errors**
   - Add your domain to the allowed origins in Supabase settings

### Getting Help

- Check the [Supabase documentation](https://supabase.com/docs)
- Join the [Supabase Discord community](https://discord.supabase.com)
- Review the authentication logs in your Supabase dashboard

## 10. Next Steps

Once authentication is working:

1. Set up user roles and permissions
2. Configure organization management
3. Add user invitation system
4. Implement audit logging
5. Set up monitoring and alerts
