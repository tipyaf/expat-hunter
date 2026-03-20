/*
|--------------------------------------------------------------------------
| Test entrypoint
|--------------------------------------------------------------------------
|
| The "test.ts" file is the entrypoint for running tests using Japa.
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import { apiClient } from '@japa/api-client'
import { assert } from '@japa/assert'
import { configure, processCLIArgs, run } from '@japa/runner'

const APP_ROOT = new URL('../', import.meta.url)

const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .testRunner()
  .configure(async (app) => {
    processCLIArgs(process.argv.splice(2))

    const { TestUtils } = await import('@adonisjs/core/test_utils')
    const testUtils = new TestUtils(app)
    await testUtils.boot()

    configure({
      suites: [
        {
          name: 'unit',
          files: ['tests/unit/**/*.spec.ts'],
          timeout: 2000,
        },
        {
          name: 'functional',
          files: ['tests/functional/**/*.spec.ts'],
          timeout: 30_000,
          configure(suite) {
            suite.setup(() => testUtils.httpServer().start())
          },
        },
      ],
      plugins: [assert(), apiClient()],
      forceExit: true,
    })
  })
  .run(() => run())
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
