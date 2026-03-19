import { defineConfig, formatters, loaders } from '@adonisjs/i18n'
import app from '@adonisjs/core/services/app'

const i18nConfig = defineConfig({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  formatter: formatters.icu(),
  loaders: [
    loaders.fs({
      location: app.languageFilesPath(),
    }),
  ],
})

export default i18nConfig
