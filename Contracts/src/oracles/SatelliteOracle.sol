// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IOracle} from "../interfaces/IOracle.sol";
import {DamageLib} from "../libraries/DamageLib.sol";
import {MathLib} from "../libraries/MathLib.sol";

/**
 * @title SatelliteOracle
 * @notice Oracle for satellite NDVI data submission and verification
 * @dev Processes vegetation indices for crop health assessment
 */
contract SatelliteOracle is IOracle, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MathLib for uint256;

    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ============ State Variables ============

    /// @notice USDC token for staking
    IERC20 public immutable USDC;

    /// @notice Minimum stake to become a provider
    uint256 public minStake = 2000 * 1e6; // 2000 USDC (higher than weather)

    /// @notice Verification threshold
    uint256 public verificationThreshold = 1; // Single source sufficient for satellite

    /// @notice Provider registry
    mapping(address => DataProvider) public providers;

    /// @notice Data submissions
    mapping(bytes32 => DataSubmission) public submissions;

    /// @notice Satellite data storage
    mapping(bytes32 => DamageLib.SatelliteData) public satelliteData;

    /// @notice NDVI baseline by plot (plotId => baseline NDVI)
    mapping(uint256 => uint256) public plotBaselines;

    /// @notice NDVI history by plot (plotId => timestamp => NDVI)
    mapping(uint256 => mapping(uint256 => uint256)) public ndviHistory;

    /// @notice Plot to submission IDs
    mapping(uint256 => bytes32[]) public plotSubmissions;

    /// @notice Total providers count
    uint256 public providerCount;

    // ============ Events ============

    event BaselineUpdated(uint256 indexed plotId, uint256 baseline);
    event NDVIRecorded(uint256 indexed plotId, uint256 timestamp, uint256 ndvi);
    event StakeIncreased(address indexed provider, uint256 amount);

    // ============ Constructor ============

    constructor(address _usdc, address _admin) {
        require(_usdc != address(0), "SatelliteOracle: Zero address");
        require(_admin != address(0), "SatelliteOracle: Zero address");

        USDC = IERC20(_usdc);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
    }

    // ============ Provider Management ============

    /**
     * @notice Register as a satellite data provider
     * @param stakeAmount Amount of USDC to stake
     * @return success True if registration successful
     */
    function registerProvider(uint256 stakeAmount)
        external
        override
        nonReentrant
        returns (bool success)
    {
        require(stakeAmount >= minStake, "SatelliteOracle: Stake too low");
        require(!providers[msg.sender].isActive, "SatelliteOracle: Already registered");

        // Transfer stake
        USDC.safeTransferFrom(msg.sender, address(this), stakeAmount);

        // Register provider
        providers[msg.sender] = DataProvider({
            addr: msg.sender,
            isActive: true,
            stake: stakeAmount,
            reputationScore: 5000, // Start at 50%
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
        require(provider.isActive, "SatelliteOracle: Not registered");

        amount = provider.stake;
        provider.isActive = false;
        provider.stake = 0;

        providerCount--;

        USDC.safeTransfer(msg.sender, amount);

        return amount;
    }

    /**
     * @notice Increase stake amount
     * @param additionalStake Amount to add
     */
    function increaseStake(uint256 additionalStake) external override nonReentrant {
        DataProvider storage provider = providers[msg.sender];
        require(provider.isActive, "SatelliteOracle: Not registered");
        require(additionalStake > 0, "SatelliteOracle: Zero amount");

        USDC.safeTransferFrom(msg.sender, address(this), additionalStake);
        provider.stake += additionalStake;

        emit StakeIncreased(msg.sender, additionalStake);
    }

    // ============ Data Submission ============

    /**
     * @notice Submit satellite NDVI data
     * @param data Encoded satellite data
     * @param timestamp When data was captured
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
        require(provider.isActive, "SatelliteOracle: Not active provider");
        require(timestamp <= block.timestamp, "SatelliteOracle: Future timestamp");
        require(timestamp >= block.timestamp - 30 days, "SatelliteOracle: Data too old");

        // Decode satellite data
        (uint256 plotId, DamageLib.SatelliteData memory satellite) = 
            abi.decode(data, (uint256, DamageLib.SatelliteData));

        // Validate satellite data
        (bool valid, string memory reason) = DamageLib.validateSatelliteData(satellite);
        require(valid, reason);

        // Set baseline if not set
        if (plotBaselines[plotId] == 0) {
            plotBaselines[plotId] = satellite.baselineNDVI;
            emit BaselineUpdated(plotId, satellite.baselineNDVI);
        }

        // Generate submission ID
        submissionId = keccak256(abi.encodePacked(msg.sender, timestamp, plotId));

        // Store submission metadata
        submissions[submissionId] = DataSubmission({
            submissionId: submissionId,
            provider: msg.sender,
            timestamp: timestamp,
            submittedAt: block.timestamp,
            status: DataStatus.PENDING,
            verificationCount: 0
        });

        // Store satellite data
        satelliteData[submissionId] = satellite;
        plotSubmissions[plotId].push(submissionId);

        // Record NDVI in history
        ndviHistory[plotId][timestamp] = satellite.avgNDVI;
        emit NDVIRecorded(plotId, timestamp, satellite.avgNDVI);

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
        require(submission.submissionId != bytes32(0), "SatelliteOracle: Submission not found");
        require(submission.status == DataStatus.PENDING, "SatelliteOracle: Invalid status");

        submission.verificationCount++;

        if (submission.verificationCount >= verificationThreshold) {
            submission.status = DataStatus.VERIFIED;

            // Update provider reputation
            DataProvider storage provider = providers[submission.provider];
            provider.verifiedSubmissions++;

            if (provider.reputationScore < 10000) {
                provider.reputationScore += 20; // Larger increase for satellite (harder to get)
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
        require(submission.submissionId != bytes32(0), "SatelliteOracle: Submission not found");

        submission.status = DataStatus.DISPUTED;

        // Decrease provider reputation
        DataProvider storage provider = providers[submission.provider];
        if (provider.reputationScore > 200) {
            provider.reputationScore -= 200; // Larger penalty for satellite disputes
        } else {
            provider.reputationScore = 0;
        }

        emit DataDisputed(submissionId, msg.sender, reason);
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
     * @notice Get satellite data for a submission
     * @param submissionId Submission ID
     * @return data SatelliteData struct
     */
    function getSatelliteData(bytes32 submissionId)
        external
        view
        returns (DamageLib.SatelliteData memory data)
    {
        require(
            submissions[submissionId].status == DataStatus.VERIFIED,
            "SatelliteOracle: Not verified"
        );
        return satelliteData[submissionId];
    }

    /**
     * @notice Get NDVI baseline for a plot
     * @param plotId Plot identifier
     * @return baseline Baseline NDVI (0-10000)
     */
    function getPlotBaseline(uint256 plotId) external view returns (uint256 baseline) {
        return plotBaselines[plotId];
    }

    /**
     * @notice Calculate NDVI trend for a plot over time period
     * @param plotId Plot identifier
     * @param startTime Period start
     * @param endTime Period end
     * @return trend Trend value (-10000 to +10000)
     */
    function calculateNDVITrend(uint256 plotId, uint256 startTime, uint256 endTime)
        external
        view
        returns (int256 trend)
    {
        bytes32[] memory submissionIds = plotSubmissions[plotId];
        
        if (submissionIds.length < 2) return 0;

        // Get verified NDVI values in time range
        uint256[] memory ndviValues = new uint256[](submissionIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < submissionIds.length; i++) {
            DataSubmission memory submission = submissions[submissionIds[i]];
            if (submission.status == DataStatus.VERIFIED &&
                submission.timestamp >= startTime &&
                submission.timestamp <= endTime) {
                ndviValues[count] = satelliteData[submissionIds[i]].avgNDVI;
                count++;
            }
        }

        if (count < 2) return 0;

        // Simple trend: (last - first) / first * 10000
        uint256 firstNDVI = ndviValues[0];
        uint256 lastNDVI = ndviValues[count - 1];

        if (lastNDVI >= firstNDVI) {
            trend = int256(((lastNDVI - firstNDVI) * 10000) / firstNDVI);
        } else {
            trend = -int256(((firstNDVI - lastNDVI) * 10000) / firstNDVI);
        }

        // Cap at ±10000
        if (trend > 10000) trend = 10000;
        if (trend < -10000) trend = -10000;

        return trend;
    }

    /**
     * @notice Get average NDVI for a plot over time period
     * @param plotId Plot identifier
     * @param startTime Period start
     * @param endTime Period end
     * @return avgNDVI Average NDVI value
     * @return minNDVI Minimum NDVI value
     */
    function getPlotNDVI(uint256 plotId, uint256 startTime, uint256 endTime)
        external
        view
        returns (uint256 avgNDVI, uint256 minNDVI)
    {
        bytes32[] memory submissionIds = plotSubmissions[plotId];
        
        uint256[] memory ndviValues = new uint256[](submissionIds.length);
        uint256 count = 0;
        minNDVI = type(uint256).max;

        for (uint256 i = 0; i < submissionIds.length; i++) {
            DataSubmission memory submission = submissions[submissionIds[i]];
            if (submission.status == DataStatus.VERIFIED &&
                submission.timestamp >= startTime &&
                submission.timestamp <= endTime) {
                uint256 ndvi = satelliteData[submissionIds[i]].avgNDVI;
                ndviValues[count] = ndvi;
                count++;
                
                if (ndvi < minNDVI) {
                    minNDVI = ndvi;
                }
            }
        }

        require(count > 0, "SatelliteOracle: No verified data");

        // Calculate average
        avgNDVI = MathLib.average(ndviValues);

        return (avgNDVI, minNDVI);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update plot baseline manually
     * @param plotId Plot identifier
     * @param baseline New baseline NDVI
     */
    function updatePlotBaseline(uint256 plotId, uint256 baseline)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(baseline > 0 && baseline <= 10000, "SatelliteOracle: Invalid baseline");
        plotBaselines[plotId] = baseline;
        emit BaselineUpdated(plotId, baseline);
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
        require(providerData.isActive, "SatelliteOracle: Not active");
        require(amount <= providerData.stake, "SatelliteOracle: Insufficient stake");

        providerData.stake -= amount;

        if (providerData.stake < minStake) {
            providerData.isActive = false;
            providerCount--;
        }

        emit ProviderSlashed(provider, amount, reason);
    }
}
