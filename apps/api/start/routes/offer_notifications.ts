import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OfferNotificationsController = () => import('#controllers/offer_notifications_controller')

router
  .group(() => {
    router.get('/offers-count', [OfferNotificationsController, 'count'])
    router.post('/mark-seen', [OfferNotificationsController, 'markSeen'])
  })
  .prefix('/api/notifications')
  .use(middleware.auth())
