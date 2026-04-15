/**
 * Job Applications routes — mounted under /api/job-offers/:id/cv, /api/job-offers/:id/cover-letter,
 * and /api/job-offers/:id/application-email with auth middleware.
 * Handles CV, cover letter, application email generation, send, and follow-up drafts.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const JobCvController = () => import('#controllers/job_cv_controller')
const JobCoverLetterController = () => import('#controllers/job_cover_letter_controller')
const JobApplicationSendController = () => import('#controllers/job_application_send_controller')

router
  .group(() => {
    router.get('/', [JobCvController, 'show'])
    router.post('/generate', [JobCvController, 'generate'])
    router.post('/refine', [JobCvController, 'refine'])
    router.put('/', [JobCvController, 'save'])
    router.get('/pdf', [JobCvController, 'pdf'])
  })
  .prefix('/api/job-offers/:id/cv')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [JobCoverLetterController, 'showCoverLetter'])
    router.post('/generate', [JobCoverLetterController, 'generateCoverLetter'])
    router.post('/refine', [JobCoverLetterController, 'refineCoverLetter'])
    router.put('/', [JobCoverLetterController, 'saveCoverLetter'])
    router.get('/pdf', [JobCoverLetterController, 'coverLetterPdf'])
  })
  .prefix('/api/job-offers/:id/cover-letter')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [JobApplicationSendController, 'applicationEmailStatus'])
    router.post('/generate', [JobApplicationSendController, 'generateApplicationEmail'])
    router.post('/send', [JobApplicationSendController, 'sendApplication'])
  })
  .prefix('/api/job-offers/:id/application-email')
  .use(middleware.auth())

router
  .post(
    '/api/job-offers/:id/contacts/:contactId/email',
    [JobApplicationSendController, 'draftFollowUpEmail']
  )
  .use(middleware.auth())
