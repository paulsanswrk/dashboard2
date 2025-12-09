import {randomUUID} from 'crypto'
import {Buffer} from 'node:buffer'
import {supabaseAdmin} from '../api/supabase'

const THUMBNAIL_BUCKET = 'chart-thumbnails'
const DASHBOARD_BUCKET = 'dashboard-thumbnails'

function slugify(input: string | null | undefined, fallback: string) {
    if (!input) return fallback
    const ascii = input
        .toString()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
    const slug = ascii
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
    return slug || fallback
}

function parseDataUrl(thumbnailBase64: string) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(thumbnailBase64)
    if (!match) throw new Error('Invalid thumbnail data URL')
    const [, contentType, base64] = match
    if (contentType !== 'image/png') throw new Error('Only PNG thumbnails are allowed')
    return {
        contentType: 'image/png',
        buffer: Buffer.from(base64, 'base64')
    }
}

export async function uploadChartThumbnail(thumbnailBase64?: string | null, orgName?: string | null, chartName?: string | null) {
    if (!thumbnailBase64) return null
    const parsed = parseDataUrl(thumbnailBase64)

    const orgFolder = slugify(orgName, 'org')
    const chartSlug = slugify(chartName, 'chart')
    const path = `${orgFolder}/${chartSlug}-${Date.now()}-${randomUUID()}.png`

    const {error: uploadError} = await supabaseAdmin.storage
        .from(THUMBNAIL_BUCKET)
        .upload(path, parsed.buffer, {contentType: parsed.contentType, upsert: true})

    if (uploadError) throw uploadError

    const {data: publicUrlData} = supabaseAdmin.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path)
    return publicUrlData?.publicUrl || null
}

export async function uploadDashboardThumbnail(thumbnailBase64?: string | null, orgName?: string | null, dashboardName?: string | null) {
    if (!thumbnailBase64) return null
    const parsed = parseDataUrl(thumbnailBase64)

    const orgFolder = slugify(orgName, 'org')
    const dashSlug = slugify(dashboardName, 'dashboard')
    const path = `${orgFolder}/${dashSlug}-${Date.now()}-${randomUUID()}.png`

    const {error: uploadError} = await supabaseAdmin.storage
        .from(DASHBOARD_BUCKET)
        .upload(path, parsed.buffer, {contentType: parsed.contentType, upsert: true})

    if (uploadError) throw uploadError

    const {data: publicUrlData} = supabaseAdmin.storage.from(DASHBOARD_BUCKET).getPublicUrl(path)
    return publicUrlData?.publicUrl || null
}

