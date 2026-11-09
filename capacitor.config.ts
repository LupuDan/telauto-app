import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Telauto Android app. The pages are built with `npm run build:app` into dist/ and packed inside the app,
 * so they load from the phone (fast, no download); only data (listings, photos, messages) goes over the internet.
 */
const config: CapacitorConfig = {
  // Final: Google Play identifies the app by this id, it can never change after publishing.
  appId: 'md.telauto.app',
  appName: 'Telauto',
  webDir: 'dist',
  android: {
    // Only https: no unencrypted connections.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
}

export default config
