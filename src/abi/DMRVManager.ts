export const dMRVManagerABI = [
  {
    type: 'event',
    name: 'VerificationSubmitted',
    inputs: [
      {
        name: 'verificationId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'projectId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'verifier',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'claimCID',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'VerificationOutcome',
    inputs: [
      {
        name: 'verificationId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'success',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
      {
        name: 'data',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
] as const; 