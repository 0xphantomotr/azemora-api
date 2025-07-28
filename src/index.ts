import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { prisma } from './db';

// Read the GraphQL schema from the file system.
// The `readFileSync` is a simple way to load our schema.
const typeDefs = readFileSync('./src/schema.graphql', { encoding: 'utf-8' });

// Resolvers define how to fetch the data for a given type in the schema.
// This resolver tells Apollo how to handle the "projects" query.
const resolvers = {
  Query: {
    // This function will be called when a "projects" query is received.
    projects: async () => {
      // It uses our Prisma client to find all projects in the database.
      // We also order them by creation date to show the newest first.
      return prisma.project.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// The `startStandaloneServer` function is a helper from Apollo to quickly
// start a server. It returns a promise that resolves with the server's URL.
async function startServer() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
  console.log(`🚀 Server ready at: ${url}`);
}

startServer(); 