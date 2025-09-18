/**
 * Centralized redirect utility for role-based navigation
 * Handles all user role redirects consistently across the application
 */

export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER'

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  organizationId: string | null
  role: UserRole
  organization?: any
  avatar_url?: string | null
  created_at: string
}

/**
 * Get the appropriate redirect path based on user role
 * @param role - The user's role
 * @returns The path to redirect to
 */
export function getRedirectPathByRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'EDITOR':
    case 'VIEWER':
      return '/dashboard'
    default:
      // Fallback for unknown roles
      console.warn(`Unknown role: ${role}, defaulting to dashboard`)
      return '/dashboard'
  }
}

/**
 * Get redirect path from user profile
 * @param userProfile - The user profile object
 * @returns The path to redirect to, or null if no profile
 */
export function getRedirectPathFromProfile(userProfile: UserProfile | null): string | null {
  if (!userProfile?.role) {
    return null
  }
  
  return getRedirectPathByRole(userProfile.role)
}

/**
 * Check if a user can access a specific path based on their role
 * @param role - The user's role
 * @param path - The path to check access for
 * @returns True if the user can access the path
 */
export function canAccessPath(role: UserRole, path: string): boolean {
  // Admin can access everything
  if (role === 'ADMIN') {
    return true
  }
  
  // Non-admin users cannot access admin paths
  if (path.startsWith('/admin')) {
    return false
  }
  
  // All other paths are accessible to EDITOR and VIEWER
  return true
}

/**
 * Get the appropriate fallback path if user cannot access requested path
 * @param role - The user's role
 * @param requestedPath - The path they tried to access
 * @returns The fallback path to redirect to
 */
export function getFallbackPath(role: UserRole, requestedPath: string): string {
  // If they tried to access admin but aren't admin, redirect to their dashboard
  if (requestedPath.startsWith('/admin') && role !== 'ADMIN') {
    return getRedirectPathByRole(role)
  }
  
  // Default to their role-based dashboard
  return getRedirectPathByRole(role)
}
