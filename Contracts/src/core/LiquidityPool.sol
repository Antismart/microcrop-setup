// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MathLib} from "../libraries/MathLib.sol";
import {ILiquidityPool} from "../interfaces/ILiquidityPool.sol";

/**
 * @title LiquidityPool
 * @notice Manages capital from liquidity providers for underwriting insurance policies
 * @dev ERC4626-like vault with insurance-specific capital locking and rewards
 */
contract LiquidityPool is ILiquidityPool, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using MathLib for uint256;

    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant POLICY_MANAGER_ROLE = keccak256("POLICY_MANAGER_ROLE");

    // ============ State Variables ============

    /// @notice USDC token contract
    IERC20 public immutable USDC;

    /// @notice Treasury contract address
    address public immutable treasury;

    /// @notice Total USDC staked by all LPs
    uint256 public totalStaked;

    /// @notice Total LP shares issued
    uint256 public totalShares;

    /// @notice Capital locked for active policies
    uint256 public lockedCapital;

    /// @notice Total rewards distributed (all-time)
    uint256 public totalRewardsPaid;

    /// @notice Minimum stake amount (USDC)
    uint256 public minStakeAmount; // Default: 1000 USDC

    /// @notice Maximum utilization rate (basis points)
    uint256 public maxUtilizationRate; // Default: 8000 (80%)

    /// @notice LP stakes mapping
    mapping(address => Stake) public stakes;

    /// @notice Capital locked per policy
    mapping(uint256 => uint256) public policyCapital;

    /// @notice Reward accumulator for fair distribution
    uint256 public rewardPerShareStored;

    /// @notice Last reward per share for each LP
    mapping(address => uint256) public userRewardPerSharePaid;

    // ============ Events ============

    event MinStakeUpdated(uint256 newMinStake);
    event MaxUtilizationUpdated(uint256 newMaxUtilization);

    // ============ Errors ============

    error StakeTooLow();
    error InsufficientShares();
    error InsufficientCapital();
    error UtilizationTooHigh();
    error NoRewardsToClaim();
    error CapitalAlreadyLocked();

    // ============ Constructor ============

    constructor(address _usdc, address _treasury, address _admin) {
        require(_usdc != address(0), "LiquidityPool: Zero address");
        require(_treasury != address(0), "LiquidityPool: Zero address");
        require(_admin != address(0), "LiquidityPool: Zero address");

        USDC = IERC20(_usdc);
        treasury = _treasury;

        // Set default parameters
        minStakeAmount = 1000 * 1e6; // 1000 USDC
        maxUtilizationRate = 8000; // 80%

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ============ Staking Functions ============

    /**
     * @notice Stake USDC to become a liquidity provider
     * @param amount Amount of USDC to stake
     * @return shares Number of LP shares minted
     */
    function stake(uint256 amount)
        external
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        require(amount >= minStakeAmount, "LiquidityPool: Stake too low");

        // Update rewards before stake changes
        _updateRewards(msg.sender);

        // Calculate shares to mint
        shares = calculateShares(amount);

        // Transfer USDC from staker
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        Stake storage userStake = stakes[msg.sender];
        userStake.amount += amount;
        userStake.shares += shares;
        userStake.stakedAt = userStake.stakedAt == 0 ? block.timestamp : userStake.stakedAt;
        userStake.lastRewardClaim = block.timestamp;

        totalStaked += amount;
        totalShares += shares;

        emit Staked(msg.sender, amount, shares);

        return shares;
    }

    /**
     * @notice Unstake USDC and burn LP shares
     * @param shares Number of LP shares to burn
     * @return amount Amount of USDC returned
     */
    function unstake(uint256 shares)
        external
        override
        nonReentrant
        whenNotPaused
        returns (uint256 amount)
    {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.shares >= shares, "LiquidityPool: Insufficient shares");

        // Update rewards before stake changes
        _updateRewards(msg.sender);

        // Calculate USDC to return
        amount = calculateUnstakeAmount(shares);

        // Check available capital
        uint256 available = getAvailableCapital();
        require(available >= amount, "LiquidityPool: Insufficient available capital");

        // Update state
        userStake.amount -= amount;
        userStake.shares -= shares;

        totalStaked -= amount;
        totalShares -= shares;

        // Transfer USDC to staker
        USDC.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, shares);

        return amount;
    }

    /**
     * @notice Claim accumulated rewards without unstaking
     * @return amount Amount of USDC rewards claimed
     */
    function claimRewards() external override nonReentrant whenNotPaused returns (uint256 amount) {
        _updateRewards(msg.sender);

        Stake storage userStake = stakes[msg.sender];
        amount = userStake.rewardsEarned;

        require(amount > 0, "LiquidityPool: No rewards");

        // Reset rewards
        userStake.rewardsEarned = 0;
        userStake.lastRewardClaim = block.timestamp;

        totalRewardsPaid += amount;

        // Get USDC from treasury
        USDC.safeTransferFrom(treasury, msg.sender, amount);

        emit RewardsClaimed(msg.sender, amount);

        return amount;
    }

    // ============ Capital Management ============

    /**
     * @notice Lock capital to underwrite a policy
     * @param policyId ID of the policy
     * @param amount Amount of USDC to lock
     * @return success True if successful
     */
    function lockCapital(uint256 policyId, uint256 amount)
        external
        override
        onlyRole(POLICY_MANAGER_ROLE)
        nonReentrant
        returns (bool success)
    {
        require(amount > 0, "LiquidityPool: Zero amount");
        require(policyCapital[policyId] == 0, "LiquidityPool: Capital already locked");

        // Check available capital
        uint256 available = getAvailableCapital();
        require(available >= amount, "LiquidityPool: Insufficient capital");

        // Check utilization rate
        uint256 newUtilization = ((lockedCapital + amount) * 10000) / totalStaked;
        require(newUtilization <= maxUtilizationRate, "LiquidityPool: Utilization too high");

        // Lock capital
        lockedCapital += amount;
        policyCapital[policyId] = amount;

        emit CapitalLocked(policyId, amount);

        return true;
    }

    /**
     * @notice Unlock capital when policy ends
     * @param policyId ID of the policy
     * @param amount Amount of USDC to unlock
     * @param reason Reason for unlocking
     * @return success True if successful
     */
    function unlockCapital(uint256 policyId, uint256 amount, string memory reason)
        external
        override
        onlyRole(POLICY_MANAGER_ROLE)
        nonReentrant
        returns (bool success)
    {
        require(amount > 0, "LiquidityPool: Zero amount");
        require(policyCapital[policyId] >= amount, "LiquidityPool: Amount exceeds locked");

        // Unlock capital
        lockedCapital -= amount;
        policyCapital[policyId] -= amount;

        emit CapitalUnlocked(policyId, amount, reason);

        return true;
    }

    /**
     * @notice Distribute rewards to LPs from premiums
     * @param totalRewards Total USDC rewards to distribute
     */
    function distributeRewards(uint256 totalRewards) external override onlyRole(ADMIN_ROLE) {
        require(totalRewards > 0, "LiquidityPool: Zero rewards");
        require(totalShares > 0, "LiquidityPool: No shares");

        // Update global reward accumulator
        rewardPerShareStored += (totalRewards * 1e18) / totalShares;

        emit RewardsDistributed(totalRewards, block.timestamp);
    }

    // ============ Internal Functions ============

    /**
     * @notice Update rewards for a staker
     * @param staker Address of the staker
     */
    function _updateRewards(address staker) internal {
        Stake storage userStake = stakes[staker];

        if (userStake.shares > 0) {
            uint256 rewardPerShareDelta = rewardPerShareStored - userRewardPerSharePaid[staker];
            uint256 newRewards = (userStake.shares * rewardPerShareDelta) / 1e18;
            userStake.rewardsEarned += newRewards;
        }

        userRewardPerSharePaid[staker] = rewardPerShareStored;
    }

    // ============ View Functions ============

    /**
     * @notice Get stake information for an LP
     * @param staker Address of the LP
     * @return stake Stake struct
     */
    function getStake(address staker) external view override returns (Stake memory stake) {
        return stakes[staker];
    }

    /**
     * @notice Calculate shares to mint for a stake amount
     * @param amount USDC amount to stake
     * @return shares Number of shares to mint
     */
    function calculateShares(uint256 amount) public view override returns (uint256 shares) {
        if (totalShares == 0 || totalStaked == 0) {
            // First staker gets 1:1 ratio
            return amount;
        }

        // Shares proportional to current pool value
        // shares = (amount * totalShares) / totalStaked
        shares = (amount * totalShares) / totalStaked;

        return shares;
    }

    /**
     * @notice Calculate USDC returned for burning shares
     * @param shares Number of shares to burn
     * @return amount USDC amount to return
     */
    function calculateUnstakeAmount(uint256 shares)
        public
        view
        override
        returns (uint256 amount)
    {
        require(totalShares > 0, "LiquidityPool: No shares");

        // amount = (shares * totalStaked) / totalShares
        amount = (shares * totalStaked) / totalShares;

        return amount;
    }

    /**
     * @notice Get pool statistics
     * @return stats PoolStats struct
     */
    function getPoolStats() external view override returns (PoolStats memory stats) {
        return PoolStats({
            totalStaked: totalStaked,
            totalShares: totalShares,
            availableCapital: getAvailableCapital(),
            lockedCapital: lockedCapital,
            totalRewardsPaid: totalRewardsPaid,
            utilizationRate: getUtilizationRate()
        });
    }

    /**
     * @notice Check if pool has sufficient capital
     * @param amount Amount needed
     * @return available True if capital is available
     */
    function hasAvailableCapital(uint256 amount) external view override returns (bool available) {
        return getAvailableCapital() >= amount;
    }

    /**
     * @notice Calculate pending rewards for an LP
     * @param staker Address of the LP
     * @return rewards Pending rewards in USDC
     */
    function calculatePendingRewards(address staker)
        external
        view
        override
        returns (uint256 rewards)
    {
        Stake memory userStake = stakes[staker];

        if (userStake.shares == 0) return userStake.rewardsEarned;

        uint256 rewardPerShareDelta = rewardPerShareStored - userRewardPerSharePaid[staker];
        uint256 newRewards = (userStake.shares * rewardPerShareDelta) / 1e18;

        return userStake.rewardsEarned + newRewards;
    }

    /**
     * @notice Get current utilization rate
     * @return rate Utilization rate in basis points
     */
    function getUtilizationRate() public view override returns (uint256 rate) {
        if (totalStaked == 0) return 0;
        return (lockedCapital * 10000) / totalStaked;
    }

    /**
     * @notice Get available capital for new policies
     * @return available Available USDC amount
     */
    function getAvailableCapital() public view returns (uint256 available) {
        return totalStaked > lockedCapital ? totalStaked - lockedCapital : 0;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update minimum stake amount
     * @param _minStakeAmount New minimum stake
     */
    function updateMinStake(uint256 _minStakeAmount) external onlyRole(ADMIN_ROLE) {
        require(_minStakeAmount > 0, "LiquidityPool: Zero amount");
        minStakeAmount = _minStakeAmount;
        emit MinStakeUpdated(_minStakeAmount);
    }

    /**
     * @notice Update maximum utilization rate
     * @param _maxUtilizationRate New max utilization (bps)
     */
    function updateMaxUtilization(uint256 _maxUtilizationRate) external onlyRole(ADMIN_ROLE) {
        require(_maxUtilizationRate <= 10000, "LiquidityPool: Invalid rate");
        require(_maxUtilizationRate >= 5000, "LiquidityPool: Rate too low");
        maxUtilizationRate = _maxUtilizationRate;
        emit MaxUtilizationUpdated(_maxUtilizationRate);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
