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
  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(capitalizedRole)) {
    throw new Error(`Invalid role: ${capitalizedRole}. Must be one of: ${allowedRoles.join(', ')}`)
  }

  return capitalizedRole
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
