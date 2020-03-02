const createNodeHelpers = require("gatsby-node-helpers")

const { createNodeFactory } = createNodeHelpers({
  typePrefix: "Strapi",
})

const Node = (type, node) =>
  createNodeFactory(type, node => {
    node.id = `${type}_${node.strapiId}`
    return node
  })(node)

module.exports = { Node }
