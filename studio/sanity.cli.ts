import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '4qw0kd9q',
    dataset: 'production'
  },
  // Hosted at https://felixhzv.sanity.studio, deployed by .github/workflows/studio-deploy.yml
  studioHost: 'felixhzv',
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  }
})
