import {db} from '../index'
import {appLog, charts, dashboards, organizations, profiles, viewers} from '../schema'
import {count, desc, eq, inArray, sql} from 'drizzle-orm'

// Get organization statistics
export async function getOrganizationStats() {
    // Get counts in parallel for better performance
    const [chartsCount, dashboardsCount, usersCount, viewersCount] = await Promise.all([
        // Total charts count
        db.select({count: count()}).from(charts),

        // Total dashboards count
        db.select({count: count()}).from(dashboards),

        // Total users count (profiles with EDITOR or ADMIN roles)
        db.select({count: count()})
            .from(profiles)
            .where(inArray(profiles.role, ['ADMIN', 'EDITOR'])),

        // Total viewers count
        db.select({count: count()}).from(viewers),
    ])

    return {
        charts: chartsCount[0]?.count || 0,
        dashboards: dashboardsCount[0]?.count || 0,
        users: usersCount[0]?.count || 0,
        viewers: viewersCount[0]?.count || 0,
    }
}

// Get recent users (latest 5 users with their organization info)
export async function getRecentUsers(limit: number = 5) {
    const recentUsers = await db
        .select({
            userId: profiles.userId,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            role: profiles.role,
            organizationName: organizations.name,
            createdAt: profiles.createdAt,
        })
        .from(profiles)
        .leftJoin(organizations, eq(profiles.organizationId, organizations.id))
        .where(inArray(profiles.role, ['ADMIN', 'EDITOR']))
        .orderBy(desc(profiles.createdAt))
        .limit(limit)

    return recentUsers.map(user => ({
        id: user.userId,
        name: user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.lastName || 'Unknown User',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        organization: user.organizationName || 'No Organization',
        role: user.role,
        createdAt: user.createdAt,
    }))
}

// Get recent viewers (latest 5 viewers with their organization info)
export async function getRecentViewers(limit: number = 5) {
    const recentViewers = await db
        .select({
            userId: viewers.userId,
            firstName: viewers.firstName,
            lastName: viewers.lastName,
            viewerType: viewers.viewerType,
            organizationName: organizations.name,
            createdAt: viewers.createdAt,
        })
        .from(viewers)
        .leftJoin(organizations, eq(viewers.organizationId, organizations.id))
        .orderBy(desc(viewers.createdAt))
        .limit(limit)

    return recentViewers.map(viewer => ({
        id: viewer.userId,
        name: viewer.firstName && viewer.lastName
            ? `${viewer.firstName} ${viewer.lastName}`
            : viewer.firstName || viewer.lastName || 'Unknown Viewer',
        firstName: viewer.firstName || '',
        lastName: viewer.lastName || '',
        organization: viewer.organizationName || 'No Organization',
        viewerType: viewer.viewerType || 'Standard',
        createdAt: viewer.createdAt,
    }))
}

// Get recent organizations (latest 5 organizations)
export async function getRecentOrganizations(limit: number = 5) {
    const recentOrgs = await db
        .select({
            id: organizations.id,
            name: organizations.name,
            viewerCount: organizations.viewerCount,
            createdAt: organizations.createdAt,
        })
        .from(organizations)
        .orderBy(desc(organizations.createdAt))
        .limit(limit)

    return recentOrgs.map(org => ({
        id: org.id,
        name: org.name,
        viewerCount: org.viewerCount,
        createdAt: org.createdAt,
    }))
}

// Get recent activities (from app log or recent reports/charts/dashboards)
export async function getRecentActivities(limit: number = 5) {
    // Get recent activities from app log (if available)
    const logActivities = await db
        .select({
            id: appLog.id,
            time: appLog.time,
            level: appLog.level,
            module: appLog.module,
            tag: appLog.tag,
            userId: appLog.userId,
        })
        .from(appLog)
        .where(sql`${appLog.tag} IS NOT NULL`)
        .orderBy(desc(appLog.time))
        .limit(limit)

    // Transform log activities into activity format
    const activities = logActivities.map(log => ({
        id: log.id,
        action: log.tag || `${log.level} event`,
        user: log.userId ? `User ${log.userId.slice(0, 8)}` : 'System',
        time: formatTimeAgo(log.time),
        icon: getActivityIcon(log.tag || log.level),
    }))

    // If we don't have enough activities from logs, supplement with recent creations
    if (activities.length < limit) {
        const remaining = limit - activities.length

        // Get recent dashboard creations
        const recentDashboards = await db
            .select({
                id: dashboards.id,
                name: dashboards.name,
                creator: dashboards.creator,
                createdAt: dashboards.createdAt,
            })
            .from(dashboards)
            .orderBy(desc(dashboards.createdAt))
            .limit(remaining)

        const dashboardActivities = recentDashboards.map(dashboard => ({
            id: `dashboard-${dashboard.id}`,
            action: 'Dashboard created',
            user: `User ${dashboard.creator.slice(0, 8)}`,
            time: formatTimeAgo(dashboard.createdAt),
            icon: 'i-heroicons-squares-2x2',
        }))

        activities.push(...dashboardActivities)
    }

    return activities.slice(0, limit)
}

// Helper function to format time ago
function formatTimeAgo(date: Date | null): string {
    if (!date) return 'Unknown time'

    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString()
}

// Helper function to get activity icon based on type
function getActivityIcon(tag: string | null): string {
    if (!tag) return 'i-heroicons-information-circle'

    const iconMap: Record<string, string> = {
        'user_created': 'i-heroicons-user-plus',
        'dashboard_created': 'i-heroicons-squares-2x2',
        'chart_created': 'i-heroicons-chart-bar',
        'viewer_added': 'i-heroicons-eye',
        'organization_created': 'i-heroicons-building-office',
        'report_sent': 'i-heroicons-paper-airplane',
        'error': 'i-heroicons-exclamation-triangle',
        'warn': 'i-heroicons-exclamation-circle',
        'debug': 'i-heroicons-information-circle',
    }

    return iconMap[tag] || 'i-heroicons-information-circle'
}

// Combined function to get all admin dashboard data
export async function getAdminDashboardData() {
    const [
        stats,
        recentUsers,
        recentViewers,
        recentOrganizations,
        activities,
    ] = await Promise.all([
        getOrganizationStats(),
        getRecentUsers(5),
        getRecentViewers(5),
        getRecentOrganizations(5),
        getRecentActivities(5),
    ])

    return {
        organizationStats: stats,
        recentUsers,
        recentViewers,
        recentOrganizations,
        recentActivities: activities,
    }
}
