module.exports = function exitWithError (error) {
  if (error) {
    console.error(error)
  }

  process.exit(1)
}
