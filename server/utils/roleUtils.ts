/**
 * Utility functions for role handling
 */

/**
 * Capitalizes a role string and validates it against allowed roles
 * @param role - The role string to capitalize and validate
 * @returns The capitalized role if valid, throws error if invalid
 */
export function capitalizeRole(role: string): string {
  if (!role || typeof role !== 'string') {
    throw new Error('Role must be a non-empty string')
  }

  const capitalizedRole = role.toUpperCase().trim()
  
  // Validate against allowed roles
  const allowedRoles = ['ADMIN', 'EDITOR', 'VIEWER']
  if (!allowedRoles.includes(capitalizedRole)) {
    throw new Error(`Invalid role: ${capitalizedRole}. Must be one of: ${allowedRoles.join(', ')}`)
  }

  return capitalizedRole
}

/**
 * Validates role for new user creation - only allows EDITOR
 * @param role - The role string to validate
 * @returns Always returns 'EDITOR' for new user creation
 */
export function validateNewUserRole(role?: string): string {
  // Always create new users as EDITOR regardless of input
  return 'EDITOR'
}

/**
 * Validates role for new viewer creation - only allows VIEWER
 * @param role - The role string to validate
 * @returns Always returns 'VIEWER' for new viewer creation
 */
export function validateNewViewerRole(role?: string): string {
  // Always create new viewers as VIEWER regardless of input
  return 'VIEWER'
}

/**
 * Safely capitalizes a role string, returning null if invalid
 * @param role - The role string to capitalize
 * @returns The capitalized role if valid, null if invalid
 */
export function safeCapitalizeRole(role: string | null | undefined): string | null {
  if (!role || typeof role !== 'string') {
    return null
  }

  try {
    return capitalizeRole(role)
  } catch {
    return null
  }
}
