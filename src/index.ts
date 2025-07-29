import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { prisma } from './db';
import { ProjectStatus } from '@prisma/client';

const typeDefs = readFileSync('./src/schema.graphql', { encoding: 'utf-8' });

interface ProjectsArgs {
  status?: ProjectStatus;
  skip?: number;
  take?: number;
}

// --- NEW INTERFACE ---
// Define the structure for the single project query arguments
interface ProjectArgs {
  id: string;
}

const resolvers = {
  Query: {
    projects: async (_: any, { status, skip, take }: ProjectsArgs) => {
      const where = status ? { status: status } : {};

      return prisma.project.findMany({
        where: where,
        skip: skip,
        take: take,
        orderBy: {
          createdAt: 'desc',
        },
      });
    },

    // --- NEW RESOLVER ---
    project: async (_: any, { id }: ProjectArgs) => {
      // Use Prisma's findUnique method, which is highly optimized for
      // fetching a single record by its primary key or a unique index.
      return prisma.project.findUnique({
        where: {
          id: id,
        },
      });
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function startServer() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
  console.log(`🚀 Server ready at: ${url}`);
}

startServer(); 