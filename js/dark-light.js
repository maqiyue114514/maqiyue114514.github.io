const { nativeTheme } = require('electron').remote
nativeTheme.on('updated', () => {
  const isDark = nativeTheme.shouldUseDarkColors
  atom.config.set('core.themes', [
    isDark ? 'atom-one-dark' : 'atom-one-light',
    'syntax-theme'
  ])
})