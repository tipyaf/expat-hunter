import app from '@adonisjs/core/services/app'
import env from '#start/env'

const driveConfig = {
  default: env.get('DRIVE_DISK', 'local'),
  disks: {
    local: {
      driver: 'local' as const,
      root: app.tmpPath('uploads'),
      serveFiles: true,
      basePath: '/uploads',
      visibility: 'public' as const,
    },
  },
}

export default driveConfig
