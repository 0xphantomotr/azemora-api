import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { prisma } from './db';
import { projectRegistryABI } from './abi/ProjectRegistry';
import { ProjectStatus } from '@prisma/client';

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
  throw new Error("Missing required environment variables");
}

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(`https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
});

const statusMap: { [key: number]: ProjectStatus } = {
  0: 'Pending',
  1: 'Active',
  2: 'Paused',
  3: 'Archived',
};

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

  // --- PASS 1: Index Project Registrations ---
  console.log("\n--- PASS 1: Fetching ProjectRegistered events ---");
  const registrationLogs = [];
  for (let currentBlock = fromBlock; currentBlock <= latestBlock; currentBlock += CHUNK_SIZE) {
    const toBlock = currentBlock + CHUNK_SIZE < latestBlock ? currentBlock + CHUNK_SIZE : latestBlock;
    process.stdout.write(`  Fetching chunk: ${currentBlock} to ${toBlock}... `);
    const logs = await publicClient.getLogs({
      address: PROJECT_REGISTRY_ADDRESS,
      event: projectRegistryABI[0], // ProjectRegistered event
      fromBlock: currentBlock,
      toBlock: toBlock,
    });
    if (logs.length > 0) {
      process.stdout.write(`FOUND ${logs.length}!\n`);
      registrationLogs.push(...logs);
    } else {
      process.stdout.write("OK\r");
    }
  }

  console.log(`\nFound ${registrationLogs.length} total ProjectRegistered events.`);
  for (const log of registrationLogs) {
    const { projectId, owner, metaURI } = log.args;
    if (!projectId || !owner || !metaURI) continue;
    try {
      await prisma.project.upsert({
        where: { id: projectId },
        update: {}, // Do nothing if it exists
        create: {
          id: projectId,
          name: (await fetchAndProcessMetadata(metaURI)).name,
          metaURI: metaURI,
          owner: owner,
          status: 'Pending', // Always start as pending
        },
      });
      console.log(`  Upserted project: ${projectId}`);
    } catch (e) {
      console.error(`  Failed to upsert project ${projectId}:`, e);
    }
  }

  // --- PASS 2: Index Project Status Changes ---
  console.log("\n--- PASS 2: Fetching ProjectStatusChanged events ---");
  const statusChangeLogs = [];
  for (let currentBlock = fromBlock; currentBlock <= latestBlock; currentBlock += CHUNK_SIZE) {
    const toBlock = currentBlock + CHUNK_SIZE < latestBlock ? currentBlock + CHUNK_SIZE : latestBlock;
    process.stdout.write(`  Fetching chunk: ${currentBlock} to ${toBlock}... `);
    const logs = await publicClient.getLogs({
      address: PROJECT_REGISTRY_ADDRESS,
      event: projectRegistryABI[1], // ProjectStatusChanged event
      fromBlock: currentBlock,
      toBlock: toBlock,
    });
    if (logs.length > 0) {
      process.stdout.write(`FOUND ${logs.length}!\n`);
      statusChangeLogs.push(...logs);
    } else {
      process.stdout.write("OK\r");
    }
  }

  console.log(`\nFound ${statusChangeLogs.length} total ProjectStatusChanged events.`);
  for (const log of statusChangeLogs) {
    const { projectId, newStatus } = log.args;
    if (!projectId || newStatus === undefined) continue;

    const mappedStatus = statusMap[newStatus];
    if (!mappedStatus) continue; // Skip if status is unknown

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: mappedStatus },
      });
      console.log(`  Updated status for project ${projectId} to ${mappedStatus}`);
    } catch (e) {
      // This error can happen if a status change is for a project we didn't index.
      // In a robust system, we might handle this, but for now, we log it.
      console.error(`  Could not update status for project ${projectId}:`, e);
    }
  }

  console.log('\n--- Project Backfill Complete ---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 