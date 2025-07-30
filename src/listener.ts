import { createPublicClient, webSocket, decodeAbiParameters } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { prisma } from './db';
import { projectRegistryABI } from './abi/ProjectRegistry';
import { dMRVManagerABI } from './abi/DMRVManager';
import { ProjectStatus } from '@prisma/client';

import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_REGISTRY_ADDRESS = process.env.PROJECT_REGISTRY_ADDRESS as `0x${string}`;
const DMRV_MANAGER_ADDRESS = process.env.DMRV_MANAGER_ADDRESS as `0x${string}`;
const ALCHEMY_WSS_URL = process.env.ALCHEMY_WSS_URL;

if (!PROJECT_REGISTRY_ADDRESS || !DMRV_MANAGER_ADDRESS || !ALCHEMY_WSS_URL) {
  throw new Error("Missing required environment variables");
}

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

  // --- Watcher 1: Project Registry ---
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

  // --- Watcher 2: dMRV Manager ---
  console.log('--- Watching dMRV Manager Events ---');

  publicClient.watchContractEvent({
    address: DMRV_MANAGER_ADDRESS,
    abi: dMRVManagerABI,
    eventName: 'VerificationSubmitted',
    onLogs: (logs) => {
      for (const log of logs) {
        const { verificationId, projectId, verifier } = log.args;
        if (!verificationId || !projectId || !verifier) continue;

        console.log(`[+] Detected VerificationSubmitted: ${verificationId}`);
        prisma.verification.create({
          data: {
            id: verificationId,
            projectId: projectId,
            verifier: verifier,
            status: 'Submitted',
          },
        }).catch(console.error);
      }
    },
  });

  publicClient.watchContractEvent({
    address: DMRV_MANAGER_ADDRESS,
    abi: dMRVManagerABI,
    eventName: 'VerificationOutcome',
    onLogs: (logs) => {
      for (const log of logs) {
        const { verificationId, success, data } = log.args;
        if (!verificationId || success === undefined) continue;
        const status = success ? 'Succeeded' : 'Failed';

        console.log(`[*] Detected VerificationOutcome for ${verificationId} to ${status}`);
        prisma.verification.update({
          where: { id: verificationId },
          data: { status: status, outcomeData: data ? Buffer.from(data.slice(2), 'hex') : null },
          include: { project: true },
        }).then(async (updatedVerification) => {
          if (success && data) {
            const [amount] = decodeAbiParameters([{ type: 'uint256' }], data);
            console.log(`    -> Minting ${amount.toString()} credits for project ${updatedVerification.projectId}`);
            await prisma.impactCredit.create({
              data: {
                verificationId: verificationId,
                projectId: updatedVerification.projectId,
                amount: amount.toString(),
                txHash: log.transactionHash,
              },
            });
          }
        }).catch(console.error);
      }
    },
  });

  console.log('Listening for new on-chain events via WebSocket...');
}

main().catch(console.error); 