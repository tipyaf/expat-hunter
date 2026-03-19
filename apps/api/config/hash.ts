import { defineConfig, drivers } from '@adonisjs/core/hash'

const hashConfig = defineConfig({
  default: 'bcrypt',
  list: {
    bcrypt: drivers.bcrypt({
      rounds: 10,
    }),
  },
})

export default hashConfig

declare module '@adonisjs/core/types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface HashersList extends InferHashers<typeof hashConfig> {}
}
