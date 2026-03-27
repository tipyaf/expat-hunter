import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs on every HTTP request
 * and allows modifying the request/response before
 * the route handler is invoked.
 */
server.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])

/**
 * Named middleware collection. These can be assigned
 * to routes or route groups.
 */
router.use([])

/**
 * Named middleware are defined as key-value pairs.
 * Later you can use these keys on routes to apply
 * a given middleware.
 */
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  admin: () => import('#middleware/admin_middleware'),
  planGuard: () => import('#middleware/plan_guard_middleware'),
})
