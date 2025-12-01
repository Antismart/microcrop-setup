// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IOracle} from "../interfaces/IOracle.sol";
import {DamageLib} from "../libraries/DamageLib.sol";

/**
 * @title WeatherOracle
 * @notice Oracle for weather data submission and verification
 * @dev Multi-source weather data with reputation-based verification
 */
contract WeatherOracle is IOracle, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ============ State Variables ============

    /// @notice USDC token for staking
    IERC20 public immutable USDC;

    /// @notice Minimum stake to become a provider
    uint256 public minStake = 1000 * 1e6; // 1000 USDC

    /// @notice Verification threshold (number of confirmations needed)
    uint256 public verificationThreshold = 2;

    /// @notice Provider registry
    mapping(address => DataProvider) public providers;

    /// @notice Data submissions
    mapping(bytes32 => DataSubmission) public submissions;

    /// @notice Weather data storage (submissionId => weather data)
    mapping(bytes32 => DamageLib.WeatherData) public weatherData;

    /// @notice Submission IDs by plot and time period
    mapping(uint256 => mapping(uint256 => bytes32[])) public plotSubmissions;

    /// @notice Total providers count
    uint256 public providerCount;

    // ============ Events ============

    event StakeIncreased(address indexed provider, uint256 amount);
    event MinStakeUpdated(uint256 newMinStake);
    event VerificationThresholdUpdated(uint256 newThreshold);

    // ============ Constructor ============

    constructor(address _usdc, address _admin) {
        require(_usdc != address(0), "WeatherOracle: Zero address");
        require(_admin != address(0), "WeatherOracle: Zero address");

        USDC = IERC20(_usdc);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
    }

    // ============ Provider Management ============

    /**
     * @notice Register as a weather data provider
     * @param stakeAmount Amount of USDC to stake
     * @return success True if registration successful
     */
    function registerProvider(uint256 stakeAmount)
        external
        override
        nonReentrant
        returns (bool success)
    {
        require(stakeAmount >= minStake, "WeatherOracle: Stake too low");
        require(!providers[msg.sender].isActive, "WeatherOracle: Already registered");

        // Transfer stake
        USDC.safeTransferFrom(msg.sender, address(this), stakeAmount);

        // Register provider
        providers[msg.sender] = DataProvider({
            addr: msg.sender,
            isActive: true,
            stake: stakeAmount,
            reputationScore: 5000, // Start at 50% (neutral)
            totalSubmissions: 0,
            verifiedSubmissions: 0
        });

        providerCount++;

        emit ProviderRegistered(msg.sender, stakeAmount);

        return true;
    }

    /**
     * @notice Deregister and return stake
     * @return amount Stake returned
     */
    function deregisterProvider() external override nonReentrant returns (uint256 amount) {
        DataProvider storage provider = providers[msg.sender];
        require(provider.isActive, "WeatherOracle: Not registered");

        amount = provider.stake;
        provider.isActive = false;
        provider.stake = 0;

        providerCount--;

        // Return stake
        USDC.safeTransfer(msg.sender, amount);

        return amount;
    }

    /**
     * @notice Increase stake amount
     * @param additionalStake Amount to add
     */
    function increaseStake(uint256 additionalStake) external override nonReentrant {
        DataProvider storage provider = providers[msg.sender];
        require(provider.isActive, "WeatherOracle: Not registered");
        require(additionalStake > 0, "WeatherOracle: Zero amount");

        USDC.safeTransferFrom(msg.sender, address(this), additionalStake);
        provider.stake += additionalStake;

        emit StakeIncreased(msg.sender, additionalStake);
    }

    // ============ Data Submission ============

    /**
     * @notice Submit weather data for a plot
     * @param data Encoded weather data
     * @param timestamp When data was recorded
     * @param signature Provider signature
     * @return submissionId Unique submission identifier
     */
    function submitData(bytes memory data, uint256 timestamp, bytes memory signature)
        external
        override
        nonReentrant
        returns (bytes32 submissionId)
    {
        DataProvider storage provider = providers[msg.sender];
        require(provider.isActive, "WeatherOracle: Not active provider");
        require(timestamp <= block.timestamp, "WeatherOracle: Future timestamp");
        require(timestamp >= block.timestamp - 7 days, "WeatherOracle: Data too old");

        // Decode weather data
        DamageLib.WeatherData memory weather = abi.decode(data, (DamageLib.WeatherData));

        // Validate weather data
        (bool valid, string memory reason) = DamageLib.validateWeatherData(weather);
        require(valid, reason);

        // Generate submission ID
        submissionId = keccak256(abi.encodePacked(msg.sender, timestamp, data));

        // Store submission metadata
        submissions[submissionId] = DataSubmission({
            submissionId: submissionId,
            provider: msg.sender,
            timestamp: timestamp,
            submittedAt: block.timestamp,
            status: DataStatus.PENDING,
            verificationCount: 0
        });

        // Store weather data
        weatherData[submissionId] = weather;

        // Update provider stats
        provider.totalSubmissions++;

        emit DataSubmitted(submissionId, msg.sender, timestamp);

        return submissionId;
    }

    /**
     * @notice Verify a pending data submission
     * @param submissionId ID of submission to verify
     * @return success True if verified
     */
    function verifyData(bytes32 submissionId)
        external
        override
        onlyRole(VERIFIER_ROLE)
        returns (bool success)
    {
        DataSubmission storage submission = submissions[submissionId];
        require(submission.submissionId != bytes32(0), "WeatherOracle: Submission not found");
        require(submission.status == DataStatus.PENDING, "WeatherOracle: Invalid status");

        submission.verificationCount++;

        // Check if threshold reached
        if (submission.verificationCount >= verificationThreshold) {
            submission.status = DataStatus.VERIFIED;

            // Update provider reputation
            DataProvider storage provider = providers[submission.provider];
            provider.verifiedSubmissions++;

            // Increase reputation (max 10000)
            if (provider.reputationScore < 10000) {
                provider.reputationScore += 10; // Small incremental increase
                if (provider.reputationScore > 10000) {
                    provider.reputationScore = 10000;
                }
            }
        }

        emit DataVerified(submissionId, msg.sender);

        return true;
    }

    /**
     * @notice Dispute a data submission
     * @param submissionId ID of submission to dispute
     * @param reason Dispute reason
     */
    function disputeData(bytes32 submissionId, string memory reason)
        external
        override
        onlyRole(VERIFIER_ROLE)
    {
        DataSubmission storage submission = submissions[submissionId];
        require(submission.submissionId != bytes32(0), "WeatherOracle: Submission not found");

        submission.status = DataStatus.DISPUTED;

        // Decrease provider reputation
        DataProvider storage provider = providers[submission.provider];
        if (provider.reputationScore > 100) {
            provider.reputationScore -= 100; // Larger penalty for disputes
        } else {
            provider.reputationScore = 0;
        }

        emit DataDisputed(submissionId, msg.sender, reason);
    }

    /**
     * @notice Slash a provider for bad data
     * @param provider Address of provider to slash
     * @param amount Amount to slash
     * @param reason Slashing reason
     */
    function slashProvider(address provider, uint256 amount, string memory reason)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
    {
        DataProvider storage providerData = providers[provider];
        require(providerData.isActive, "WeatherOracle: Not active");
        require(amount <= providerData.stake, "WeatherOracle: Insufficient stake");

        providerData.stake -= amount;

        // If stake below minimum, deactivate
        if (providerData.stake < minStake) {
            providerData.isActive = false;
            providerCount--;
        }

        emit ProviderSlashed(provider, amount, reason);
    }

    // ============ View Functions ============

    /**
     * @notice Get provider information
     * @param provider Address of provider
     * @return providerInfo DataProvider struct
     */
    function getProvider(address provider)
        external
        view
        override
        returns (DataProvider memory providerInfo)
    {
        return providers[provider];
    }

    /**
     * @notice Get submission metadata
     * @param submissionId Submission ID
     * @return submission DataSubmission struct
     */
    function getSubmission(bytes32 submissionId)
        external
        view
        override
        returns (DataSubmission memory submission)
    {
        return submissions[submissionId];
    }

    /**
     * @notice Check if provider is active
     * @param provider Address to check
     * @return active True if active
     */
    function isActiveProvider(address provider) external view override returns (bool active) {
        return providers[provider].isActive;
    }

    /**
     * @notice Get minimum stake requirement
     * @return minStake Minimum USDC amount
     */
    function getMinimumStake() external view override returns (uint256) {
        return minStake;
    }

    /**
     * @notice Get reputation score
     * @param provider Address of provider
     * @return score Reputation score (0-10000)
     */
    function getReputationScore(address provider) external view override returns (uint256 score) {
        return providers[provider].reputationScore;
    }

    /**
     * @notice Get weather data for a submission
     * @param submissionId Submission ID
     * @return weather WeatherData struct
     */
    function getWeatherData(bytes32 submissionId)
        external
        view
        returns (DamageLib.WeatherData memory weather)
    {
        require(
            submissions[submissionId].status == DataStatus.VERIFIED,
            "WeatherOracle: Not verified"
        );
        return weatherData[submissionId];
    }

    /**
     * @notice Get verified weather data for a time period
     * @param plotId Plot identifier
     * @param startTime Period start
     * @param endTime Period end
     * @return data Array of verified weather data
     */
    function getVerifiedWeatherData(uint256 plotId, uint256 startTime, uint256 endTime)
        external
        view
        returns (DamageLib.WeatherData[] memory data)
    {
        bytes32[] memory submissionIds = plotSubmissions[plotId][startTime];
        uint256 verifiedCount = 0;

        // Count verified submissions
        for (uint256 i = 0; i < submissionIds.length; i++) {
            if (submissions[submissionIds[i]].status == DataStatus.VERIFIED) {
                verifiedCount++;
            }
        }

        // Build array of verified data
        data = new DamageLib.WeatherData[](verifiedCount);
        uint256 index = 0;

        for (uint256 i = 0; i < submissionIds.length; i++) {
            if (submissions[submissionIds[i]].status == DataStatus.VERIFIED) {
                data[index] = weatherData[submissionIds[i]];
                index++;
            }
        }

        return data;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update minimum stake requirement
     * @param newMinStake New minimum stake
     */
    function updateMinStake(uint256 newMinStake) external onlyRole(ADMIN_ROLE) {
        require(newMinStake > 0, "WeatherOracle: Zero stake");
        minStake = newMinStake;
        emit MinStakeUpdated(newMinStake);
    }

    /**
     * @notice Update verification threshold
     * @param newThreshold New threshold
     */
    function updateVerificationThreshold(uint256 newThreshold) external onlyRole(ADMIN_ROLE) {
        require(newThreshold > 0 && newThreshold <= 5, "WeatherOracle: Invalid threshold");
        verificationThreshold = newThreshold;
        emit VerificationThresholdUpdated(newThreshold);
    }
}
