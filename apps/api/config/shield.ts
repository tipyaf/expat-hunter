import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * CSRF protection is disabled because this is a pure REST API
   * that uses Bearer token authentication (no cookies).
   * CSRF attacks target cookie-based auth, so CSRF protection
   * is not needed here.
   */
  csrf: {
    enabled: false,
  },
})

export default shieldConfig
