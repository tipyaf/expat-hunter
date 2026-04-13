/**
 * Scheduler routes — internal cron endpoint for recurring search execution.
 *
 * Protected by a secret header (x-scheduler-secret) rather than user auth.
 * This endpoint is meant to be called by a cron job, not by users.
 */
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import RecurringSearchScheduler from '#services/recurring_search_scheduler'

const SCHEDULER_SECRET_HEADER = 'x-scheduler-secret'

router
  .group(() => {
    router.get('/run-due', async ({ request, response }) => {
      const secret = request.header(SCHEDULER_SECRET_HEADER)
      const expectedSecret = env.get('SCHEDULER_SECRET', '')

      if (!expectedSecret || secret !== expectedSecret) {
        return response.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or missing scheduler secret',
        })
      }

      const scheduler = new RecurringSearchScheduler()
      const result = await scheduler.runDueSearches()

      return response.json({
        data: result,
      })
    })
  })
  .prefix('/api/scheduler')
