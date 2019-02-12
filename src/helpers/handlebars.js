const handlebars = require('handlebars')

handlebars.registerHelper('functionCase', (text) => {
  return text.slice(0, 1).toLowerCase() + text.slice(1)
})

handlebars.registerHelper('formatName', (dirname, basename) => {
  let formattedDirname = dirname === '.' ? '' : dirname + '/'

  return formattedDirname + basename
})
