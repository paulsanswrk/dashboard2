import {createCipheriv, createDecipheriv, createHmac, randomBytes} from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for AES
const SALT_LENGTH = 32 // 32 bytes for key derivation
const TAG_LENGTH = 16 // 16 bytes for GCM authentication tag
const NONCE_LENGTH = 16 // 16 bytes for nonce

/**
 * Get the cipher key from environment variable
 * The key should be 32 bytes (256 bits) for AES-256
 */
function getCipherKey(): Buffer {
    const key = process.env.APP_CIPHER_KEY
    if (!key) {
        throw new Error('APP_CIPHER_KEY environment variable is not configured')
    }

    // If key is hex string, decode it; otherwise use it directly
    // Ensure it's exactly 32 bytes
    let keyBuffer: Buffer
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
        // Hex encoded 32-byte key
        keyBuffer = Buffer.from(key, 'hex')
    } else {
        // Use HMAC to derive a 32-byte key from the provided key
        keyBuffer = createHmac('sha256', 'render-context-key').update(key).digest()
    }

    if (keyBuffer.length !== 32) {
        throw new Error('APP_CIPHER_KEY must be 32 bytes (or hex-encoded 64 characters)')
    }

    return keyBuffer
}

/**
 * Encrypt a context value (e.g., 'RENDER'|nonce)
 * Returns base64url-encoded string safe for URL parameters
 */
export function encryptContext(context: string, nonce?: string): string {
    const cipherKey = getCipherKey()

    // Generate nonce if not provided
    const contextNonce = nonce || randomBytes(NONCE_LENGTH).toString('hex')

    // Create payload: context|nonce
    const payload = `${context}|${contextNonce}`
    const payloadBuffer = Buffer.from(payload, 'utf8')

    // Generate random IV
    const iv = randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, cipherKey, iv)

    // Encrypt
    const encrypted = Buffer.concat([
        cipher.update(payloadBuffer),
        cipher.final()
    ])

    // Get authentication tag
    const tag = cipher.getAuthTag()

    // Combine IV + tag + encrypted data
    const combined = Buffer.concat([
        iv,
        tag,
        encrypted
    ])

    // Encode as base64url (URL-safe base64)
    return combined.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}

/**
 * Decrypt a context token
 * Returns the context value (e.g., 'RENDER') or null if decryption fails
 */
export function decryptContext(encryptedToken: string): { context: string; nonce: string } | null {
    try {
        const cipherKey = getCipherKey()

        // Decode from base64url
        let base64 = encryptedToken
            .replace(/-/g, '+')
            .replace(/_/g, '/')

        // Add padding if needed
        const pad = base64.length % 4
        if (pad) {
            base64 += '='.repeat(4 - pad)
        }

        const combined = Buffer.from(base64, 'base64')

        // Extract IV, tag, and encrypted data
        if (combined.length < IV_LENGTH + TAG_LENGTH) {
            return null
        }

        const iv = combined.subarray(0, IV_LENGTH)
        const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
        const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH)

        // Create decipher
        const decipher = createDecipheriv(ALGORITHM, cipherKey, iv)
        decipher.setAuthTag(tag)

        // Decrypt
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ])

        // Parse payload
        const payload = decrypted.toString('utf8')
        const [context, nonce] = payload.split('|')

        if (!context || !nonce) {
            return null
        }

        return {context, nonce}
    } catch (error) {
        console.error('[renderContext] Decryption failed:', error)
        return null
    }
}

/**
 * Generate a render context token
 * This is a convenience function that creates a 'RENDER' context token
 */
export function generateRenderContext(): string {
    return encryptContext('RENDER')
}

/**
 * Validate a render context token
 * Returns true if the token is valid and contains 'RENDER' context
 */
export function validateRenderContext(token: string): boolean {
    const decrypted = decryptContext(token)
    return decrypted !== null && decrypted.context === 'RENDER'
}

