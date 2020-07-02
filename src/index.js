const { ApolloServer, PubSub } = require('apollo-server');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const jwt = require('jsonwebtoken');
const pubsub = new PubSub()

const { prisma } = require('./generated/prisma-client/index');

const getUser = async token => {
  try {
    if (token) {
      return await jwt.verify(token, 'reigota')
    }
    return null
  } catch (error) {
    return null
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req, connection }) => {
    if (connection) {
      console.log("teste")
      return connection.context
    } else {
      const tokenWithBearer = req.headers.authorization || ''
      const token = tokenWithBearer.split(' ')[1]
      const user = await getUser(token)
      return {
        user,
        prisma,
        pubsub
      }
    }
  },
  subscriptions: {
    onConnect: async (connectionParams, webSocket) => {
      const tokenWithBearer = connectionParams.Authorization || ''
      const token = tokenWithBearer.split(' ')[1]
      const user = await getUser(token)
      return {
        user,
        prisma,
        pubsub
      }
    }
  }
});

server
  .listen({
    port: 8383
  })
  .then(info => console.log(`Server started on http://localhost:${info.port}`));
