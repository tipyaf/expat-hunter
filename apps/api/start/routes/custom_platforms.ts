/**
 * Custom Platforms routes — CRUD for user-defined job platforms + country suggestions.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const CustomPlatformsController = () => import('#controllers/custom_platforms_controller')

router
  .group(() => {
    router.get('/', [CustomPlatformsController, 'index'])
    router.post('/', [CustomPlatformsController, 'store'])
    router.delete('/:id', [CustomPlatformsController, 'destroy'])
  })
  .prefix('/api/custom-platforms')
  .use(middleware.auth())

// Suggestions endpoint (also requires auth)
router
  .group(() => {
    router.get('/suggestions', [CustomPlatformsController, 'suggestions'])
  })
  .prefix('/api/platforms')
  .use(middleware.auth())
