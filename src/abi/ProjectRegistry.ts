export const projectRegistryABI = [
  {
    "type": "event",
    "name": "ProjectRegistered",
    "inputs": [
      { "name": "projectId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "metaURI", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProjectStatusChanged",
    "inputs": [
      { "name": "projectId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "oldStatus", "type": "uint8", "indexed": false, "internalType": "enum IProjectRegistry.ProjectStatus" },
      { "name": "newStatus", "type": "uint8", "indexed": false, "internalType": "enum IProjectRegistry.ProjectStatus" }
    ],
    "anonymous": false
  },
  {
    "type": "function",
    "name": "getProject",
    "inputs": [
      { "name": "projectId", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IProjectRegistry.Project",
        "components": [
          { "name": "id", "type": "bytes32", "internalType": "bytes32" },
          { "name": "metaURI", "type": "string", "internalType": "string" },
          { "name": "owner", "type": "address", "internalType": "address" },
          { "name": "status", "type": "uint8", "internalType": "enum IProjectRegistry.ProjectStatus" }
        ]
      }
    ],
    "stateMutability": "view"
  }
] as const; 