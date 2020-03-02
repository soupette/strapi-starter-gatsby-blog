const axios = require("axios")
const fetchData = require("./fetch")
const { Node } = require("./nodes")
const { capitalize } = require("lodash")
const normalize = require("./normalize")
const authentication = require("./authentication")

exports.sourceNodes = async (
  {
    store,
    actions,
    cache,
    reporter,
    createContentDigest,
    createNodeId,
    getNode,
    getNodes,
    getNodesByType,
  },
  {
    apiURL = "http://localhost:1337",
    contentTypes = [],
    loginData = {},
    queryLimit = 100,
  }
) => {
  const { createNode, deleteNode, touchNode } = actions

  // Authentication function
  let jwtToken = await authentication({ loginData, reporter, apiURL })

  // Start activity, Strapi data fetching
  const fetchActivity = reporter.activityTimer(`Fetched Strapi Data`)
  fetchActivity.start()

  // Generate a list of promises based on the `contentTypes` option.
  const promises = contentTypes.map(contentType =>
    fetchData({
      apiURL,
      contentType,
      jwtToken,
      queryLimit,
      reporter,
    })
  )

  // Execute the promises
  let entities = await Promise.all(promises)

  // Creating files
  entities = await normalize.downloadMediaFiles({
    entities,
    apiURL,
    store,
    cache,
    createNode,
    touchNode,
    jwtToken,
  })

  // new created nodes
  let newNodes = []

  // Fetch existing strapi nodes k,kln
  const existingNodes = getNodes().filter(
    n => n.internal.owner === `gatsby-source-strapi`
  )

  // Touch each one of them
  existingNodes.forEach(n => {
    touchNode({ nodeId: n.id })
  })

  console.log(contentTypes)
  // Create/update nodes
  contentTypes.forEach((contentType, i) => {
    const items = entities[i]
    items.forEach((item, i) => {
      const node = Node(capitalize(contentType), item)
      // Adding new created nodes in an Array
      newNodes.push(node)

      // Create nodes
      createNode(node)
    })
  })

  console.log(newNodes)

  // Make a diff array between existing nodes and new ones
  const diff = existingNodes.filter(
    ({ id: id1 }) => !newNodes.some(({ id: id2 }) => id2 === id1)
  )

  // Delete diff nodes
  diff.forEach(data => {
    deleteNode({ node: getNode(data.id) })
  })

  fetchActivity.end()
}
