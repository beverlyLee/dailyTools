/* eslint-env node */

module.exports = function (/* ctx */) {
  return {
    eslint: {
      warnings: true,
      errors: true
    },

    boot: [
      'axios',
      'crypto'
    ],

    css: [
      'app.scss'
    ],

    extras: [
      'roboto-font',
      'material-icons'
    ],

    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node20'
      },
      vueRouterMode: 'hash',
      publicPath: '/',
      env: {
        API_URL: process.env.API_URL || 'http://localhost:3000/api'
      }
    },

    devServer: {
      open: true,
      port: 8080
    },

    framework: {
      config: {},
      iconSet: 'material-icons',
      lang: 'en-US',
      components: [
        'QPage',
        'QPageContainer',
        'QLayout',
        'QHeader',
        'QToolbar',
        'QToolbarTitle',
        'QDrawer',
        'QList',
        'QItem',
        'QItemSection',
        'QItemLabel',
        'QSeparator',
        'QInput',
        'QPassword',
        'QBtn',
        'QCard',
        'QCardSection',
        'QCardActions',
        'QSpace',
        'QSelect',
        'QToggle',
        'QField',
        'QForm',
        'QDialog',
        'QSpinner',
        'QSpinnerGears',
        'QNotification',
        'QBadge',
        'QChip',
        'QDate',
        'QTime',
        'QIcon',
        'QTab',
        'QTabs',
        'QTabPanel',
        'QTabPanels'
      ],
      directives: [
        'ClosePopup',
        'Ripple'
      ],
      plugins: [
        'Dialog',
        'Notify',
        'Loading'
      ]
    },

    animations: [],

    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: [
        'render'
      ]
    },

    pwa: {
      workboxMode: 'generateSW',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true
    },

    electron: {
      inspectPort: 5858,
      bundler: 'packager',
      packager: {
        appName: 'Digital Legacy Manager',
        icon: 'src-electron/icons/icon'
      },
      builder: {
        appId: 'digital-legacy-manager'
      }
    },

    bex: {
      contentScripts: [
        'my-content-script'
      ]
    }
  }
}
