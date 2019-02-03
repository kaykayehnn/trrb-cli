const handlebars = require('handlebars')

handlebars.registerHelper('functionCase', (text) => {
  return text.slice(0, 1).toLowerCase() + text.slice(1)
})
