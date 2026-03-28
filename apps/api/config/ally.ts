import env from '#start/env'
import { defineConfig, services } from '@adonisjs/ally'

const allyConfig = defineConfig({
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: `${env.get('APP_URL')}/api/auth/google/callback`,
  }),
  googleMail: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: `${env.get('APP_URL')}/api/email-connections/oauth/google/callback`,
    scopes: [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    accessType: 'offline',
    prompt: 'consent',
  }),
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
