import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const ProfileController = () => import('#controllers/profile_controller')
const SourcingController = () => import('#controllers/sourcing_controller')
const ContactsController = () => import('#controllers/contacts_controller')
const AnalysisController = () => import('#controllers/analysis_controller')
const EmailsController = () => import('#controllers/emails_controller')

router.get('/', async () => {
  return { name: '@expat-hunter/api', status: 'ok' }
})

router.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() }
})

router
  .group(() => {
    router.post('register', [AuthController, 'register'])
    router.post('login', [AuthController, 'login'])
    router.post('logout', [AuthController, 'logout']).use(middleware.auth())
    router.get('me', [AuthController, 'me']).use(middleware.auth())
  })
  .prefix('/api/auth')

router
  .group(() => {
    router.get('/', [ProfileController, 'show'])
    router.put('/', [ProfileController, 'update'])
    router.post('/cv', [ProfileController, 'uploadCv'])
    router.post('/complete-onboarding', [ProfileController, 'completeOnboarding'])
  })
  .prefix('/api/profile')
  .use(middleware.auth())

router
  .group(() => {
    router.post('/run', [SourcingController, 'run'])
    router.get('/runs', [SourcingController, 'index'])
    router.get('/runs/:id', [SourcingController, 'show'])
    router.get('/sources', [SourcingController, 'sources'])
  })
  .prefix('/api/sourcing')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [ContactsController, 'index'])
    router.get('/:id', [ContactsController, 'show'])
    router.patch('/:id/status', [ContactsController, 'updateStatus'])
    router.put('/:id/override', [ContactsController, 'override'])
  })
  .prefix('/api/contacts')
  .use(middleware.auth())

router
  .group(() => {
    router.post('/run', [AnalysisController, 'run'])
    router.post('/contact/:id', [AnalysisController, 'analyzeOne'])
    router.get('/stats', [AnalysisController, 'stats'])
  })
  .prefix('/api/analysis')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [EmailsController, 'index'])
    router.get('/:id', [EmailsController, 'show'])
    router.put('/:id', [EmailsController, 'update'])
    router.post('/generate', [EmailsController, 'generate'])
    router.post('/:id/approve', [EmailsController, 'approve'])
    router.post('/:id/reject', [EmailsController, 'reject'])
    router.post('/:id/regenerate', [EmailsController, 'regenerate'])
    router.post('/approve-batch', [EmailsController, 'approveBatch'])
  })
  .prefix('/api/emails')
  .use(middleware.auth())
