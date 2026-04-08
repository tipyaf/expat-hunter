/**
 * Job Offers routes — mounted under /api/job-offers with auth middleware.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const JobOffersController = () => import('#controllers/job_offers_controller')

router
  .group(() => {
    router.get('/', [JobOffersController, 'index'])
    router.get('/:id', [JobOffersController, 'show'])
  })
  .prefix('/api/job-offers')
  .use(middleware.auth())
