import { createPublicClient, webSocket } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { prisma } from './db';
import { projectRegistryABI } from './abi/ProjectRegistry';
import { ProjectStatus } from '@prisma/client';

import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_REGISTRY_ADDRESS = process.env.PROJECT_REGISTRY_ADDRESS as `0x${string}`;
// --- NEW: Get the WSS URL from environment variables ---
const ALCHEMY_WSS_URL = process.env.ALCHEMY_WSS_URL;

if (!PROJECT_REGISTRY_ADDRESS || !ALCHEMY_WSS_URL) {
  throw new Error("Missing required environment variables: PROJECT_REGISTRY_ADDRESS or ALCHEMY_WSS_URL");
}

// --- CHANGE: Create a client using the webSocket transport ---
const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: webSocket(ALCHEMY_WSS_URL),
});

const statusMap: { [key: number]: ProjectStatus } = {
  0: 'Pending',
  1: 'Active',
  2: 'Paused',
  3: 'Archived',
};

async function main() {
  console.log('--- Starting Real-Time Event Listener (WebSocket Mode) ---');

  // Listen for ProjectRegistered events
  publicClient.watchContractEvent({
    address: PROJECT_REGISTRY_ADDRESS,
    abi: projectRegistryABI,
    eventName: 'ProjectRegistered',
    onLogs: (logs) => {
      for (const log of logs) {
        const { projectId, owner, metaURI } = log.args;
        if (!projectId || !owner || !metaURI) continue;

        console.log(`[+] Detected ProjectRegistered: ${projectId}`);
        prisma.project.create({ data: {
          id: projectId,
          name: `Project from ${metaURI.slice(0, 20)}...`,
          metaURI: metaURI,
          owner: owner,
          status: 'Pending',
        }}).catch(console.error);
      }
    },
  });

  // Listen for ProjectStatusChanged events
  publicClient.watchContractEvent({
    address: PROJECT_REGISTRY_ADDRESS,
    abi: projectRegistryABI,
    eventName: 'ProjectStatusChanged',
    onLogs: (logs) => {
      for (const log of logs) {
        const { projectId, newStatus } = log.args;
        if (!projectId || newStatus === undefined) continue;

        const mappedStatus = statusMap[newStatus];
        if (!mappedStatus) continue;

        console.log(`[*] Detected ProjectStatusChanged for ${projectId} to ${mappedStatus}`);
        prisma.project.update({
          where: { id: projectId },
          data: { status: mappedStatus },
        }).catch(console.error);
      }
    },
  });

  console.log('Listening for new on-chain events via WebSocket...');
}

main().catch(console.error); 