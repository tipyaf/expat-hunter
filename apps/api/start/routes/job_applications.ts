/**
 * Job Applications routes — mounted under /api/job-offers/:id/cv, /api/job-offers/:id/cover-letter,
 * and /api/job-offers/:id/application-email with auth middleware.
 * Handles CV, cover letter, application email generation, send, and follow-up drafts.
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

router
  .group(() => {
    router.get('/', [JobApplicationsController, 'showCoverLetter'])
    router.post('/generate', [JobApplicationsController, 'generateCoverLetter'])
    router.post('/refine', [JobApplicationsController, 'refineCoverLetter'])
    router.put('/', [JobApplicationsController, 'saveCoverLetter'])
    router.get('/pdf', [JobApplicationsController, 'coverLetterPdf'])
  })
  .prefix('/api/job-offers/:id/cover-letter')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [JobApplicationsController, 'applicationEmailStatus'])
    router.post('/generate', [JobApplicationsController, 'generateApplicationEmail'])
    router.post('/send', [JobApplicationsController, 'sendApplication'])
  })
  .prefix('/api/job-offers/:id/application-email')
  .use(middleware.auth())

router
  .post(
    '/api/job-offers/:id/contacts/:contactId/email',
    [JobApplicationsController, 'draftFollowUpEmail']
  )
  .use(middleware.auth())
