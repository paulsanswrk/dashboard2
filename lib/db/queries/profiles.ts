import {db} from '../index'
import {organizations, profiles} from '../schema'
import {eq} from 'drizzle-orm'

export interface CreateProfileData {
    userId: string
    firstName?: string | null
    lastName?: string | null
    role: string
    organizationId?: string | null
}

export interface CreateOrganizationData {
    name: string
    createdBy: string
}

// Find an existing organization by name
export async function findOrganizationByName(name: string) {
    const result = await db
        .select()
        .from(organizations)
        .where(eq(organizations.name, name))
        .limit(1)

    return result[0] || null
}

// Create a new organization
export async function createOrganization(data: CreateOrganizationData) {
    const result = await db
        .insert(organizations)
        .values({
            name: data.name,
            viewerCount: 0,
            createdBy: data.createdBy,
        })
        .returning()

    return result[0]
}

// Check if a profile exists for a user
export async function findProfileByUserId(userId: string) {
    const result = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1)

    return result[0] || null
}

// Create a new profile
export async function createProfile(data: CreateProfileData) {
    const result = await db
        .insert(profiles)
        .values({
            userId: data.userId,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            organizationId: data.organizationId,
        })
        .returning()

    return result[0]
}

// Update an existing profile
export async function updateProfile(userId: string, updates: Partial<CreateProfileData>) {
    const result = await db
        .update(profiles)
        .set({
            firstName: updates.firstName,
            lastName: updates.lastName,
            role: updates.role,
            organizationId: updates.organizationId,
        })
        .where(eq(profiles.userId, userId))
        .returning()

    return result[0]
}

// Get a profile with organization details
export async function getProfileWithOrganization(userId: string) {
    const result = await db
        .select({
            profile: profiles,
            organization: organizations,
        })
        .from(profiles)
        .leftJoin(organizations, eq(profiles.organizationId, organizations.id))
        .where(eq(profiles.userId, userId))
        .limit(1)

    return result[0] || null
}
