import { defineConfig, targets } from '@adonisjs/core/logger'
import env from '#start/env'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loggerConfig: any = defineConfig({
  default: 'app',

  loggers: {
    app: {
      enabled: true,
      name: 'expat-hunter',
      level: env.get('LOG_LEVEL', 'info'),
      transport: {
        targets: targets()
          .pushIf(!env.get('NODE_ENV', 'development').startsWith('prod'), targets.pretty())
          .toArray(),
      },
    },
  },
})

export default loggerConfig

declare module '@adonisjs/core/types' {
  interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
