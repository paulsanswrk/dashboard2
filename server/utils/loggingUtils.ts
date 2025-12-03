import {createClient} from '@supabase/supabase-js'

interface LogEntry {
    level: 'error' | 'warn' | 'debug'
    module: string
    message?: string
    stacktrace?: string
    request?: any
    response?: any
    user_id?: string
    url?: string
    tag?: string
}

interface PendingLogEntry extends LogEntry {
    created_at: string
}

/**
 * Log accumulator for batch processing of log entries
 */
export class LogAccumulator {
    private logs: PendingLogEntry[] = []

    /**
     * Add a log entry to the accumulator (doesn't write to DB immediately)
     */
    addLog(
        level: 'error' | 'warn' | 'debug',
        module: string,
        message?: string,
        request?: any,
        response?: any,
        user_id?: string,
        url?: string,
        tag?: string,
        stacktrace?: string
    ): void {
        const logEntry: PendingLogEntry = {
            level,
            module,
            stacktrace,
            request: request ?? null,
            response: response ?? null,
            user_id,
            url,
            tag,
            created_at: new Date().toISOString()
        }

        // Add message to the tag field if no tag provided, since we don't have a dedicated message field
        if (message && !tag) {
            logEntry.tag = message
        } else if (message && tag) {
            logEntry.tag = `${tag}: ${message}`
        }

        this.logs.push(logEntry)
    }

    /**
     * Flush all accumulated logs to the database in a single batch operation
     */
    async flushLogs(): Promise<void> {
        if (this.logs.length === 0) {
            return
        }

        try {
            const supabase = createClient(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const {error} = await supabase
                .from('app_log')
                .insert(this.logs)

            if (error) {
                console.error('Failed to insert batch log entries:', error)
                // Fallback to console logging
                this.logs.forEach(log => {
                    console.log(`[${log.level.toUpperCase()}] ${log.module}: ${log.tag || 'No message'}`)
                })
            }
        } catch (error) {
            // Fallback to console logging if database logging fails
            console.error('Failed to flush logs to database, falling back to console:', error)
            this.logs.forEach(log => {
                console.log(`[${log.level.toUpperCase()}] ${log.module}: ${log.tag || 'No message'}`)
            })
        } finally {
            // Clear the logs regardless of success/failure
            this.logs = []
        }
    }

    /**
     * Get the number of accumulated logs
     */
    getLogCount(): number {
        return this.logs.length
    }
}

/**
 * Log to the application log table using service role
 */
export async function logToAppLog(
    level: 'error' | 'warn' | 'debug',
    module: string,
    message?: string,
    request?: any,
    response?: any,
    user_id?: string,
    url?: string,
    tag?: string,
    stacktrace?: string
): Promise<void> {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const logEntry = {
            level,
            module,
            stacktrace,
            request: request ?? null,
            response: response ?? null,
            user_id,
            url,
            tag,
            created_at: new Date().toISOString()
        }

        // Add message to the tag field if no tag provided, since we don't have a dedicated message field
        if (message && !tag) {
            logEntry.tag = message
        } else if (message && tag) {
            logEntry.tag = `${tag}: ${message}`
        }

        const {error} = await supabase
            .from('app_log')
            .insert(logEntry)

        if (error) {
            console.error('Failed to insert log entry:', error)
        }
    } catch (error) {
        // Fallback to console logging if database logging fails
        console.error('Failed to log to database, falling back to console:', error)
        console.log(`[${level.toUpperCase()}] ${module}: ${message || tag || 'No message'}`)
    }
}

/**
 * Log report creation events
 */
export async function logReportCreated(
    reportId: string,
    userId: string,
    reportData: any
): Promise<void> {
    await logToAppLog(
        'debug',
        'reports',
        `Report created: ${reportId}`,
        reportData,
        undefined,
        userId,
        undefined,
        'report_created'
    )
}

/**
 * Log report update events
 */
export async function logReportUpdated(
    reportId: string,
    userId: string,
    changes: any
): Promise<void> {
    await logToAppLog(
        'debug',
        'reports',
        `Report updated: ${reportId}`,
        changes,
        undefined,
        userId,
        undefined,
        'report_updated'
    )
}

/**
 * Log report deletion events
 */
export async function logReportDeleted(
    reportId: string,
    userId: string
): Promise<void> {
    await logToAppLog(
        'debug',
        'reports',
        `Report deleted: ${reportId}`,
        undefined,
        undefined,
        userId,
        undefined,
        'report_deleted'
    )
}

/**
 * Log cron job execution
 */
export async function logCronJobExecution(
    jobType: string,
    duration: number,
    processedCount: number,
    successCount: number,
    failureCount: number,
    url?: string
): Promise<void> {
    await logToAppLog(
        'debug',
        'cron',
        `Cron job completed: ${jobType}`,
        {
            jobType,
            duration,
            processedCount,
            successCount,
            failureCount
        },
        undefined,
        undefined,
        url,
        'cron_execution'
    )
}

/**
 * Log report processing start
 */
export async function logReportProcessingStart(
    reportId: string,
    queueItemId: string,
    userId: string,
    attemptCount: number
): Promise<void> {
    await logToAppLog(
        'debug',
        'report_processing',
        `Started processing report: ${reportId}`,
        {
            reportId,
            queueItemId,
            attemptCount
        },
        undefined,
        userId,
        undefined,
        'processing_start'
    )
}

/**
 * Log report processing success
 */
export async function logReportProcessingSuccess(
    reportId: string,
    queueItemId: string,
    userId: string,
    attachmentsGenerated: number,
    recipients: string[]
): Promise<void> {
    await logToAppLog(
        'debug',
        'report_processing',
        `Successfully processed report: ${reportId}`,
        {
            reportId,
            queueItemId,
            attachmentsGenerated,
            recipients: recipients.length
        },
        undefined,
        userId,
        undefined,
        'processing_success'
    )
}

/**
 * Log report processing failure
 */
export async function logReportProcessingFailure(
    reportId: string,
    queueItemId: string,
    userId: string,
    error: string,
    attemptCount: number
): Promise<void> {
    await logToAppLog(
        'error',
        'report_processing',
        `Failed to process report: ${reportId}`,
        {
            reportId,
            queueItemId,
            error,
            attemptCount
        },
        undefined,
        userId,
        undefined,
        'processing_failure'
    )
}

/**
 * Log email sending events
 */
export async function logEmailSent(
    reportId: string,
    recipients: string[],
    attachmentCount: number,
    success: boolean,
    error?: string
): Promise<void> {
    await logToAppLog(
        success ? 'debug' : 'error',
        'email_sending',
        `Email ${success ? 'sent' : 'failed'} for report: ${reportId}`,
        {
            reportId,
            recipients: recipients.length,
            attachmentCount,
            success,
            error
        },
        undefined,
        undefined,
        undefined,
        'email_sent'
    )
}

/**
 * Log attachment generation events
 */
export async function logAttachmentGeneration(
    reportId: string,
    format: string,
    success: boolean,
    error?: string,
    fileSize?: number
): Promise<void> {
    await logToAppLog(
        success ? 'debug' : 'error',
        'attachment_generation',
        `Attachment ${format} ${success ? 'generated' : 'failed'} for report: ${reportId}`,
        {
            reportId,
            format,
            success,
            error,
            fileSize
        },
        undefined,
        undefined,
        undefined,
        'attachment_generated'
    )
}

/**
 * Log authentication/authorization failures
 */
export async function logAuthFailure(
    action: string,
    userId: string | null,
    reason: string,
    url?: string,
    ip?: string
): Promise<void> {
    await logToAppLog(
        'warn',
        'auth',
        `Authorization failed: ${action}`,
        {
            action,
            reason,
            ip
        },
        undefined,
        userId || undefined,
        url,
        'auth_failure'
    )
}

/**
 * Log system health checks
 */
export async function logHealthCheck(
    component: string,
    status: 'healthy' | 'unhealthy',
    details?: any
): Promise<void> {
    await logToAppLog(
        status === 'healthy' ? 'debug' : 'error',
        'health_check',
        `Health check ${status}: ${component}`,
        details,
        undefined,
        undefined,
        undefined,
        'health_check'
    )
}

/**
 * Log performance metrics
 */
export async function logPerformance(
    operation: string,
    duration: number,
    metadata?: any
): Promise<void> {
    await logToAppLog(
        'debug',
        'performance',
        `Performance: ${operation} took ${duration}ms`,
        {
            operation,
            duration,
            ...metadata
        },
        undefined,
        undefined,
        undefined,
        'performance'
    )
}

/**
 * Clean up old log entries (utility function for maintenance)
 */
export async function cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

        const {error} = await supabase
            .from('app_log')
            .delete()
            .lt('created_at', cutoffDate.toISOString())

        if (error) {
            console.error('Failed to cleanup old logs:', error)
        } else {
            await logToAppLog(
                'debug',
                'maintenance',
                `Cleaned up logs older than ${daysToKeep} days`,
                {daysToKeep},
                undefined,
                undefined,
                undefined,
                'log_cleanup'
            )
        }
    } catch (error) {
        console.error('Failed to cleanup logs:', error)
    }
}
