# Authentication Setup Guide

This guide will help you set up authentication for the Optiqo Dashboard using Supabase.

## Prerequisites

1. A Supabase account and project
2. PostgreSQL database access
3. Node.js 18+ installed

## Step 1: Supabase Project Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or use an existing one
3. Note down your project URL and anon key from Settings > API

## Step 2: Database Schema Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL schema from `docs/database/schema.sql` to create the required tables:
   - `organizations` - Stores organization information and license counts
   - `user_profiles` - Extends Supabase auth with user profile data
   - Row Level Security (RLS) policies for data protection

## Step 3: Environment Configuration

1. Copy `env.example` to `.env` in your project root
2. Fill in your Supabase credentials:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration (if needed)
DATABASE_URL=your_postgresql_connection_string
```

## Step 4: Supabase Configuration

1. In your Supabase dashboard, go to Authentication > Settings
2. Configure the following settings:

### Site URL
- Set to `http://localhost:3000` for development
- Set to your production domain for production

### Redirect URLs
Add these URLs to the allowed redirect URLs:
- `http://localhost:3000/**` (for development)
- `https://yourdomain.com/**` (for production)

### Email Settings
- Configure your email provider (SMTP or use Supabase's built-in email)
- Customize email templates if needed

## Step 5: Authentication Features

The authentication system includes:

### User Registration
- Email/password signup
- Organization creation during signup
- License count specification
- Terms and conditions acceptance

### User Login
- Email/password authentication
- Remember me functionality
- Password reset capability

### Organization Management
- Automatic organization creation on signup
- License count validation
- User role management (admin, editor, viewer)

### Security Features
- Row Level Security (RLS) policies
- JWT token-based authentication
- Secure password handling
- Session management

## Step 6: Testing the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Test the signup flow:
   - Click "create a new account"
   - Fill in the registration form
   - Create an organization
   - Verify you're redirected to the dashboard

## Step 7: Database Functions

The schema includes helpful database functions:

### `check_organization_licenses(org_id UUID)`
Returns true if the organization has available licenses.

### `get_organization_license_usage(org_id UUID)`
Returns current user count, max licenses, and available licenses.

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Verify your Supabase URL and anon key are correct
   - Check that the environment variables are loaded properly

2. **Database connection errors**
   - Ensure your database schema is set up correctly
   - Check that RLS policies are properly configured

3. **Authentication redirect issues**
   - Verify redirect URLs are configured in Supabase
   - Check that the site URL matches your domain

4. **User profile not loading**
   - Ensure the `user_profiles` table exists
   - Check that the user has a profile record

### Debug Mode

Enable debug mode by adding to your `.env`:
```bash
NUXT_SUPABASE_DEBUG=true
```

This will provide detailed logging for authentication issues.

## Production Deployment

1. Update environment variables with production values
2. Configure production redirect URLs in Supabase
3. Set up proper email provider for production
4. Test all authentication flows in production environment

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Keys**: Use service role key only on the server side
3. **RLS Policies**: Regularly review and update security policies
4. **Password Policy**: Configure strong password requirements in Supabase
5. **Session Management**: Implement proper session timeout and refresh

## Next Steps

After setting up authentication, you can:

1. Implement user invitation system
2. Add role-based access control
3. Set up organization management features
4. Implement password reset functionality
5. Add two-factor authentication (2FA)

For more information, refer to the [Supabase Documentation](https://supabase.com/docs) and the project's implementation guidelines.
