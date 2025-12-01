// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILiquidityPool
 * @notice Interface for the liquidity pool that manages capital from liquidity providers
 * @dev Follows ERC4626-like vault pattern with additional insurance-specific features
 */
interface ILiquidityPool {
    // ============ Structs ============

    /**
     * @notice Represents a liquidity provider's stake in the pool
     * @param amount Total USDC staked by the LP
     * @param shares LP shares minted (represents ownership percentage)
     * @param stakedAt Timestamp when stake was created
     * @param rewardsEarned Accumulated rewards in USDC
     * @param lastRewardClaim Timestamp of last reward claim
     */
    struct Stake {
        uint256 amount;
        uint256 shares;
        uint256 stakedAt;
        uint256 rewardsEarned;
        uint256 lastRewardClaim;
    }

    /**
     * @notice Pool statistics for transparency and risk assessment
     * @param totalStaked Total USDC currently staked in pool
     * @param totalShares Total LP shares issued
     * @param availableCapital USDC available for underwriting new policies
     * @param lockedCapital USDC locked to cover active policies
     * @param totalRewardsPaid Cumulative rewards distributed to LPs
     * @param utilizationRate Percentage of capital currently utilized (basis points)
     */
    struct PoolStats {
        uint256 totalStaked;
        uint256 totalShares;
        uint256 availableCapital;
        uint256 lockedCapital;
        uint256 totalRewardsPaid;
        uint256 utilizationRate;
    }

    // ============ Events ============

    /**
     * @notice Emitted when an LP stakes capital
     * @param staker Address of the liquidity provider
     * @param amount USDC amount staked
     * @param shares LP shares minted
     */
    event Staked(address indexed staker, uint256 amount, uint256 shares);

    /**
     * @notice Emitted when an LP unstakes capital
     * @param staker Address of the liquidity provider
     * @param amount USDC amount unstaked
     * @param shares LP shares burned
     */
    event Unstaked(address indexed staker, uint256 amount, uint256 shares);

    /**
     * @notice Emitted when rewards are distributed to LPs
     * @param totalRewards Total USDC distributed as rewards
     * @param timestamp Distribution timestamp
     */
    event RewardsDistributed(uint256 totalRewards, uint256 timestamp);

    /**
     * @notice Emitted when an LP claims their earned rewards
     * @param staker Address of the liquidity provider
     * @param amount USDC rewards claimed
     */
    event RewardsClaimed(address indexed staker, uint256 amount);

    /**
     * @notice Emitted when capital is locked to underwrite a policy
     * @param policyId ID of the policy being underwritten
     * @param amount USDC amount locked
     */
    event CapitalLocked(uint256 indexed policyId, uint256 amount);

    /**
     * @notice Emitted when capital is unlocked (policy expired or paid out)
     * @param policyId ID of the policy
     * @param amount USDC amount unlocked
     * @param reason Reason for unlock (expired, paid_out, cancelled)
     */
    event CapitalUnlocked(uint256 indexed policyId, uint256 amount, string reason);

    // ============ Staking Functions ============

    /**
     * @notice Stake USDC to become a liquidity provider
     * @param amount Amount of USDC to stake (must be >= minimum stake)
     * @return shares Number of LP shares minted
     */
    function stake(uint256 amount) external returns (uint256 shares);

    /**
     * @notice Unstake USDC and burn LP shares
     * @param shares Number of LP shares to burn
     * @return amount Amount of USDC returned
     */
    function unstake(uint256 shares) external returns (uint256 amount);

    /**
     * @notice Claim accumulated rewards without unstaking
     * @return amount Amount of USDC rewards claimed
     */
    function claimRewards() external returns (uint256 amount);

    // ============ Capital Management ============

    /**
     * @notice Lock capital to underwrite a new policy (only PolicyManager)
     * @param policyId ID of the policy to underwrite
     * @param amount Amount of USDC to lock as coverage
     * @return success True if capital locked successfully
     */
    function lockCapital(uint256 policyId, uint256 amount) external returns (bool success);

    /**
     * @notice Unlock capital when policy expires or is cancelled
     * @param policyId ID of the policy
     * @param amount Amount of USDC to unlock
     * @param reason Reason code for unlock
     * @return success True if capital unlocked successfully
     */
    function unlockCapital(uint256 policyId, uint256 amount, string memory reason)
        external
        returns (bool success);

    /**
     * @notice Distribute rewards to all LPs based on their share percentage
     * @param totalRewards Total USDC rewards to distribute (from premiums)
     */
    function distributeRewards(uint256 totalRewards) external;

    // ============ View Functions ============

    /**
     * @notice Get stake information for a specific LP
     * @param staker Address of the liquidity provider
     * @return stake Stake struct with all LP details
     */
    function getStake(address staker) external view returns (Stake memory stake);

    /**
     * @notice Calculate how many shares would be minted for a stake amount
     * @param amount USDC amount to stake
     * @return shares Number of shares that would be minted
     */
    function calculateShares(uint256 amount) external view returns (uint256 shares);

    /**
     * @notice Calculate how much USDC would be returned for burning shares
     * @param shares Number of shares to burn
     * @return amount USDC amount that would be returned
     */
    function calculateUnstakeAmount(uint256 shares) external view returns (uint256 amount);

    /**
     * @notice Get current pool statistics
     * @return stats PoolStats struct with all metrics
     */
    function getPoolStats() external view returns (PoolStats memory stats);

    /**
     * @notice Check if pool has sufficient capital to underwrite a policy
     * @param amount USDC amount needed for coverage
     * @return available True if capital is available
     */
    function hasAvailableCapital(uint256 amount) external view returns (bool available);

    /**
     * @notice Calculate pending rewards for an LP
     * @param staker Address of the liquidity provider
     * @return rewards USDC rewards pending claim
     */
    function calculatePendingRewards(address staker) external view returns (uint256 rewards);

    /**
     * @notice Get the current utilization rate (locked / total * 10000)
     * @return rate Utilization rate in basis points (0-10000)
     */
    function getUtilizationRate() external view returns (uint256 rate);
}
