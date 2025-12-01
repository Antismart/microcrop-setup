// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MathLib} from "../libraries/MathLib.sol";

/**
 * @title Treasury
 * @notice Manages platform treasury, reserves, and USDC flows
 * @dev Central vault for premium collection, payout distribution, and reserve management
 */
contract Treasury is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using MathLib for uint256;

    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LIQUIDITY_POOL_ROLE = keccak256("LIQUIDITY_POOL_ROLE");
    bytes32 public constant POLICY_MANAGER_ROLE = keccak256("POLICY_MANAGER_ROLE");
    bytes32 public constant PAYOUT_ENGINE_ROLE = keccak256("PAYOUT_ENGINE_ROLE");

    // ============ State Variables ============

    /// @notice USDC token contract (6 decimals)
    IERC20 public immutable USDC;

    /// @notice Total premiums collected (all-time)
    uint256 public totalPremiumsCollected;

    /// @notice Total payouts distributed (all-time)
    uint256 public totalPayoutsDistributed;

    /// @notice Platform fee collected
    uint256 public platformFeesCollected;

    /// @notice Current reserve balance (for extreme scenarios)
    uint256 public reserveBalance;

    /// @notice Minimum reserve ratio (basis points)
    uint256 public minReserveRatio; // Default: 2000 (20%)

    /// @notice Target reserve ratio (basis points)
    uint256 public targetReserveRatio; // Default: 3000 (30%)

    /// @notice Platform fee percentage (basis points)
    uint256 public platformFeeRate; // Default: 1000 (10%)

    /// @notice Reserve rebalancing threshold (basis points)
    uint256 public rebalanceThreshold; // Default: 500 (5%)

    // ============ Events ============

    event PremiumReceived(uint256 indexed policyId, address indexed from, uint256 amount);
    event PayoutSent(uint256 indexed payoutId, address indexed to, uint256 amount);
    event PlatformFeeCollected(uint256 amount);
    event ReserveFunded(uint256 amount);
    event ReserveWithdrawn(uint256 amount, address indexed to);
    event ReserveRebalanced(uint256 newBalance, uint256 ratio);
    event ParametersUpdated(
        uint256 minReserveRatio, uint256 targetReserveRatio, uint256 platformFeeRate
    );

    // ============ Errors ============

    error InsufficientBalance();
    error InsufficientReserves();
    error InvalidParameters();
    error InvalidAmount();
    error RebalanceNotNeeded();

    // ============ Constructor ============

    constructor(address _usdc, address _admin) {
        require(_usdc != address(0), "Treasury: Zero address");
        require(_admin != address(0), "Treasury: Zero address");

        USDC = IERC20(_usdc);

        // Set default parameters
        minReserveRatio = 2000; // 20%
        targetReserveRatio = 3000; // 30%
        platformFeeRate = 1000; // 10%
        rebalanceThreshold = 500; // 5%

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ============ Premium Functions ============

    /**
     * @notice Receive premium payment from farmer
     * @param policyId ID of the policy
     * @param from Address sending the premium
     * @param amount Premium amount in USDC
     */
    function receivePremium(uint256 policyId, address from, uint256 amount)
        external
        onlyRole(POLICY_MANAGER_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(amount > 0, "Treasury: Zero amount");

        // Transfer USDC from farmer to treasury
        USDC.safeTransferFrom(from, address(this), amount);

        // Calculate platform fee
        uint256 platformFee = amount.percentageOf(platformFeeRate);
        uint256 netPremium = amount - platformFee;

        // Update accounting
        totalPremiumsCollected += amount;
        platformFeesCollected += platformFee;

        emit PremiumReceived(policyId, from, amount);
        emit PlatformFeeCollected(platformFee);

        // Check if reserve rebalancing is needed
        if (_shouldRebalance()) {
            _rebalanceReserves();
        }
    }

    /**
     * @notice Allocate premium to liquidity pool
     * @param amount Amount to allocate
     */
    function allocatePremiumToPool(uint256 amount)
        external
        onlyRole(LIQUIDITY_POOL_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(amount > 0, "Treasury: Zero amount");

        uint256 availableBalance = getAvailableBalance();
        require(availableBalance >= amount, "Treasury: Insufficient balance");

        // Transfer USDC to liquidity pool
        USDC.safeTransfer(msg.sender, amount);
    }

    // ============ Payout Functions ============

    /**
     * @notice Execute payout to farmer
     * @param payoutId ID of the payout
     * @param to Recipient address
     * @param amount Payout amount in USDC
     */
    function executePayout(uint256 payoutId, address to, uint256 amount)
        external
        onlyRole(PAYOUT_ENGINE_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(amount > 0, "Treasury: Zero amount");
        require(to != address(0), "Treasury: Zero address");

        uint256 availableBalance = getAvailableBalance();
        uint256 totalBalance = getTotalBalance();

        // Check if we have enough available balance
        if (availableBalance < amount) {
            // Try to use reserves if within limits
            uint256 projectedReserveRatio = ((totalBalance - amount) * 10000) / totalBalance;

            if (projectedReserveRatio < minReserveRatio) {
                revert InsufficientReserves();
            }
        }

        // Transfer payout
        USDC.safeTransfer(to, amount);

        // Update accounting
        totalPayoutsDistributed += amount;

        emit PayoutSent(payoutId, to, amount);

        // Check if reserve rebalancing is needed
        if (_shouldRebalance()) {
            _rebalanceReserves();
        }
    }

    /**
     * @notice Execute batch payouts
     * @param payoutIds Array of payout IDs
     * @param recipients Array of recipient addresses
     * @param amounts Array of payout amounts
     */
    function executeBatchPayouts(
        uint256[] calldata payoutIds,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(PAYOUT_ENGINE_ROLE) nonReentrant whenNotPaused {
        require(
            payoutIds.length == recipients.length && recipients.length == amounts.length,
            "Treasury: Length mismatch"
        );

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        uint256 availableBalance = getAvailableBalance();
        require(availableBalance >= totalAmount, "Treasury: Insufficient balance");

        // Execute each payout
        for (uint256 i = 0; i < payoutIds.length; i++) {
            require(recipients[i] != address(0), "Treasury: Zero address");
            require(amounts[i] > 0, "Treasury: Zero amount");

            USDC.safeTransfer(recipients[i], amounts[i]);
            totalPayoutsDistributed += amounts[i];

            emit PayoutSent(payoutIds[i], recipients[i], amounts[i]);
        }
    }

    // ============ Reserve Management ============

    /**
     * @notice Fund reserves (admin deposits USDC)
     * @param amount Amount to add to reserves
     */
    function fundReserves(uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(amount > 0, "Treasury: Zero amount");

        USDC.safeTransferFrom(msg.sender, address(this), amount);
        reserveBalance += amount;

        emit ReserveFunded(amount);
    }

    /**
     * @notice Withdraw from reserves (emergency only)
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function withdrawReserves(uint256 amount, address to)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
    {
        require(amount > 0, "Treasury: Zero amount");
        require(to != address(0), "Treasury: Zero address");
        require(reserveBalance >= amount, "Treasury: Insufficient reserves");

        // Check if withdrawal would violate minimum reserve ratio
        uint256 totalBalance = getTotalBalance();
        uint256 projectedReserveRatio = ((totalBalance - amount) * 10000) / totalBalance;

        require(projectedReserveRatio >= minReserveRatio, "Treasury: Reserve ratio too low");

        reserveBalance -= amount;
        USDC.safeTransfer(to, amount);

        emit ReserveWithdrawn(amount, to);
    }

    /**
     * @notice Rebalance reserves to target ratio
     */
    function rebalanceReserves() external onlyRole(ADMIN_ROLE) nonReentrant {
        require(_shouldRebalance(), "Treasury: Rebalance not needed");
        _rebalanceReserves();
    }

    /**
     * @notice Internal function to rebalance reserves
     */
    function _rebalanceReserves() internal {
        uint256 totalBalance = getTotalBalance();
        uint256 targetReserve = totalBalance.percentageOf(targetReserveRatio);

        if (reserveBalance < targetReserve) {
            // Need to add to reserves
            uint256 deficit = targetReserve - reserveBalance;
            uint256 availableBalance = getAvailableBalance();

            // Only rebalance if we have available funds
            if (availableBalance >= deficit) {
                reserveBalance += deficit;
                emit ReserveRebalanced(reserveBalance, getCurrentReserveRatio());
            }
        } else if (reserveBalance > targetReserve) {
            // Can reduce reserves (make capital available for pools)
            uint256 excess = reserveBalance - targetReserve;
            reserveBalance -= excess;
            emit ReserveRebalanced(reserveBalance, getCurrentReserveRatio());
        }
    }

    /**
     * @notice Check if reserves should be rebalanced
     */
    function _shouldRebalance() internal view returns (bool) {
        uint256 currentRatio = getCurrentReserveRatio();

        // Rebalance if off target by more than threshold
        if (currentRatio < targetReserveRatio) {
            uint256 deficit = targetReserveRatio - currentRatio;
            return deficit >= rebalanceThreshold;
        } else if (currentRatio > targetReserveRatio) {
            uint256 excess = currentRatio - targetReserveRatio;
            return excess >= rebalanceThreshold;
        }

        return false;
    }

    // ============ View Functions ============

    /**
     * @notice Get total USDC balance in treasury
     */
    function getTotalBalance() public view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Get available balance (total - reserves)
     */
    function getAvailableBalance() public view returns (uint256) {
        uint256 total = getTotalBalance();
        return total > reserveBalance ? total - reserveBalance : 0;
    }

    /**
     * @notice Get current reserve ratio (basis points)
     */
    function getCurrentReserveRatio() public view returns (uint256) {
        uint256 total = getTotalBalance();
        if (total == 0) return 0;
        return (reserveBalance * 10000) / total;
    }

    /**
     * @notice Get loss ratio (payouts / premiums in basis points)
     */
    function getLossRatio() external view returns (uint256) {
        if (totalPremiumsCollected == 0) return 0;
        return (totalPayoutsDistributed * 10000) / totalPremiumsCollected;
    }

    /**
     * @notice Get treasury statistics
     */
    function getTreasuryStats()
        external
        view
        returns (
            uint256 totalBalance,
            uint256 available,
            uint256 reserves,
            uint256 premiums,
            uint256 payouts,
            uint256 fees
        )
    {
        return (
            getTotalBalance(),
            getAvailableBalance(),
            reserveBalance,
            totalPremiumsCollected,
            totalPayoutsDistributed,
            platformFeesCollected
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Update treasury parameters
     * @param _minReserveRatio Minimum reserve ratio (bps)
     * @param _targetReserveRatio Target reserve ratio (bps)
     * @param _platformFeeRate Platform fee rate (bps)
     */
    function updateParameters(
        uint256 _minReserveRatio,
        uint256 _targetReserveRatio,
        uint256 _platformFeeRate
    ) external onlyRole(ADMIN_ROLE) {
        require(_minReserveRatio <= _targetReserveRatio, "Treasury: Invalid reserve ratios");
        require(_targetReserveRatio <= 5000, "Treasury: Target reserve too high");
        require(_platformFeeRate <= 2000, "Treasury: Platform fee too high");

        minReserveRatio = _minReserveRatio;
        targetReserveRatio = _targetReserveRatio;
        platformFeeRate = _platformFeeRate;

        emit ParametersUpdated(_minReserveRatio, _targetReserveRatio, _platformFeeRate);
    }

    /**
     * @notice Withdraw platform fees
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function withdrawPlatformFees(uint256 amount, address to)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
    {
        require(amount > 0, "Treasury: Zero amount");
        require(to != address(0), "Treasury: Zero address");
        require(platformFeesCollected >= amount, "Treasury: Insufficient fees");

        platformFeesCollected -= amount;
        USDC.safeTransfer(to, amount);
    }

    /**
     * @notice Pause contract (emergency)
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

    /**
     * @notice Emergency withdrawal (only if contract is paused)
     * @param token Token address to withdraw
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, address to, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
        whenPaused
    {
        require(to != address(0), "Treasury: Zero address");
        IERC20(token).safeTransfer(to, amount);
    }

    // ============ CRE Integration Functions ============

    /// @notice PayoutReceiver contract address (CRE oracle)
    address public payoutReceiverAddress;

    /// @notice Event emitted when PayoutReceiver address is updated
    event PayoutReceiverUpdated(address indexed newReceiver);

    /// @notice Event emitted when oracle payout is processed
    event OraclePayoutProcessed(uint256 indexed policyId, address indexed farmer, uint256 amount);

    /**
     * @notice Set the PayoutReceiver contract address
     * @param _payoutReceiver Address of the PayoutReceiver contract
     * @dev Only admin can set this. Must be set before CRE workflow can trigger payouts
     */
    function setPayoutReceiver(address _payoutReceiver) external onlyRole(ADMIN_ROLE) {
        require(_payoutReceiver != address(0), "Invalid address");
        payoutReceiverAddress = _payoutReceiver;
        emit PayoutReceiverUpdated(_payoutReceiver);
    }

    /**
     * @notice Process payout request from CRE oracle (via PayoutReceiver)
     * @param policyId The policy ID
     * @param farmer The farmer receiving the payout
     * @param amount The payout amount in USDC (6 decimals)
     * @dev Called by PayoutReceiver contract after validating signed CRE report
     * @dev Automatically transfers USDC to farmer without requiring manual approval
     */
    function requestPayoutFromOracle(
        uint256 policyId,
        address farmer,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(msg.sender == payoutReceiverAddress, "Only PayoutReceiver can call");
        require(farmer != address(0), "Invalid farmer address");
        require(amount > 0, "Amount must be positive");
        
        uint256 currentBalance = USDC.balanceOf(address(this));
        require(currentBalance >= amount, "Insufficient treasury balance");
        
        // Transfer USDC to farmer
        USDC.safeTransfer(farmer, amount);
        
        // Update total payouts
        totalPayoutsDistributed += amount;
        
        emit OraclePayoutProcessed(policyId, farmer, amount);
    }
}
