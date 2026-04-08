/**
 * Job Offers routes — mounted under /api/job-offers with auth middleware.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const JobOffersController = () => import('#controllers/job_offers_controller')

router
  .group(() => {
    router.get('/exclusions', [JobOffersController, 'listExclusions'])
    router.get('/', [JobOffersController, 'index'])
    router.get('/:id', [JobOffersController, 'show'])
    router.post('/:id/exclude', [JobOffersController, 'exclude'])
    router.put('/:id/advice', [JobOffersController, 'updateAdvice'])
  })
  .prefix('/api/job-offers')
  .use(middleware.auth())
