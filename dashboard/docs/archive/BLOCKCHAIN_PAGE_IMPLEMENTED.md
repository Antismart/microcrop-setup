# Blockchain Page Implementation Summary

## Work Completed
1.  **Fixed `useReadPolicy` Hook**: Updated `dashboard/src/hooks/use-contract.ts` to safely handle empty strings for `policyId`, preventing `BigInt` conversion errors.
2.  **Implemented Policy Verification**: Added a new "Verify Policy On-Chain" section to `dashboard/app/dashboard/blockchain/page.tsx`.
    *   Allows users to input a Policy ID.
    *   Fetches policy data directly from the blockchain using `useReadPolicy`.
    *   Displays policy details (Farmer Address, Status, Premium, Sum Insured) if found.
    *   Handles loading and error states.

## Verification
-   The Blockchain page now provides actual interactivity beyond just wallet connection.
-   Users can verify that a policy exists on-chain and matches the off-chain records.
-   The page gracefully handles invalid inputs or missing policies.
