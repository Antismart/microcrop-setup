// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReceiverTemplate
 * @notice Abstract contract provided by Chainlink CRE for secure report reception
 * @dev This is imported from Chainlink's CRE contracts
 *      For actual deployment, you'll use: import "@chainlink/contracts/src/v0.8/keystone/IReceiverTemplate.sol"
 *      This is a placeholder interface for local development
 */
abstract contract IReceiverTemplate {
    /**
     * @notice Called by KeystoneForwarder to deliver a report
     * @param metadata Encoded workflow metadata (workflow ID, owner, name)
     * @param report ABI-encoded report data
     * @dev This function handles security checks and calls _processReport()
     */
    function onReport(bytes calldata metadata, bytes calldata report) external virtual;

    /**
     * @notice Implement this function with your business logic
     * @param report ABI-encoded report data
     * @dev Called by onReport() after all security checks pass
     */
    function _processReport(bytes calldata report) internal virtual;

    /**
     * @notice Set the expected KeystoneForwarder address
     * @param forwarder The forwarder contract address
     */
    function setForwarderAddress(address forwarder) public virtual;

    /**
     * @notice Set the expected workflow ID
     * @param workflowId The workflow ID to accept reports from
     */
    function setExpectedWorkflowId(bytes32 workflowId) public virtual;

    /**
     * @notice Set the expected workflow owner
     * @param author The workflow owner address
     */
    function setExpectedAuthor(address author) public virtual;

    /**
     * @notice Check if contract implements required interface
     * @param interfaceId The interface ID to check
     * @return supported Whether the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) public pure virtual returns (bool supported);

    /**
     * @notice Get the contract owner
     * @return owner The owner address
     */
    function owner() public view virtual returns (address);

    /**
     * @notice Modifier to restrict functions to owner only
     */
    modifier onlyOwner() virtual;
}
