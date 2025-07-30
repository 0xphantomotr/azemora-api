export const bondingCurveFactoryABI = [
  {
    "type": "event",
    "name": "BondingCurveCreated",
    "inputs": [
      { "name": "projectId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "projectOwner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "bondingCurveAddress", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "tokenAddress", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "strategyId", "type": "bytes32", "indexed": false, "internalType": "bytes32" }
    ],
    "anonymous": false
  }
] as const; 