import { defineConfig, drivers } from '@adonisjs/core/encryption'
import { appKey } from '#config/app'

const encryptionConfig = defineConfig({
  default: 'app',
  list: {
    app: drivers.aes256cbc({
      id: 'app',
      keys: [appKey],
    }),
  },
})

export default encryptionConfig
