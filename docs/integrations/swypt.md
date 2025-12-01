SWYPT API DOCUMENTATION FOR ON-RAMPS & OFF-RAMPS
This repo serves as a documentation for integration with swypt APIs and how to integrate with our smart contract functions.

Deployed Contract on POLYGON Swypt Contract

Deployed Contract on LISK Swypt Contract

Deployed Contract on Celo Swypt Contract

Deployed Contract on Base Swypt Contract

Deployed Contract on Scroll Swypt Contract

SWYPT SMART CONTRACT ABI
For interacting with the Swypt smart contracts, you'll need the contract ABI (Application Binary Interface). Below is the complete ABI for all supported networks.

Contract ABI
export const SWYPT_CONTRACT_ABI = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'AccessControlBadConfirmation', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'bytes32', name: 'neededRole', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'target', type: 'address' }],
    name: 'AddressEmptyCode',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'err', type: 'uint256' }],
    name: 'AddressZero',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'implementation', type: 'address' },
    ],
    name: 'ERC1967InvalidImplementation',
    type: 'error',
  },
  { inputs: [], name: 'ERC1967NonPayable', type: 'error' },
  { inputs: [], name: 'EnforcedPause', type: 'error' },
  { inputs: [], name: 'ExpectedPause', type: 'error' },
  { inputs: [], name: 'FailedInnerCall', type: 'error' },
  {
    inputs: [{ internalType: 'uint256', name: 'err', type: 'uint256' }],
    name: 'InsufficientBalance',
    type: 'error',
  },
  { inputs: [], name: 'InvalidInitialization', type: 'error' },
  { inputs: [], name: 'NotInitializing', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
  {
    inputs: [{ internalType: 'uint256', name: 'err', type: 'uint256' }],
    name: 'TransferFailed',
    type: 'error',
  },
  { inputs: [], name: 'UUPSUnauthorizedCallContext', type: 'error' },
  {
    inputs: [{ internalType: 'bytes32', name: 'slot', type: 'bytes32' }],
    name: 'UUPSUnsupportedProxiableUUID',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'newBeneficiary',
        type: 'address',
      },
    ],
    name: 'BeneficiaryUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'Deposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'beneficiary',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'FundsWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'NativeTokenDeposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Refunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'role', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'previousAdminRole',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'newAdminRole',
        type: 'bytes32',
      },
    ],
    name: 'RoleAdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'role', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'role', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Unpaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'Upgraded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      { indexed: true, internalType: 'uint256', name: 'time', type: 'uint256' },
    ],
    name: 'sentToUser',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'UPGRADE_INTERFACE_VERSION',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'beneficiary',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'depositNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_userAddress', type: 'address' },
      { internalType: 'address', name: '_token', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'depositToWallet',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'role', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_defaultAdmin', type: 'address' },
      { internalType: 'address', name: '_beneficiary', type: 'address' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'isWhitelistedAsset',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_userAddress', type: 'address' },
      { internalType: 'address', name: '_tokenAddress', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'refundUser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'callerConfirmation', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_newBeneficiary', type: 'address' },
    ],
    name: 'setBeneficiary',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'newImplementation', type: 'address' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_nonce', type: 'uint256' }],
    name: 'viewDepositWithNonce',
    outputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'exchangeRate', type: 'uint256' },
      { internalType: 'uint256', name: 'feeAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_tokenAddress', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'address', name: '_userAddress', type: 'address' },
    ],
    name: 'withdrawFunds',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_tokenAddress', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'withdrawToEscrow',
    outputs: [{ internalType: 'uint256', name: 'nonce', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_tokenAddress', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'withdrawWithPermit',
    outputs: [{ internalType: 'uint256', name: 'nonce', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
];
Key Functions for Integration
The main functions you'll use for offramp operations are:

withdrawToEscrow - Standard withdrawal (requires prior token approval)
withdrawWithPermit - Withdrawal with EIP-2612 permit (no separate approval needed)
viewDepositWithNonce - View withdrawal details by nonce
For more details on using these functions, refer to the OFF-RAMP FLOW section in this documentation.

Getting Quotes
Before performing any on-ramp or off-ramp operations, you should first get a quote to determine rates, fees, and expected output amounts.

Get Quote Endpoint
POST https://pool.swypt.io/api/fx-quotes

Get quote for converting between fiat and crypto currencies.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
Request Parameters
Parameter	Description	Example	Required
type	Type of operation ('onramp' or 'offramp')	"onramp"	Yes
amount	Amount to convert	"5000"	Yes
fiatCurrency	Fiat currency code	"KES"	Yes
cryptoCurrency	Cryptocurrency symbol	"USDT"	Yes
network	Blockchain network	"celo"	Yes
category	Transaction category (for offramp only)	"B2C"	No
Example Requests
Onramp (Converting KES to USDT):
const response = await axios.post('https://pool.swypt.io/api/fx-quotes', {
  type: "onramp",
  amount: "100",
  fiatCurrency: "KES",
  cryptoCurrency: "USDT", //cKes, USDC
  network: "celo"
}, {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Offramp (Converting USDT to KES):
const response = await axios.post('https://pool.swypt.io/api/fx-quotes', {
  type: "offramp",
  amount: "2",
  fiatCurrency: "KES",
  cryptoCurrency: "USDT",
  network: "celo",
  category: "B2C"
}, {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Response Format For Successful Quote Request for Off-Ramping
{
    "statusCode": 200,
    "message": "Quote retrieved successfully",
    "data": {
        "inputAmount": "0.2",
        "outputAmount": "25.8900",
        "inputCurrency": "USDT",
        "outputCurrency": "KES",
        "exchangeRate": 129.45,
        "type": "offramp",
        "network": "lisk",
        "fee": {
            "feeInInputCurrency": "0.007725",
            "currency": "USDT",
            "feeInOutputCurrency": 1,
            "estimatedOutputKES": 24.89,
            "decimals": 6
        },
        "limits": {
            "min": 10,
            "max": 30000,
            "currency": "KES"
        }
    }
}
Response Format For Successful Quote Request for On-Ramping
{
    "statusCode": 200,
    "message": "Quote retrieved successfully",
    "data": {
        "inputAmount": "100",
        "outputAmount": 0.7738740133106331,
        "inputCurrency": "KES",
        "outputCurrency": "USDT",
        "exchangeRate": 129.22,
        "type": "onramp",
        "network": "lisk",
        "fee": {
            "feeInKES": 1,
            "estimatedOutputKES": 101
        },
        "limits": {
            "min": 1,
            "max": 10000,
            "currency": "KES"
        }
    }
}
Error Responses
Authentication Error
{
  "status": "error",
  "message": "API key and secret are required"
}
{
  "status": "error",
  "message": "Invalid API credentials"
}
Validation Error
{
  "statusCode": 400,
  "message": "Invalid network",
  "error": "Unsupported network. Supported networks: Lisk, celo, Base, Polygon"
}
Server Error
{
  "error": "Internal server error"
}
Get Supported Assets
GET https://pool.swypt.io/api/listed-assets

Retrieve all supported assets, networks, and currencies.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
Example Request
const response = await axios.get('https://pool.swypt.io/api/listed-assets', {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Response Format
{
    "networks": [
        "lisk",
        "celo",
        "base",
        "polygon",
        "scroll"
    ],
    "fiat": [
        "KES",
        "USD"
    ],
    "crypto": {
        "lisk": [
            {
                "symbol": "USDT",
                "name": "Tether LISK",
                "decimals": 6,
                "address": "0x05D032ac25d322df992303dCa074EE7392C117b9"
            },
            {
                "symbol": "ETH",
                "name": "Ethereum",
                "decimals": 18,
                "address": "0x0000000000000000000000000000000000000000"
            }
        ],
        "celo": [
            {
                "symbol": "USDT",
                "name": "Tether Celo",
                "decimals": 6,
                "address": "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
            },
            {
                "symbol": "cKES",
                "name": "Celo Kenyan Shilling",
                "decimals": 18,
                "address": "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0"
            },
            {
                "symbol": "USDC",
                "name": "USDC",
                "decimals": 6,
                "address": "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
            },
            {
                "symbol": "CELO",
                "name": "Celo",
                "decimals": 18,
                "address": "0x471EcE3750Da237f93B8E339c536989b8978a438"
            }
        ],
        "base": [
            {
                "symbol": "USDC",
                "name": "USDC",
                "decimals": 6,
                "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
            },
            {
                "symbol": "ETH",
                "name": "ETH",
                "decimals": 18,
                "address": "0x0000000000000000000000000000000000000000"
            }
        ],
        "polygon": [
            {
                "symbol": "USDT",
                "name": "Tether Polygon",
                "decimals": 6,
                "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
            },
            {
                "symbol": "USDC",
                "name": "USD Coin Polygon",
                "decimals": 6,
                "address": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
            },
            {
                "symbol": "MATIC",
                "name": "Polygon",
                "decimals": 18,
                "address": "0x0000000000000000000000000000000000000000"
            }
        ],
        "scroll": [
            {
                "symbol": "USDT",
                "name": "Tether scroll",
                "decimals": 6,
                "address": "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df"
            },
            {
                "symbol": "ETH",
                "name": "ETH",
                "decimals": 18,
                "address": "0x0000000000000000000000000000000000000000"
            }
        ]
    }
}
Error Responses
Authentication Error
{
  "status": "error",
  "message": "API key and secret are required"
}
{
  "status": "error",
  "message": "Invalid API credentials"
}
Server Error
{
  "error": "Internal server error"
}
OFF-RAMP FLOW
Swypt offramp involves the following steps
Calling the Swypt smart contract withdrawToEscrow or withdrawWithPermit functions and perform a blockchain transaction
Call swypt offramp API endpoint with a payload containing the required params as discussed below to initiate an offramp transaction
withdrawWithPermit
Enables token withdrawal using EIP-2612 permit, eliminating the need for a separate approval transaction

Parameters

_tokenAddress (address): Token contract address being withdrawn
_amountPlusfee (uint256): Total withdrawal amount including fees
deadline (uint): Timestamp until which the signature is valid
v (uint8): Recovery byte of the signature
r (bytes32): First 32 bytes of the signature
s (bytes32): Second 32 bytes of the signature
Here is an example

// Create permit signature (on client side)
const domain = {
    name: 'Token Name',
    version: '1',
    chainId: 1,
    verifyingContract: tokenAddress
};

const permit = {
    owner: userAddress,
    spender: contractAddress,
    value: amountPlusFee,
    nonce: await token.nonces(userAddress),
    deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
};

const { v, r, s } = await signer._signTypedData(domain, types, permit);

// Call the withdraw function
const tx = await contract.withdrawWithPermit(
    tokenAddress,
    amountPlusFee,
    permit.deadline,
    v,
    r,
    s
);
Returns nonce (uint256): Unique identifier for the withdrawal transaction
withdrawToEscrow
Performs a token withdrawal to an escrow account. Requires prior token approval.

Parameters

_tokenAddress (address): Token contract address being withdrawn
_amountPlusfee (uint256): Total withdrawal amount including fees

Returns nonce (uint256): Unique identifier for the withdrawal transaction

Example

// Approve contract first
await token.approve(contractAddress, amountPlusFee);

// Perform withdrawal
const tx = await contract.withdrawToEscrow(
    tokenAddress,
    amountPlusFee
);
Offramp Transaction Processing
Initiate Offramp Transaction
POST https://pool.swypt.io/api/offramp-orders Process an offramp transaction after successful blockchain withdrawal.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
Request Parameters
Parameter	Description	Required	Example
chain	Blockchain network	Yes	"celo"
hash	Transaction hash from blockchain	Yes	"0x80856f025..."
partyB	Recipient's phone number	Yes	"254703710518"
tokenAddress	Token contract address	Yes	"0x48065fbBE..."
project	The name of your project	Yes	"project-mocha"
userAddress	The wallet address for the user offramping	Yes	"0x80856f025..."
NOTE: The name of your project is compulsary to help us identify and process any pending, failed transactions or tickets created by a project

Example Request (Standard Chain)
const response = await axios.post('https://pool.swypt.io/api/offramp-orders', {
  chain: "celo",
  hash: "0x80856f025035da9387873410155c4868c1825101e2c06d580aea48e8179b5e0b",
  partyB: "254703710518",
  tokenAddress: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  project: "project-mocha",
  userAddress: "0x98e35888468c07320e1061eB8F5D6Bb7dc491b7c"
}, {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Successful Response
{
  "status": "success",
  "message": "Withdrawal payment initiated successfully",
  "data": {
    "orderID": "WD-xsy6e-HO"
  }
}
Error Responses
  "status": "error",
  "message": "This blockchain transaction has already been processed",
  "data": {
    "orderID": "WD-xsy6e-HO"
  }
}
{
  "status": "error",
  "message": "Missing required parameters: tokenAddress, hash, or phone number"
}
{
  "status": "error",
  "message": "Missing required ICP parameters"
}
{
  "status": "error",
  "message": "Unsupported blockchain: [chain name]"
}
Check off-ramp Transaction Status
GET https://pool.swypt.io/api/offramp-order-status/:orderID Check the status of an offramp transaction using its orderID.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
Parameters
Parameter	Location	Description	Required	Example
orderID	URL	Transaction order ID	Yes	"WD-xsy6e-HO"
Example Request
const response = await axios.get('https://pool.swypt.io/api/offramp-order-status/WD-xsy6e-HO', {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Successful Response
{
  "status": "success",
  "data": {
    "status": "SUCCESS",
    "message": "Withdrawal completed successfully",
    "details": {
      "phoneNumber": "254703710518",
      "ReceiverPartyPublicName": "254703710518 - Henry Kariuki Nyagah",
      "transactionSize": "20.00",
      "transactionSide": "withdraw",
      "initiatedAt": "2025-02-02T12:45:21.859Z",
      "mpesaReceipt": "TB21GOZTI9",
      "completedAt": "2025-02-02T15:45:23.000Z"
    }
  }
}
Possible Status Values
PENDING: Transaction is being processed SUCCESS: Transaction completed successfully FAILED: Transaction failed

Error Responses
Missing Order ID:
{
  "status": "error",
  "message": "orderID ID is required"
}
Transaction not found
{
  "status": "error",
  "message": "Transaction with the following WD-xsy6e-HO the not found"
}
Server Error
{
  "status": "error",
  "message": "Failed to check withdrawal status"
}
Response Details by Status
Pending Transaction:
{
  "status": "success",
  "data": {
    "status": "PENDING",
    "message": "Your withdrawal is being processed",
    "details": {
      "phoneNumber": "254703710518",
      "ReceiverPartyPublicName": "254703710518 - Henry Kariuki Nyagah",
      "transactionSize": "20.00",
      "transactionSide": "withdraw",
      "initiatedAt": "2025-02-02T12:45:21.859Z"
    }
  }
}
Failed Transaction
{
  "status": "success",
  "data": {
    "status": "FAILED",
    "message": "Withdrawal failed",
    "details": {
      "phoneNumber": "254703710518",
      "ReceiverPartyPublicName": "254703710518 - Henry Kariuki Nyagah",
      "transactionSize": "20.00",
      "transactionSide": "withdraw",
      "initiatedAt": "2025-02-02T12:45:21.859Z",
      "failureReason": "Transaction timeout",
      "resultCode": "1234"
    }
  }
}
Create Offramp Ticket
POST https://pool.swypt.io/api/offramp-ticket Create a ticket for offramp transactions. This endpoint supports two methods:

Creating a ticket from a failed/pending transaction using orderID
Creating a new ticket directly with all required information
Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
Request Parameters
Parameter	Description	Required	Example
orderID	ID of failed/pending transaction	No*	"WD-xsy6e-HO"
phone	User's phone number	Yes**	"254703710518"
amount	Crypto amount	Yes**	"100"
description	Ticket description	Yes**	"Failed withdrawal attempt"
side	Transaction side	Yes**	"off-ramp"
userAddress	User's blockchain address	Yes**	"0x742d35..."
symbol	Token symbol	Yes**	"USDT"
tokenAddress	Token contract address	Yes**	"0xc2132D05..."
chain	Blockchain network	Yes**	"Polygon"
* Either orderID OR all other fields are required
** Required only when orderID is not provided

Example Requests
Creating ticket from failed/pending transaction:
const response = await axios.post('https://pool.swypt.io/api/offramp-ticket', {
  orderID: "WD-xsy6e-HO",
  description: "Refund for failed withdrawal",
  symbol: "USDT",  // Optional override
  chain: "Polygon" // Optional override
}, {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Creating new ticket direclty
const response = await axios.post('https://pool.swypt.io/api/offramp-ticket', {
  phone: "254703710518",
  amount: "100",
  description: "Failed withdrawal attempt",
  side: "off-ramp",
  userAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  symbol: "USDT",
  tokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  chain: "Polygon"
}, {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Successful Response
{
  "status": "success",
  "data": {
    "refund": {
      "PhoneNumber": "254703710518",
      "Amount": "100",
      "Description": "Failed withdrawal attempt",
      "Side": "off-ramp",
      "userAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "symbol": "USDT",
      "tokenAddress": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "chain": "Polygon",
      "_id": "507f1f77bcf86cd799439011",
      "createdAt": "2025-02-15T12:00:00.000Z"
    }
  }
}
Error Responses
1.Missing Required Fields:

{
  "status": "error",
  "message": "Please provide all required inputs: phone, amount, description, side, userAddress, symbol, tokenAddress, and chain"
}
2.Invalid orderID

{
  "status": "error",
  "message": "No failed or pending transaction found with this orderID"
}
3.Validation Error

{
  "status": "error",
  "message": "ValidationError: [specific validation message]"
}
4.Server Error

{
  "status": "error",
  "message": "Unable to process refund ticket"
}
Important Notes
Either provide orderID OR all other required fields
When using orderID, the ticket will be created using data from the failed or pending transaction
You can override specific fields (symbol, chain) even when using orderID
Both failed AND pending transactions can be used with orderID
All fields are required when creating a ticket directly without orderID
Phone numbers should be in international format (e.g., "254703710518")
The system automatically sets side to 'off-ramp' if not provided
ONRAMP PROCESS FLOW
1. Initiate STK Push
POST https://pool.swypt.io/api/onramp-orders Initiates the M-Pesa STK push process for fiat deposit.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
Request Parameters
Parameter	Description	Required	Example
partyA	User's phone number	Yes	"254703710518"
amount	Amount in KES	Yes	"5000"
side	Transaction side	Yes	"onramp"
userAddress	User's blockchain address	Yes	"0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
tokenAddress	Token contract address	Yes	"0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
Example Request
const response = await axios.post('https://pool.swypt.io/api/onramp-orders', {
  partyA: "254703710518",
  amount: "5000",
  side: "onramp",
  userAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  tokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
}, {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Successful Response
{
  "status": "success",
  "message": "STK Push initiated successfully",
  "data": {
    "orderID": "D-rclsg-VL",
    "message": "Success. Request accepted for processing"
  }
}
Error Responses
1.Missing Required Parameters:

{
  "status": "error",
  "message": "Failed to record the onramp transaction order"
}
STK Push Failure
{
  "status": "error",
  "message": "Failed to initiate STK Push payment"
}
3.Server Error

{
  "status": "error",
  "message": "An error occurred during the STK Push transaction"
}
2. Check Onramp Status
GET https://pool.swypt.io/api/onramp-order-status/:orderID Check the status of an STK push transaction.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
URL Parameters
Parameter	Description	Required	Example
orderID	Transaction order ID	Yes	"D-rclsg-VL"
Example Request
const response = await axios.get('https://pool.swypt.io/api/onramp-order-status/D-rclsg-VL', {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Response Scenarios
1.Successful Transaction:

{
  "status": "success",
  "data": {
    "status": "SUCCESS",
    "message": "Deposit completed successfully",
    "orderID": "D-ri3b1-7H",
    "details": {
      "phoneNumber": "254703710518",
      "mpesaReceipt": "TBF842GPCO",
      "transactionDate": "2025-02-15T08:33:38.000Z",
      "resultDescription": "Transaction initiated",
    }
  }
}
2.Failed Transaction:

{
  "status": "success",
  "data": {
    "status": "FAILED",
    "message": "Insufficient balance",
    "orderID": "D-rm3qn-3Q",
    "details": {
      "phoneNumber": "254703710518",
      "mpesaReceipt": "ws_CO_15022025083640743703710518",
      "transactionDate": "2025-02-15T08:36:40.000Z",
      "resultDescription": "Insufficient balance",

    }
  }
}
3.Pending Transaction:

{
  "status": "success",
  "data": {
    "status": "PENDING",
    "message": "Your deposit is being processed",
    "orderID": "D-roug7-UT",
    "details": {
      "phoneNumber": "254703710518",
      "mpesaReceipt": "ws_CO_15022025083848183703710518",
      "transactionDate": "2025-02-15T08:38:48.000Z",
      "resultDescription": "Transaction initiated",
     
    }
  }
}
Error Responses
Missing Order ID:
{
  "status": "error",
  "message": "orderID is required"
}
Transaction Not Found:
{
  "status": "error",
  "message": "Transaction D-rclsg-VL not found"
}
3.Server Error:

{
  "status": "error",
  "message": "Failed to check deposit status"
}
3. Process Crypto Transfer To User
POST https://pool.swypt.io/api/deposit Process the crypto transfer after successful M-Pesa payment.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
Request Parameters
Parameter	Description	Required	Example
chain	Blockchain network	Yes	"celo"
address	Recipient address	Yes	"0x742d35..."
orderID	Original transaction order ID	Yes	"D-ri3b1-7H"
project	Project identifier	Yes	"name of your project"
NOTE: The name of your project is compulsary to help us identify and process any pending, failed transactions or tickets created by a project

Example Request
const response = await axios.post('https://pool.swypt.io/api/deposit', {
  chain: "celo",
  address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  orderID: "D-ri3b1-7H",
  project: "project-mocha"
}, {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Success Response
{
  "status": 200,
  "message": "Transaction processed successfully",
  "createdAt": "2025-02-15T08:33:38.000Z",
  "updatedAt": "2025-02-15T08:33:45.000Z",
  "hash": "0x80856f025035da9387873410155c4868c1825101e2c06d580aea48e8179b5e0b"
}
Error Responses
Missing Parameters:
{
  "status": "error",
  "message": "Missing required parameters: address or orderID"
}
2.Transaction Not Found:

{
  "status": "error",
  "message": "No transaction found for orderID: D-ri3b1-7H"
}
Transaction Pending:
{
  "status": "error",
  "message": "Transaction D-ri3b1-7H: STK push payment is being processed"
}
Transaction Failed:
{
  "status": "error",
  "message": "Transaction D-ri3b1-7H: Payment failed"
}
5.Transaction Already Processed:

{
  "status": "error",
  "message": "Transaction D-ri3b1-7H has already been processed"
}
Invalid Chain:
{
  "status": "error",
  "message": "Invalid chain: XYZ"
}
Unsupported Chain:
{
  "status": "error",
  "message": "XYZ chain is not supported"
}
8.Processing Error:

{
  "status": "error",
  "message": "Failed to process [Chain] transaction: [specific error message]"
}
Supported Chains
Celo
Polygon
Base
Lisk
Notes
This endpoint should only be called after a successful STK push payment (status: SUCCESS)
The system automatically calculates exchange rates and fees based on the payment amount
Create Onramp Ticket
POST /api/onramp-ticket

Create a ticket for onramp transactions. This endpoint supports two methods:

Creating a ticket from a failed/cancelled transaction using orderID
Creating a new ticket directly with all required information
Request Parameters
Parameter	Description	Required*	Example
orderID	ID of failed/cancelled transaction	No**	"D-rm3qn-3Q"
phone	User's phone number	Yes	"254703710518"
amount	Transaction amount	Yes	"5000"
description	Ticket description	Yes	"Failed STK push attempt"
side	Transaction side	Yes	"on-ramp"
userAddress	User's blockchain address	Yes	"0x742d35..."
symbol	Token symbol	Yes	"USDT"
tokenAddress	Token contract address	Yes	"0xc2132D05..."
chain	Blockchain network	Yes	"Polygon"
* Required for direct ticket creation ** If orderID is provided, other fields become optional and will be populated from the failed transaction

Example Requests
Creating ticket from failed transaction:
const response = await axios.post('https://pool.swypt.io/api/onramp-ticket', {
  orderID: "D-rm3qn-3Q",
  description: "Refund for failed STK push",
  symbol: "USDT",  // Optional override
  chain: "Polygon" // Optional override
});
Creating new ticket directly:
const response = await axios.post('https://pool.swypt.io/api/onramp-ticket', {
  phone: "254703710518",
  amount: "5000",
  description: "Failed deposit attempt",
  side: "on-ramp",
  userAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  symbol: "USDT",
  tokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  chain: "Polygon"
});
Success Response
{
  "status": "success",
  "data": {
    "refund": {
      "PhoneNumber": "254703710518",
      "Amount": "5000",
      "Description": "Failed deposit attempt",
      "Side": "on-ramp",
      "userAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "symbol": "USDT",
      "tokenAddress": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "chain": "Polygon",
      "_id": "507f1f77bcf86cd799439011",
      "createdAt": "2025-02-15T12:00:00.000Z"
    }
  }
}
Error Responses
Missing Required Fields:
{
  "status": "error",
  "message": "Please provide all required inputs: phone, amount, description, side, userAddress, symbol, tokenAddress, and chain"
}
Invalid Order ID:
{
  "status": "error",
  "message": "No failed transaction found with this orderID"
}
Validation Error:
{
  "status": "error",
  "message": "ValidationError: [specific validation message]"
}
Server Error:
{
  "status": "error",
  "message": "Unable to process refund ticket"
}
Important Notes
When using orderID, the ticket will be created using data from the failed transaction
You can override specific fields (symbol, chain) even when using orderID
Only failed or cancelled transactions can be used with orderID
All fields are required when creating a ticket directly without orderID
Phone numbers should be in international format (e.g., "254703710518")
User Transaction History
Get User Onramp Transactions
GET https://pool.swypt.io/api/deposit-transactions/{userAddress}

Retrieve all onramp (deposit) transactions for a specific user address.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
URL Parameters
Parameter	Description	Required	Example
userAddress	User's blockchain address	Yes	"0xb4da1bab9089BeE775577B3c6e27133aaf3946aA"
Example Request
const response = await axios.get('https://pool.swypt.io/api/deposit-transactions/0xb4da1bab9089BeE775577B3c6e27133aaf3946aA', {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Successful Response
{
    "status": 200,
    "message": "Transactions retrieved successfully (sorted from latest to oldest)",
    "data": [
        {
            "id": "686fb289c86af65ade30aaf6",
            "MpesaReceiptNumber": "TGA6EIIORA",
            "TransactionDate": "2025-07-10T12:31:05.398Z",
            "cryptoAmount": "0.1621872103799815",
            "feeAmount": "1",
            "side": "onramp",
            "symbol": "USDT",
            "isSent": true,
            "createdAt": "2025-07-10T12:31:05.398Z",
            "Amount": 21,
            "orderID": "D-d9m0k-T8",
            "transactionID": "0x65d0ab0e24679a1b88411a84d4e7b485c8f30b31539841aed09231a0c7508a32",
            "PhoneNumber": 254703710518,
            "resultDescription": "Transaction initiated"
        }
    ],
    "pagination": {
        "currentPage": 1,
        "limit": 10,
        "totalPages": 3,
        "totalCount": 28
    }
}
Error Response
{
    "status": "error",
    "message": "No transactions found for the given user address"
}
Get User Offramp Transactions
GET https://pool.swypt.io/api/withdrawal-transactions/{userAddress}

Retrieve all offramp (withdrawal) transactions for a specific user address.

Authentication Required
This endpoint requires API key authentication. Include the following headers with your request:

x-api-key: Your API key
x-api-secret: Your API secret
URL Parameters
Parameter	Description	Required	Example
userAddress	User's blockchain address	Yes	"0xb4da1bab9089BeE775577B3c6e27133aaf3946aA"
Example Request
const response = await axios.get('https://pool.swypt.io/api/withdrawal-transactions/0xb4da1bab9089BeE775577B3c6e27133aaf3946aA', {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
Successful Response
{
    "status": 200,
    "message": "B2C transactions retrieved successfully (sorted from latest to oldest)",
    "data": [
        {
            "id": "686fb209c86af65ade30aabc",
            "TransactionAmount": 38,
            "TransactionReceipt": "TGA2EI5X5C",
            "ReceiverPartyPublicName": "254703710518 - Henry Kariuki Nyagah",
            "TransactionCompletedDateTime": "2025-07-10T12:28:57.273Z",
            "transactionID": "0x52b86f766f41938321b4ba50362c4eb69e0a975e9130deeba2c66e0826053d88",
            "transactionSize": "38",
            "transactionFee": "0.007723",
            "transactionSide": "papasharky",
            "exchangeRate": "129.48",
            "createdAt": "2025-07-10T12:28:57.273Z",
            "chain": "lisk",
            "isSent": true,
            "orderID": "WD-d6v5j-FB",
            "PhoneNumber": "254703710518",
            "resultDescription": "Transaction completed successfully"
        }
    ],
    "pagination": {
        "currentPage": 1,
        "limit": 10,
        "totalPages": 1,
        "totalCount": 10
    }
}
Error Response
{
    "status": "error",
    "message": "No B2C transactions found for the given user address."
}
Response Fields Description
Onramp Transaction Fields
MpesaReceiptNumber: M-Pesa transaction receipt
TransactionDate: When the transaction occurred
cryptoAmount: Amount of crypto received
feeAmount: Fee charged in fiat currency
side: Transaction type ("onramp")
symbol: Cryptocurrency symbol (USDT, USDC, etc.)
Amount: Fiat amount deposited
orderID: Unique transaction identifier
transactionID: Blockchain transaction hash
PhoneNumber: User's phone number
isSent: Whether crypto was successfully sent to user
Offramp Transaction Fields
TransactionAmount: Fiat amount sent to user
TransactionReceipt: M-Pesa receipt number
ReceiverPartyPublicName: Recipient's name from M-Pesa
TransactionCompletedDateTime: When transaction completed
transactionID: Blockchain transaction hash
transactionSize: Amount in fiat currency
transactionFee: Fee charged in crypto
exchangeRate: Crypto to fiat exchange rate used
chain: Blockchain network used
orderID: Unique transaction identifier
PhoneNumber: Recipient's phone number
isSent: Whether fiat was successfully sent
Notes
Both endpoints return transactions sorted from latest to oldest
Pagination is included for large transaction histories
All timestamps are in ISO 8601 format (UTC)
Phone numbers are in international format
Transaction amounts and fees are returned as strings to maintain precision
Supported Chains
Lisk
Polygon
Celo
Base
Polygon
Each chain has specific processing logic and may have different requirements or response formats.