/**
 * Job Applications routes — mounted under /api/job-offers/:id/cv with auth middleware.
 * Handles CV generation, refinement, manual edit, and PDF export.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const JobApplicationsController = () => import('#controllers/job_applications_controller')

router
  .group(() => {
    router.get('/', [JobApplicationsController, 'show'])
    router.post('/generate', [JobApplicationsController, 'generate'])
    router.post('/refine', [JobApplicationsController, 'refine'])
    router.put('/', [JobApplicationsController, 'save'])
    router.get('/pdf', [JobApplicationsController, 'pdf'])
  })
  .prefix('/api/job-offers/:id/cv')
  .use(middleware.auth())
