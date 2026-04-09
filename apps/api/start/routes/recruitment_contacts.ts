/**
 * Recruitment Contacts routes — mounted under /api/job-offers/:id/contacts
 * with auth middleware. Handles CRUD for recruitment contacts and re-prospect action.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const RecruitmentContactsController = () =>
  import('#controllers/recruitment_contacts_controller')

router
  .group(() => {
    router.get('/', [RecruitmentContactsController, 'index'])
    router.post('/', [RecruitmentContactsController, 'store'])
    router.put('/:contactId', [RecruitmentContactsController, 'update'])
    router.delete('/:contactId', [RecruitmentContactsController, 'destroy'])
    router.post('/:contactId/re-prospect', [RecruitmentContactsController, 'reProspect'])
  })
  .prefix('/api/job-offers/:id/contacts')
  .use(middleware.auth())
