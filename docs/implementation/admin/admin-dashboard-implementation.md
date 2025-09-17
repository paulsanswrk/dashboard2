# Admin Dashboard Implementation

## Overview

This document describes the implementation of the Admin Dashboard functionality in the Optiqo application. The admin dashboard provides organization-wide management capabilities for users with ADMIN role, while maintaining the ability for admins to switch to a user view for testing purposes.

## Key Features Implemented

### 1. Role-Based Authentication & Redirects
- **Post-Login Redirects**: ADMIN users are automatically redirected to `/admin` after login
- **Route Protection**: Non-ADMIN users cannot access `/admin` (redirected to `/dashboard`)
- **Flexible Access**: ADMIN users can access both `/admin` and `/dashboard` directly

### 2. Separate Dashboard Pages
- **Admin Dashboard** (`/admin`): Organization-wide management view
- **User Dashboard** (`/dashboard`): Personal workspace view
- **Distinct Content**: Each dashboard shows different metrics and actions appropriate to its context

### 3. Context-Aware Navigation
- **Route-Based Navigation**: Sidebar navigation adapts based on current page, not user role
- **Admin Navigation**: Shows Dashboard, Users, Viewers, Organizations
- **User Navigation**: Shows full user menu including Data Sources, My Desk, etc.

### 4. Enhanced Account Menu
- **Dual Dashboard Access**: ADMIN users see both "Admin Dashboard" and "User Dashboard" links
- **Seamless Switching**: Easy navigation between admin and user views

## Implementation Details

### File Structure
```
pages/
├── admin.vue                    # Admin dashboard page
├── dashboard.vue                # User dashboard page
└── organizations.vue            # Organizations management page

components/
└── AppLayout.vue                # Updated with route-based navigation

middleware/
└── auth.ts                      # Updated with role-based redirects

pages/auth/
└── callback.vue                 # Updated with role-based redirects

pages/
└── login.vue                    # Updated with role-based redirects
```

### Key Components

#### 1. Admin Dashboard (`pages/admin.vue`)
- **Organization Overview**: Shows total charts, dashboards, users, viewers
- **Recent Activity**: Organization-wide activity feed
- **Quick Actions**: Management shortcuts for Users, Viewers, Organizations
- **System Settings**: Access to account and billing settings

#### 2. User Dashboard (`pages/dashboard.vue`)
- **Personal Workspace**: Shows personal metrics (My Charts, My Dashboards)
- **Recent Activity**: Personal activity feed
- **Quick Actions**: User-focused actions (Connect Data, Create Dashboard)
- **Organization Context**: Shows which organization the user is working in

#### 3. Organizations Management (`pages/organizations.vue`)
- **CRUD Interface**: Complete organization management
- **Table View**: Organization details, user counts, creation dates
- **Modal Forms**: Create/Edit organization functionality
- **Delete Confirmation**: Safe organization deletion

### Navigation Logic

#### Route-Based Navigation (AppLayout.vue)
```javascript
const navigationItems = computed(() => {
  // If we're on admin pages, show admin navigation
  if (route.path.startsWith('/admin') || route.path.startsWith('/organizations')) {
    return [
      { icon: 'heroicons:home', label: 'Dashboard', route: '/admin' },
      { icon: 'heroicons:users', label: 'Users', route: '/users' },
      { icon: 'heroicons:eye', label: 'Viewers', route: '/viewers' },
      { icon: 'heroicons:building-office', label: 'Organizations', route: '/organizations' }
    ]
  } else {
    // For all other pages, show regular user navigation
    return [
      { icon: 'heroicons:home', label: 'Dashboard', route: '/dashboard' },
      { icon: 'heroicons:circle-stack', label: 'Data Sources', route: '/data-sources' },
      { icon: 'heroicons:chart-bar', label: 'My Desk', route: '/my-dashboard' },
      // ... other user navigation items
    ]
  }
})
```

#### Account Menu Enhancement
```javascript
// Add dashboard navigation for ADMIN users
if (userProfile.value?.role === 'ADMIN') {
  baseItems.push([{
    label: 'Admin Dashboard',
    icon: 'heroicons:shield-check',
    click: () => navigateTo('/admin')
  }, {
    label: 'User Dashboard',
    icon: 'heroicons:home',
    click: () => navigateTo('/dashboard')
  }])
}
```

### Authentication Flow

#### Login Redirects
```javascript
// Redirect based on user role
if (userProfile.value?.role === 'ADMIN') {
  await navigateTo('/admin')
} else {
  await navigateTo('/my-dashboard')
}
```

#### Middleware Protection
```javascript
// Check if user is not ADMIN and trying to access admin - redirect to dashboard
if (profile.role !== 'ADMIN' && to.path === '/admin') {
  return navigateTo('/dashboard')
}
```

## Data Flow

### 1. User Authentication
1. User logs in via `/login`
2. Auth middleware validates user and loads profile
3. Role-based redirect to appropriate dashboard
4. Navigation adapts based on current route

### 2. Dashboard Switching
1. ADMIN user clicks "User Dashboard" in account menu
2. Navigates to `/dashboard`
3. Navigation switches to user navigation
4. Content shows user-focused dashboard

### 3. Organization Management
1. ADMIN user navigates to `/organizations`
2. Navigation shows admin navigation
3. CRUD operations for organization management
4. Real-time updates to organization list

## Security Considerations

### 1. Route Protection
- Non-ADMIN users cannot access `/admin` routes
- Middleware validates user role before allowing access
- Automatic redirects prevent unauthorized access

### 2. Data Access
- Admin dashboard shows organization-wide data
- User dashboard shows personal data only
- Proper data filtering based on user context

### 3. Navigation Security
- Navigation items are filtered based on user permissions
- Admin-only features are only visible to ADMIN users
- Context-aware navigation prevents confusion

## Testing Scenarios

### 1. Admin User Testing
- **Admin View**: Access `/admin` to see organization management
- **User View**: Access `/dashboard` to test user experience
- **Navigation**: Verify navigation adapts correctly
- **Switching**: Test seamless switching between views

### 2. Regular User Testing
- **User View**: Access `/dashboard` for normal user experience
- **Admin Protection**: Verify `/admin` redirects to `/dashboard`
- **Navigation**: Ensure full user navigation is available

### 3. Organization Management
- **CRUD Operations**: Test create, read, update, delete organizations
- **Data Validation**: Verify form validation works correctly
- **Permissions**: Ensure only admins can manage organizations

## Future Enhancements

### 1. Real Data Integration
- Replace mock data with actual API calls
- Implement real-time updates for organization statistics
- Add proper error handling and loading states

### 2. Advanced Admin Features
- Bulk operations for user management
- Organization analytics and reporting
- Advanced permission management

### 3. User Experience Improvements
- Dashboard customization options
- Saved preferences for admin/user view
- Quick access shortcuts

## Dependencies

### Required Composables
- `useAuth()`: User authentication and profile management
- `useTheme()`: Theme management for consistent styling

### Required Components
- `UCard`: Card layout components
- `UButton`: Button components with various styles
- `UModal`: Modal dialogs for forms
- `UForm`: Form components with validation
- `UAlert`: Alert components for notifications

### Required Icons
- `heroicons:home`: Dashboard icons
- `heroicons:users`: User management icons
- `heroicons:eye`: Viewer management icons
- `heroicons:building-office`: Organization icons
- `heroicons:chart-bar`: Chart and analytics icons

## Conclusion

The Admin Dashboard implementation provides a comprehensive solution for organization management while maintaining flexibility for admin users to test the user experience. The route-based navigation system ensures that users see appropriate navigation for their current context, and the dual dashboard system allows for effective testing and management workflows.

The implementation follows Vue 3 Composition API best practices and integrates seamlessly with the existing Nuxt/Supabase architecture. The modular design allows for easy extension and maintenance as the application grows.
