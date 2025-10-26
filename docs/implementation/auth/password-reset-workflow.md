# Password Reset Workflow Implementation

## Overview

This document describes the complete implementation of a password reset workflow using Supabase's PKCE (Proof Key for Code Exchange) authentication flow. The implementation handles the entire user journey from requesting a password reset to successfully setting a new password.

## Architecture

The password reset workflow consists of four main components:

1. **Forgot Password Page** (`pages/forgot-password.vue`) - Handles password reset initiation
2. **Auth Callback Page** (`pages/auth/callback.vue`) - Handles session verification and routing
3. **Reset Password Page** (`pages/reset-password.vue`) - Handles password reset completion
4. **useAuth Composable** (`composables/useAuth.ts`) - Manages Supabase API calls

## Detailed Flow

### Step 1: User Initiates Password Reset

**Location**: `pages/forgot-password.vue`

```typescript
// User enters email and clicks "Send reset link"
const result = await resetPassword(form.email)
```

**What happens**:
1. User enters email address in forgot password form
2. Form validates email format
3. Calls `auth.resetPassword(email)` from useAuth composable
4. Supabase sends password reset email with secure link

**Email contains**: Link like `https://your-app.com/auth/callback?code=<recovery_code>`

### Step 2: Supabase PKCE Flow

**Location**: `composables/useAuth.ts`

```typescript
const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${config.public.siteUrl || window.location.origin}/auth/callback`
})
```

**Technical details**:
- Uses PKCE (Proof Key for Code Exchange) for security
- Generates code verifier and code challenge
- Sends email with recovery link containing auth code
- Configures redirect URL to `/auth/callback`

### Step 3: User Clicks Email Link

**URL Format**: `https://your-app.com/auth/callback?code=<recovery_code>`

**What happens**:
1. User clicks link in email
2. Browser navigates to `/auth/callback?code=<recovery_code>`
3. Supabase **automatically** exchanges the code for a session (PKCE completion)
4. Callback page verifies the recovery session and redirects to `/reset-password`

### Step 4: Session Validation and Password Form

**Location**: `pages/auth/callback.vue` and `pages/reset-password.vue`

**Callback Page Verification**:
```typescript
// Verify recovery session in callback page
const { data: { session } } = await supabase.auth.getSession()

if (session?.user) {
  // Check if this is a recovery session
  const isRecoverySession = session.user.recovery_sent_at ||
                           session.user.app_metadata?.provider === 'email'

  if (isRecoverySession) {
    // Redirect to reset password page
    await navigateTo('/reset-password')
  }
}
```

**Reset Password Page**:
```typescript
// Check for existing recovery session
const { data: { session } } = await supabase.auth.getSession()

// Verify it's a recovery session
const isRecoverySession = session.user.recovery_sent_at ||
                         session.user.app_metadata?.provider === 'email'

if (isRecoverySession) {
  hasValidSession.value = true
  // Show password form
}
```

**Key validation**:
- Check if session exists
- Verify `recovery_sent_at` timestamp (indicates recovery session)
- Check `app_metadata.provider` (should be 'email' for recovery)

### Step 5: User Sets New Password

**Location**: `pages/reset-password.vue`

```typescript
const { error: updateError } = await supabase.auth.updateUser({
  password: newPassword.value
})
```

**What happens**:
1. User enters new password (with confirmation)
2. Form validates password requirements
3. Calls `supabase.auth.updateUser({ password })`
4. Supabase updates user password in database
5. Session remains active with new password

### Step 6: Success and Redirect

```typescript
success.value = 'Password updated successfully!'

// Redirect after 2 seconds
setTimeout(() => {
  navigateTo('/login?message=password-updated')
}, 2000)
```

## Configuration Requirements

### Nuxt Config (`nuxt.config.ts`)

```typescript
supabase: {
  redirectOptions: {
    login: '/login',
    callback: '/auth/callback',
    exclude: [
      '/', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'
    ]
  }
}
```

**Important**: The reset password page and callback page must be in the `exclude` array so unauthenticated users can access them during the recovery flow.

### Supabase Dashboard Configuration

1. **Enable Anonymous Sign-ins**: Required for the PKCE flow
2. **Site URL**: Set to your production domain
3. **Redirect URLs**: Add both HTTP and HTTPS variants:
   ```toml
   additional_redirect_urls = [
     "https://your-domain.com",
     "http://your-domain.com",
     "https://localhost:3001",
     "http://localhost:3001"
   ]
   ```

## Common Issues and Solutions

### Issue 1: Double Code Exchange Error

**Error**: `"invalid request: both auth code and code verifier should be non-empty"`

**Root Cause**: Calling `exchangeCodeForSession()` manually when Supabase already exchanged the code automatically.

**Solution**: Remove manual `exchangeCodeForSession()` call and rely on automatic session creation.

### Issue 2: Session Not Detected

**Error**: `"Please use the link from your email to reset your password"`

**Root Cause**: Session validation logic incorrect or session expired.

**Solution**:
```typescript
// Check for recovery indicators
const isRecoverySession = session.user.recovery_sent_at || 
                         session.user.app_metadata?.provider === 'email'
```

### Issue 3: Variable Scoping Errors

**Error**: `"Cannot access 'variable' before initialization"`

**Root Cause**: Using variables before declaration in reactive context.

**Solution**: Declare variables before using them in console.log statements.

## Testing the Flow

### Manual Testing Steps

1. **Start the application** in development mode
2. **Open browser console** to see verbose logging
3. **Navigate to login page**
4. **Click "Forgot your password?"**
5. **Enter email address** and submit
6. **Check email** for reset link
7. **Click reset link** - should navigate to `/auth/reset-password`
8. **Verify console shows** successful session detection
9. **Enter new password** and submit
10. **Verify success message** and redirect

### Automated Testing

```typescript
// Test reset password initiation
const auth = useAuth()
const result = await auth.resetPassword('test@example.com')
expect(result.success).toBe(true)

// Test session validation (mock session)
const mockSession = {
  user: {
    recovery_sent_at: new Date().toISOString(),
    app_metadata: { provider: 'email' }
  }
}
// Verify isRecoverySession logic
```

## Security Considerations

### PKCE Security
- Uses cryptographically secure code verifier generation
- Prevents authorization code interception attacks
- One-time use codes prevent replay attacks

### Session Security
- Recovery sessions are temporary and expire
- Sessions are tied to specific recovery flow
- No persistent sessions created during reset

### Rate Limiting
- Supabase implements rate limiting (default: 30 requests/hour per IP)
- Consider implementing CAPTCHA for production

## Production Deployment

### Environment Variables
```bash
# Required for production
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
PUBLIC_BASE_URL=https://your-production-domain.com
```

### Supabase Configuration
1. Set production site URL in Supabase dashboard
2. Add production redirect URLs
3. Enable email provider (SendGrid, etc.)
4. Configure custom email templates

## Troubleshooting Guide

### Debug Logging
Enable verbose logging in development:
```javascript
// Check console for these log patterns:
🔄 [STEP 1] Starting password reset...
📧 [STEP 1] Calling resetPasswordForEmail()...
🔍 [STEP 2] Checking for recovery code...
✅ [STEP 2] Valid recovery session detected!
🔐 [STEP 3] Calling updateUser()...
```

### Common Error Patterns

| Error | Cause | Solution |
|-------|-------|----------|
| `validation_failed` | Double code exchange | Remove manual `exchangeCodeForSession()` |
| `Session not found` | Invalid redirect URL | Check Supabase redirect URLs configuration |
| `Cannot access before init` | Variable scoping | Declare variables before use |

## Integration with Other Features

### Profile Management
The reset password flow integrates with:
- User profile pages (`/profile`)
- Authentication state management
- Session persistence

### Email Templates
Customize email templates in Supabase:
```html
<!-- Custom reset password email -->
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<a href="{{ .RecoveryURL }}">Reset Password</a>
```

## Best Practices

1. **Always exclude reset page** from auth middleware
2. **Use proper session validation** with recovery indicators
3. **Implement comprehensive error handling**
4. **Add verbose logging** for debugging
5. **Test end-to-end flow** in all environments
6. **Monitor for abuse** with rate limiting
7. **Keep security dependencies updated**

## Related Files

- `pages/forgot-password.vue` - Password reset initiation
- `pages/auth/callback.vue` - Session verification and routing
- `pages/reset-password.vue` - Password reset completion
- `composables/useAuth.ts` - Supabase API integration
- `nuxt.config.ts` - Supabase configuration
- `supabase/config.toml` - Supabase project settings

## Version History

- **v1.0**: Initial implementation with PKCE flow
- **v1.1**: Fixed double code exchange issue
- **v1.2**: Added comprehensive error handling and logging
- **v1.3**: Updated to use callback-based flow instead of direct reset page access
- **v1.4**: Enhanced session validation with recovery indicators
- **v1.5**: Added comprehensive logging for debugging and troubleshooting

---

This implementation follows Supabase's official documentation and security best practices for password reset workflows.
