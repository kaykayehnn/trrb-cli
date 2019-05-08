const chalk = require('chalk').default
const path = require('path')
const fs = require('fs-extra')
const handlebars = require('handlebars')
const os = require('os')

const exitWithError = require('./helpers/exitWithError')
require('./helpers/handlebars')

const TEMPLATE_PATH = path.join(__dirname, 'templates')
const SRC_FOLDER = 'src'
const COMPONENTS_FOLDER = 'components'
const STORE_FOLDER = 'store'
const REDUCERS_FOLDER = 'reducers'
const ACTIONS_FOLDER = 'actions'
const STATE_FOLDER = 'state'

const COMPONENT = 'component'
const CONTAINER = 'container'
const REDUCER = 'reducer'

// this is exported lower down
const schematicAliases = {
  [COMPONENT]: ['c', 'pc'],
  [CONTAINER]: ['cr', 'cc'],
  [REDUCER]: ['r'],
}

const mapFns = {
  component: {
    templatePaths: [
      path.join(COMPONENT, 'index.hbs'),
      path.join(COMPONENT, 'style.hbs'),
      path.join(COMPONENT, 'component.hbs'),
      path.join(COMPONENT, 'test.hbs'),
    ],
    getFilePaths: (srcPath, { dirname, basename }, options) => {
      const componentFolderPath = path.join(srcPath, COMPONENTS_FOLDER, dirname, basename)

      return {
        index: path.join(componentFolderPath, 'index.ts'),
        style: options.style && path.join(componentFolderPath, `${basename}.style.scss`),
        component: path.join(componentFolderPath, `${basename}.component.tsx`),
        test: options.test && path.join(componentFolderPath, `${basename}.test.tsx`),
      }
    },
  },
  container: {
    templatePaths: [
      path.join(CONTAINER, 'container.hbs'),
      path.join(CONTAINER, 'index.hbs'),
      path.join(CONTAINER, 'test.hbs'),
    ],
    getFilePaths: (srcPath, { dirname, basename }, options) => {
      const componentFolderPath = path.join(srcPath, COMPONENTS_FOLDER, dirname, basename)

      return {
        container: path.join(componentFolderPath, `${basename}.component.ts`),
        index: path.join(componentFolderPath, 'index.ts'),
        test: options.test && path.join(componentFolderPath, `${basename}.test.ts`),
      }
    },
  },
  reducer: {
    templatePaths: [
      path.join(REDUCER, 'actions.hbs'),
      path.join(REDUCER, 'reducer.hbs'),
      path.join(REDUCER, 'reducerIndex.hbs'),
      path.join(REDUCER, 'state.hbs'),
      path.join(REDUCER, 'test.hbs'),
    ],
    getFilePaths: (srcPath, { dirname, basename }, options) => {
      const storeFolderPath = path.join(srcPath, STORE_FOLDER)
      const reducerFolderPath = path.join(storeFolderPath, REDUCERS_FOLDER, dirname, basename)

      return {
        actions: path.join(storeFolderPath, ACTIONS_FOLDER, dirname, `${basename}.actions.ts`),
        reducer: path.join(reducerFolderPath, `${basename}.reducer.ts`),
        reducerIndex: path.join(reducerFolderPath, 'index.ts'),
        state: path.join(storeFolderPath, STATE_FOLDER, dirname, `${basename}.state.ts`),
        test: options.test && path.join(reducerFolderPath, `${basename}.test.ts`),
      }
    },
  },
}

module.exports = exports = async function create(type, name, options) {
  const schematicTypes = Object.keys(schematicAliases)

  const schematicType = schematicTypes.find(
    st =>
      type.toUpperCase() === st.toUpperCase() ||
      schematicAliases[st].some(sa => sa.toUpperCase() === type)
  )
  if (schematicType == null) {
    exitWithError(chalk.red(`${type} is not a supported schematic type`))
  }

  let projectRoot = process.cwd()
  let files = await fs.readdir(projectRoot)

  // loop until find package.json (project root) or OS root path
  while (!files.some(f => f === 'package.json') && path.dirname(projectRoot) !== projectRoot) {
    projectRoot = path.join(projectRoot, '..')
    files = await fs.readdir(projectRoot)
  }

  if (!files.some(f => f === 'package.json')) {
    exitWithError(chalk.red('Could not find project root, aborting'))
  }

  const srcPath = path.join(projectRoot, SRC_FOLDER)
  const dirname = path.dirname(name)
  let basename = path.basename(name)
  if (options.format) {
    basename = classCase(basename)
  }

  const schematicConfig = mapFns[schematicType]
  const { templatePaths, getFilePaths } = schematicConfig
  const nameArguments = { dirname, basename }

  const templates = await getTemplates(templatePaths)
  const filePaths = getFilePaths(srcPath, nameArguments, options)
  const evaluatedTemplates = evaluateTemplates(templates, nameArguments, options)

  const promises = Object.entries(filePaths).map(async ([key, filePath]) => {
    if (!filePath) return `${chalk.gray('CANCELED')} ${key}`

    const relativePath = path.relative(projectRoot, filePath)
    const content = evaluatedTemplates[key]
    if (await fs.pathExists(filePath)) {
      // extra whitespaces are for alignment with other logs
      return `${chalk.gray('EXISTS')}   ${relativePath}`
    }

    if (!options.dryRun) {
      await fs.ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, content)
    }

    return `${chalk.green('CREATED')}  ${relativePath} (${content.length} bytes)`
  })

  const output = await Promise.all(promises)
  console.log(output.join(os.EOL))
}

exports.schematicAliases = schematicAliases

function classCase(name) {
  return name.slice(0, 1).toUpperCase() + name.slice(1)
}

async function getTemplates(templatePaths) {
  const promises = templatePaths.map(tp => fs.readFile(path.join(TEMPLATE_PATH, tp), 'utf8'))
  const templates = await Promise.all(promises)

  const templateMap = templates.reduce((p, c, ix) => {
    const parsed = path.parse(templatePaths[ix])
    p[parsed.name] = c

    return p
  }, {})

  return templateMap
}

function evaluateTemplates(templateMap, { dirname, basename }, options) {
  const templateKeys = Object.keys(templateMap)
  const context = {
    ...options,
    dirname,
    name: basename,
  }

  return templateKeys.reduce((p, c) => {
    p[c] = handlebars.compile(templateMap[c])(context)
    return p
  }, {})
}
