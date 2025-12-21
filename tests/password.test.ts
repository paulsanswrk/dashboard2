import {describe, it, expect} from 'vitest'
import {hashPassword, verifyPassword} from '../server/utils/password'

describe('Password utilities', () => {
    it('should hash a password', async () => {
        const password = 'testPassword123'
        const hash = await hashPassword(password)

        expect(hash).toBeDefined()
        expect(typeof hash).toBe('string')
        expect(hash.length).toBeGreaterThan(0)
        expect(hash).not.toBe(password) // Hash should not equal plain password
    })

    it('should verify correct password', async () => {
        const password = 'testPassword123'
        const hash = await hashPassword(password)

        const isValid = await verifyPassword(password, hash)
        expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
        const password = 'testPassword123'
        const hash = await hashPassword(password)

        const isValid = await verifyPassword('wrongPassword', hash)
        expect(isValid).toBe(false)
    })

    it('should generate different hashes for same password', async () => {
        const password = 'testPassword123'
        const hash1 = await hashPassword(password)
        const hash2 = await hashPassword(password)

        expect(hash1).not.toBe(hash2) // Different hashes due to different salts
        expect(await verifyPassword(password, hash1)).toBe(true)
        expect(await verifyPassword(password, hash2)).toBe(true)
    })
})
