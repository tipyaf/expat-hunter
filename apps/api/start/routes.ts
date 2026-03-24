import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const ProfileController = () => import('#controllers/profile_controller')
const SourcingController = () => import('#controllers/sourcing_controller')
const ContactsController = () => import('#controllers/contacts_controller')
const AnalysisController = () => import('#controllers/analysis_controller')
const EmailsController = () => import('#controllers/emails_controller')
const PipelineController = () => import('#controllers/pipeline_controller')
const DashboardController = () => import('#controllers/dashboard_controller')
const AiSettingsController = () => import('#controllers/ai_settings_controller')
const SearchController = () => import('#controllers/search_controller')
const MarketController = () => import('#controllers/market_controller')
const EnrichmentController = () => import('#controllers/enrichment_controller')
const TemplatesController = () => import('#controllers/templates_controller')
const PresetsController = () => import('#controllers/presets_controller')
const SendingSettingsController = () => import('#controllers/sending_settings_controller')
const TipsController = () => import('#controllers/tips_controller')
const BlockedEntitiesController = () => import('#controllers/blocked_entities_controller')
const ChatController = () => import('#controllers/chat_controller')
const ThreadController = () => import('#controllers/thread_controller')
const EmailConnectionsController = () => import('#controllers/email_connections_controller')
const OnboardingController = () => import('#controllers/onboarding_controller')
const NotificationsController = () => import('#controllers/notifications_controller')

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
    router.post('forgot-password', [AuthController, 'forgotPassword'])
    router.post('reset-password', [AuthController, 'resetPassword'])
    router.post('verify-email', [AuthController, 'verifyEmail'])
    router.post('resend-verification', [AuthController, 'resendVerification']).use(middleware.auth())
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
  .post('/api/sourcing/enrich-company/:id', [EnrichmentController, 'enrichCompany'])
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [ContactsController, 'index'])
    router.get('/:id', [ContactsController, 'show'])
    router.patch('/:id/status', [ContactsController, 'updateStatus'])
    router.get('/:id/movements', [ContactsController, 'movements'])
    router.put('/:id/override', [ContactsController, 'override'])
    router.post('/:id/enrich-email', [EnrichmentController, 'enrichEmail'])
    router.get('/:id/thread', [ThreadController, 'thread'])
    router.get('/:id/summary', [ThreadController, 'summary'])
    router.post('/:id/reply', [ThreadController, 'reply'])
    router.post('/:id/reply/generate', [ThreadController, 'generateReply'])
    router.post('/:id/sync', [ThreadController, 'sync'])
  })
  .prefix('/api/contacts')
  .use(middleware.auth())

router
  .group(() => {
    router.post('/enrich-email-batch', [EnrichmentController, 'enrichEmailBatch'])
    router.get('/enrichment-quotas', [EnrichmentController, 'quotas'])
  })
  .prefix('/api/settings')
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
    router.post('/generate', [EmailsController, 'generate'])
    router.post('/approve-batch', [EmailsController, 'approveBatch'])
    router.post('/send-batch', [EmailsController, 'sendBatch'])
    router.get('/send-batch/:batchId/progress', [EmailsController, 'sendBatchProgress'])
    router.get('/:id', [EmailsController, 'show'])
    router.put('/:id', [EmailsController, 'update'])
    router.post('/:id/approve', [EmailsController, 'approve'])
    router.post('/:id/reject', [EmailsController, 'reject'])
    router.post('/:id/regenerate', [EmailsController, 'regenerate'])
  })
  .prefix('/api/emails')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [TemplatesController, 'index'])
    router.post('/', [TemplatesController, 'store'])
    router.put('/:id', [TemplatesController, 'update'])
    router.delete('/:id', [TemplatesController, 'destroy'])
  })
  .prefix('/api/templates')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [PresetsController, 'index'])
    router.post('/', [PresetsController, 'store'])
    router.put('/:id', [PresetsController, 'update'])
    router.delete('/:id', [PresetsController, 'destroy'])
  })
  .prefix('/api/presets')
  .use(middleware.auth())

router
  .get('/api/sending-settings', [SendingSettingsController, 'show'])
  .use(middleware.auth())

router
  .get('/api/tips/contextual', [TipsController, 'contextual'])
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [BlockedEntitiesController, 'index'])
    router.post('/', [BlockedEntitiesController, 'store'])
    router.delete('/:id', [BlockedEntitiesController, 'destroy'])
  })
  .prefix('/api/blocked')
  .use(middleware.auth())

router
  .group(() => {
    router.post('/', [SearchController, 'launch'])
    router.get('/', [SearchController, 'index'])
    router.get('/defaults', [SearchController, 'defaults'])
    router.get('/:id/progress', [SearchController, 'progress'])
  })
  .prefix('/api/recherche')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/snapshot', [MarketController, 'snapshot'])
  })
  .prefix('/api/market')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [PipelineController, 'index'])
    router.get('/stats', [PipelineController, 'stats'])
  })
  .prefix('/api/pipeline')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/actions', [DashboardController, 'actions'])
    router.get('/stats', [DashboardController, 'stats'])
  })
  .prefix('/api/dashboard')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [AiSettingsController, 'index'])
    router.put('/:key', [AiSettingsController, 'upsert'])
    router.get('/cache/stats', [AiSettingsController, 'cacheStats'])
    router.post('/cache/purge', [AiSettingsController, 'purgeCache'])
  })
  .prefix('/api/admin/ai-settings')
  .use(middleware.auth())
  .use(middleware.admin())

router
  .group(() => {
    router.post('/chat', [ChatController, 'chat'])
    router.get('/chat/:sessionId', [ChatController, 'history'])
  })
  .prefix('/api/assistant')
  .use(middleware.auth())

router
  .post('/api/admin/refresh-visa-registries', [EnrichmentController, 'refreshVisaRegistries'])
  .use(middleware.auth())
  .use(middleware.admin())

router
  .patch('/api/admin/settings/emails', [SendingSettingsController, 'updateAdminLimits'])
  .use(middleware.auth())
  .use(middleware.admin())

router
  .group(() => {
    router.get('/', [AiSettingsController, 'listUsers'])
    router.patch('/:id/admin', [AiSettingsController, 'toggleAdmin'])
  })
  .prefix('/api/admin/users')
  .use(middleware.auth())
  .use(middleware.admin())

router
  .group(() => {
    router.get('/', [EmailConnectionsController, 'show'])
    router.post('/', [EmailConnectionsController, 'store'])
    router.delete('/', [EmailConnectionsController, 'destroy'])
    router.post('/test', [EmailConnectionsController, 'test'])
  })
  .prefix('/api/email-connections')
  .use(middleware.auth())

router
  .get('/api/replies/unread-count', [ThreadController, 'unreadCount'])
  .use(middleware.auth())

router
  .group(() => {
    router.post('/', [OnboardingController, 'complete'])
    router.post('/refine', [OnboardingController, 'refine'])
  })
  .prefix('/api/onboarding')
  .use(middleware.auth())

router
  .get('/api/notifications/stream', [NotificationsController, 'stream'])
  .use(middleware.auth())
