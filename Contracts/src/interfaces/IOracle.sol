// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOracle
 * @notice Base interface for oracle contracts (WeatherOracle and SatelliteOracle)
 * @dev Defines common functionality for data submission, verification, and retrieval
 */
interface IOracle {
    // ============ Enums ============

    /**
     * @notice Status of a data submission
     */
    enum DataStatus {
        PENDING,    // Submitted, awaiting verification
        VERIFIED,   // Verified and trusted
        DISPUTED,   // Flagged for review
        REJECTED    // Rejected as invalid
    }

    // ============ Structs ============

    /**
     * @notice Represents a data provider who can submit oracle data
     * @param addr Address of the data provider
     * @param isActive Whether provider is currently authorized
     * @param stake Amount staked by provider (for slashing)
     * @param reputationScore Score based on historical accuracy (0-10000)
     * @param totalSubmissions Total data points submitted
     * @param verifiedSubmissions Number of verified submissions
     */
    struct DataProvider {
        address addr;
        bool isActive;
        uint256 stake;
        uint256 reputationScore;
        uint256 totalSubmissions;
        uint256 verifiedSubmissions;
    }

    /**
     * @notice Metadata for a data submission
     * @param submissionId Unique identifier for submission
     * @param provider Address of data provider
     * @param timestamp When data was recorded (not submitted)
     * @param submittedAt When data was submitted on-chain
     * @param status Current verification status
     * @param verificationCount Number of confirmations received
     */
    struct DataSubmission {
        bytes32 submissionId;
        address provider;
        uint256 timestamp;
        uint256 submittedAt;
        DataStatus status;
        uint256 verificationCount;
    }

    // ============ Events ============

    /**
     * @notice Emitted when new data is submitted
     * @param submissionId Unique identifier for submission
     * @param provider Address of data provider
     * @param timestamp Data timestamp
     */
    event DataSubmitted(bytes32 indexed submissionId, address indexed provider, uint256 timestamp);

    /**
     * @notice Emitted when data is verified
     * @param submissionId Unique identifier for submission
     * @param verifier Address that verified the data
     */
    event DataVerified(bytes32 indexed submissionId, address indexed verifier);

    /**
     * @notice Emitted when data is disputed
     * @param submissionId Unique identifier for submission
     * @param disputer Address that disputed the data
     * @param reason Reason for dispute
     */
    event DataDisputed(bytes32 indexed submissionId, address indexed disputer, string reason);

    /**
     * @notice Emitted when a data provider is registered
     * @param provider Address of the new provider
     * @param stake Amount staked
     */
    event ProviderRegistered(address indexed provider, uint256 stake);

    /**
     * @notice Emitted when a provider is slashed for bad data
     * @param provider Address of the provider
     * @param amount USDC amount slashed
     * @param reason Reason for slashing
     */
    event ProviderSlashed(address indexed provider, uint256 amount, string reason);

    // ============ Provider Management ============

    /**
     * @notice Register as a data provider by staking USDC
     * @param stakeAmount Amount of USDC to stake (must be >= minimum)
     * @return success True if registration successful
     */
    function registerProvider(uint256 stakeAmount) external returns (bool success);

    /**
     * @notice Deactivate provider and return stake (after cooldown period)
     * @return amount Amount of USDC returned
     */
    function deregisterProvider() external returns (uint256 amount);

    /**
     * @notice Increase stake amount for existing provider
     * @param additionalStake Amount of USDC to add to stake
     */
    function increaseStake(uint256 additionalStake) external;

    // ============ Data Submission ============

    /**
     * @notice Submit new oracle data (implementation varies by oracle type)
     * @param data Encoded data payload (format specific to oracle)
     * @param timestamp When the data was recorded
     * @param signature Cryptographic signature from provider
     * @return submissionId Unique identifier for the submission
     */
    function submitData(bytes memory data, uint256 timestamp, bytes memory signature)
        external
        returns (bytes32 submissionId);

    /**
     * @notice Verify a pending data submission (for multi-source verification)
     * @param submissionId ID of submission to verify
     * @return success True if verification recorded
     */
    function verifyData(bytes32 submissionId) external returns (bool success);

    /**
     * @notice Dispute a data submission as inaccurate
     * @param submissionId ID of submission to dispute
     * @param reason Explanation for dispute
     */
    function disputeData(bytes32 submissionId, string memory reason) external;

    // ============ View Functions ============

    /**
     * @notice Get information about a data provider
     * @param provider Address of the provider
     * @return providerInfo DataProvider struct
     */
    function getProvider(address provider) external view returns (DataProvider memory providerInfo);

    /**
     * @notice Get submission metadata
     * @param submissionId ID of the submission
     * @return submission DataSubmission struct
     */
    function getSubmission(bytes32 submissionId)
        external
        view
        returns (DataSubmission memory submission);

    /**
     * @notice Check if a provider is active and authorized
     * @param provider Address to check
     * @return active True if provider is active
     */
    function isActiveProvider(address provider) external view returns (bool active);

    /**
     * @notice Get the minimum stake required to become a provider
     * @return minStake Minimum USDC amount required
     */
    function getMinimumStake() external view returns (uint256 minStake);

    /**
     * @notice Get reputation score for a provider (0-10000)
     * @param provider Address of the provider
     * @return score Reputation score based on accuracy
     */
    function getReputationScore(address provider) external view returns (uint256 score);
}
