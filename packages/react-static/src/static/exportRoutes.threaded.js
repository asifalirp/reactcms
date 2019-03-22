/* eslint-disable import/first, import/no-dynamic-require */

const { setIgnorePath } = require('../utils/binHelper')
const path = require('path')
const getConfig = require('./getConfig').default
const { DefaultDocument } = require('./components/RootComponents')
const { poolAll } = require('../utils')
const exportRoute = require('./exportRoute').default

process.on('message', async state => {
  try {
    const { routes } = state
    // Get config again

    const { config } = await getConfig(state)

    setIgnorePath(config.paths.ARTIFACTS)

    // Use the node version of the app created with webpack
    const Comp = require(path.resolve(config.paths.ARTIFACTS, 'static-app.js'))
      .default
    // Retrieve the document template
    const DocumentTemplate = config.Document || DefaultDocument

    const tasks = []
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]
      // eslint-disable-next-line
      tasks.push(async () => {
        await exportRoute({
          ...state,
          config,
          route,
          Comp,
          DocumentTemplate,
        })
        if (process.connected) {
          process.send({ type: 'tick' })
        }
      })
    }
    await poolAll(tasks, Number(config.outputFileRate))
    if (process.connected) {
      process.send({ type: 'done' })
    }
    process.exit()
  } catch (err) {
    console.error(err)
    if (process.connected) {
      process.send({ type: 'error', payload: err })
    }
    process.exit(1)
  }
})
