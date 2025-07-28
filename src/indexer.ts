import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { prisma } from './db';
import { projectRegistryABI } from './abi/ProjectRegistry';

// Ensure environment variables are loaded
import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_REGISTRY_ADDRESS = process.env.PROJECT_REGISTRY_ADDRESS as `0x${string}`;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// --- DIAGNOSTIC LOGS ---
console.log("----------------------------------------------------");
console.log("[CONFIG] Using Project Registry Address:", PROJECT_REGISTRY_ADDRESS);
console.log("[CONFIG] Alchemy API Key Loaded:", ALCHEMY_API_KEY ? 'Yes' : 'No');
console.log("[CONFIG] Connecting to Chain:", arbitrumSepolia.name);
console.log("----------------------------------------------------");
// --- END DIAGNOSTIC LOGS ---

if (!PROJECT_REGISTRY_ADDRESS || !ALCHEMY_API_KEY) {
  throw new Error("Missing required environment variables: PROJECT_REGISTRY_ADDRESS or ALCHEMY_API_KEY");
}

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(`https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
});

async function fetchAndProcessMetadata(uri: string): Promise<{ name: string; description?: string; imageUrl?: string }> {
  try {
    console.log(`  Fetching metadata from: ${uri}`);
    return { name: `Project from ${uri.slice(0, 20)}...` }; // Placeholder name
  } catch (error) {
    console.error(`  Failed to fetch metadata from ${uri}:`, error);
    return { name: "Unnamed Project (Metadata Failed)" };
  }
}

async function main() {
  console.log('--- Starting Project Backfill ---');

  const fromBlock = 177204599n;
  const latestBlock = await publicClient.getBlockNumber();
  
  const CHUNK_SIZE = 499n;
  const allLogs = [];

  console.log(`Fetching logs from block ${fromBlock} to ${latestBlock} in chunks of ${CHUNK_SIZE}...`);

  for (let currentBlock = fromBlock; currentBlock <= latestBlock; currentBlock += CHUNK_SIZE) {
    const toBlock = currentBlock + CHUNK_SIZE < latestBlock ? currentBlock + CHUNK_SIZE : latestBlock;
    
    // --- FIX: Log every chunk for better feedback ---
    process.stdout.write(`  Fetching chunk: ${currentBlock} to ${toBlock}... `);

    try {
      const logs = await publicClient.getLogs({
        address: PROJECT_REGISTRY_ADDRESS,
        event: projectRegistryABI[0],
        fromBlock: currentBlock,
        toBlock: toBlock,
      });

      if (logs.length > 0) {
        process.stdout.write(`FOUND ${logs.length}!\n`); // Move to new line when found
        allLogs.push(...logs);
      } else {
        process.stdout.write("OK\r"); // Overwrite the line if no logs are found
      }
      
    } catch (error) {
      process.stdout.write("ERROR\n"); // Move to new line on error
      console.error(`  Error fetching logs for block range ${currentBlock}-${toBlock}:`, error);
    }
  }

  // Add a new line after the loop for clean logging
  console.log("\nFinished fetching. Found", allLogs.length, "total ProjectRegistered events.");

  if (allLogs.length === 0) {
    console.log("No projects found to index. Exiting.");
    return;
  }

  for (const log of allLogs) {
    const { projectId, owner, metaURI } = log.args;

    if (!projectId || !owner || !metaURI) {
      console.warn('Skipping log with missing arguments:', log);
      continue;
    }

    console.log(`Processing project ID: ${projectId}`);

    const metadata = await fetchAndProcessMetadata(metaURI);

    try {
      await prisma.project.create({
        data: {
          id: projectId,
          name: metadata.name,
          description: metadata.description,
          imageUrl: metadata.imageUrl,
          metaURI: metaURI,
          owner: owner,
          status: 'Pending',
        },
      });
      console.log(`Successfully indexed project: ${projectId}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Unique constraint failed')) {
        console.log(`Project ${projectId} already exists. Skipping.`);
      } else {
        console.error(`Failed to index project ${projectId}:`, e);
      }
    }
  }

  console.log('--- Project Backfill Complete ---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 