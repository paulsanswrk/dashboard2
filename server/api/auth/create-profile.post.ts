import {capitalizeRole} from '../../utils/roleUtils'
import {createOrganization, createProfile, findOrganizationByName, findProfileByUserId, updateProfile} from '~/lib/db/queries/profiles'

export default defineEventHandler(async (event) => {
  try {

    // Get the request body
    const body = await readBody(event)
    const { userId, email, userMetadata, profileData } = body

    if (!userId || !email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID and email are required'
      })
    }

    console.log('Creating profile for user:', userId, email)

    // Capitalize and validate role
    const rawRole = profileData?.role || userMetadata?.role || 'EDITOR'
    let capitalizedRole: string
    try {
      capitalizedRole = capitalizeRole(rawRole)
    } catch (error: any) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    // Check if profile already exists
      const existingProfile = await findProfileByUserId(userId)

    if (existingProfile) {
      console.log('Profile already exists, updating...')
      // Profile already exists, update it
        const updatedProfile = await updateProfile(userId, {
            firstName: profileData?.firstName || userMetadata?.firstName || null,
            lastName: profileData?.lastName || userMetadata?.lastName || null,
            role: capitalizedRole
        })

        console.log('Profile updated successfully:', updatedProfile)
        return {success: true, profile: updatedProfile, action: 'updated'}
    }

      // Handle organization assignment/creation
    let organizationId = null

      // SUPERADMIN users must have organization_id = null
      if (capitalizedRole === 'SUPERADMIN') {
          organizationId = null
          console.log('SUPERADMIN user - setting organization_id to null')
      } else {
          // All other roles (ADMIN, EDITOR, VIEWER) must have organization_id IS NOT NULL

          if (profileData?.organizationName && capitalizedRole === 'ADMIN') {
              console.log('Creating/joining organization for admin user...')

              // Check if organization already exists
              const existingOrg = await findOrganizationByName(profileData.organizationName)

              if (existingOrg) {
                  organizationId = existingOrg.id
                  console.log('Organization already exists:', organizationId)
              } else {
                  // Create new organization
                  const newOrg = await createOrganization({
            name: profileData.organizationName,
                      createdBy: userId
          })
          organizationId = newOrg.id
          console.log('Organization created successfully:', newOrg)
        }
          } else {
              // No organization specified - create a default organization for the user
              console.log('Creating default organization for user...')

              const defaultOrgName = `${profileData?.firstName || userMetadata?.firstName || 'User'}'s Organization`

              const newOrg = await createOrganization({
                  name: defaultOrgName,
                  createdBy: userId
              })
              organizationId = newOrg.id
              console.log('Default organization created successfully:', newOrg)
      }
    }

    // Profile doesn't exist, create it
    console.log('Profile does not exist, creating new one...')
      const profile = await createProfile({
          userId: userId,
          firstName: profileData?.firstName || userMetadata?.firstName || null,
          lastName: profileData?.lastName || userMetadata?.lastName || null,
          role: capitalizedRole,
          organizationId: organizationId
      })

    console.log('Profile created successfully:', profile)

      return {
          success: true,
          profile,
          action: 'created'
    }

  } catch (error: any) {
    console.error('Error in create-profile API:', error)
    
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    
    // Otherwise, create a new error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
