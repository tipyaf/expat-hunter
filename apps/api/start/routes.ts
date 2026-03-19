import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return { name: '@expat-hunter/api', status: 'ok' }
})

router.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() }
})
