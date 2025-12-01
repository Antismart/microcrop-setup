// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITreasury
 * @notice Interface for Treasury contract - extended for CRE integration
 */
interface ITreasury {
    /**
     * @notice Request payout from oracle/CRE workflow
     * @param policyId The policy being paid out
     * @param farmer The farmer receiving the payout
     * @param amount The payout amount in USDC (6 decimals)
     * @dev Only callable by authorized PayoutReceiver contract
     */
    function requestPayoutFromOracle(
        uint256 policyId,
        address farmer,
        uint256 amount
    ) external;

    /**
     * @notice Get treasury balance
     * @return balance Current USDC balance
     */
    function getBalance() external view returns (uint256 balance);
}
