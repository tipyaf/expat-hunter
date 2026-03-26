import { defineConfig } from '@adonisjs/core/bodyparser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bodyParserConfig: ReturnType<typeof defineConfig> = defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  form: {
    convertEmptyStringsToNull: true,
    types: ['application/x-www-form-urlencoded'],
  },

  json: {
    convertEmptyStringsToNull: true,
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  multipart: {
    autoProcess: true,
    convertEmptyStringsToNull: true,
    processManually: [],
    limit: '20mb',
    types: ['multipart/form-data'],
  },

  raw: {
    types: ['text/*'],
  },
})

export default bodyParserConfig
