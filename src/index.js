const commander = require('commander')
const chalk = require('chalk').default
const updateNotifier = require('update-notifier')
const table = require('table').table

const newCommand = require('./new')
const generateCommand = require('./generate')

const packageJson = require('../package.json')
const { version } = packageJson

// Check for newer version
updateNotifier({ pkg: packageJson }).notify()

const program = new commander.Command()

program.version(version, '-v, --version').usage(`${chalk.green('<command>')} [options]`)

program
  .command('new')
  .alias('n')
  .option('--no-commit', 'skip creating an initial commit')
  .arguments('<project-name>')
  .description('Initialize a new project')
  .action(newCommand)

program
  .command('generate <schematic> <name>')
  .alias('g')
  .option('--no-style', 'skip style creation for components')
  .option('--no-format', 'preserves name formatting')
  .option('-d, --dry-run', "doesn't write anything to the file system")
  .option('-c, --component <name>', 'link a presentational component to a container')
  .description('Generate new file from schematic')
  .allowUnknownOption()
  .action(generateCommand)

program.on('--help', () => {
  const { schematicAliases } = generateCommand
  const data = [
    ['Schematic', 'Aliases'],
    ...Object.entries(schematicAliases).map(([type, aliases]) => {
      return [chalk.cyan(type), aliases.map(a => chalk.cyan(a)).join(', ')]
    })
  ]

  console.log()
  console.log('Available schematics types:')
  console.log(table(data))
})

program.parse(process.argv)

if (program.args.length === 0) {
  program.help()
}
