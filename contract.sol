// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgenticCommerceOS_Master
 * @notice Final professional-grade restricted payment rail for AI Agents.
 */
contract AgenticCommerceOS_Master {
    error NotOwner();
    error SystemPaused();
    error AgentDisabled();
    error MerchantNotWhitelisted();
    error InsufficientContractBalance(uint256 available, uint256 required);
    error CooldownActive(uint256 nextAllowedTimestamp);
    error DailyBudgetExceeded(uint256 remainingBudget);
    error TransferFailed();

    address public immutable owner;
    bool public isPaused;

    struct AgentPolicy {
        string agentName;
        uint256 dailyLimit;
        uint256 totalSpentToday;
        uint256 lastResetTime;
        uint256 cooldownPeriod;
        uint256 lastTxTimestamp;
        bool isActive;
    }

    mapping(address => AgentPolicy) public agents;
    mapping(address => bool) public whitelistedMerchants;

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // Events for Auditability & Website Frontend
    event AgentConfigured(address indexed agent, string name, uint256 limit);
    event MerchantAuthorized(address indexed merchant, string label);
    event PurchaseReceipt(address indexed agent, address indexed merchant, uint256 amount, string purpose);
    event SystemStatus(string message, bool paused);

    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert("ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // --- Governance Actions (Human Owner) ---

    function configureAgent(address _agent, string calldata _name, uint256 _dailyLimit, uint256 _cooldown) external onlyOwner {
        agents[_agent] = AgentPolicy({
            agentName: _name,
            dailyLimit: _dailyLimit,
            totalSpentToday: 0,
            lastResetTime: block.timestamp,
            cooldownPeriod: _cooldown,
            lastTxTimestamp: 0,
            isActive: true
        });
        emit AgentConfigured(_agent, _name, _dailyLimit);
    }

    function addMerchant(address _merchant, string calldata _label) external onlyOwner {
        whitelistedMerchants[_merchant] = true;
        emit MerchantAuthorized(_merchant, _label);
    }

    function togglePause() external onlyOwner {
        isPaused = !isPaused;
        string memory statusMsg = isPaused ? "System Paused" : "System Active";
        emit SystemStatus(statusMsg, isPaused);
    }

    // --- AI Agent Actions ---

    function executePurchase(address payable _merchant, uint256 _amount, string calldata _purpose) external nonReentrant {
        if (isPaused) revert SystemPaused();
        AgentPolicy storage policy = agents[msg.sender];

        if (!policy.isActive) revert AgentDisabled();
        if (!whitelistedMerchants[_merchant]) revert MerchantNotWhitelisted();
        if (address(this).balance < _amount) revert InsufficientContractBalance(address(this).balance, _amount);
        if (block.timestamp < policy.lastTxTimestamp + policy.cooldownPeriod) revert CooldownActive(policy.lastTxTimestamp + policy.cooldownPeriod);

        // Reset budget every 24 hours
        if (block.timestamp >= policy.lastResetTime + 1 days) {
            policy.totalSpentToday = 0;
            policy.lastResetTime = block.timestamp;
        }
        
        if (policy.totalSpentToday + _amount > policy.dailyLimit) revert DailyBudgetExceeded(policy.dailyLimit - policy.totalSpentToday);

        policy.totalSpentToday += _amount;
        policy.lastTxTimestamp = block.timestamp;

        (bool success, ) = _merchant.call{value: _amount}("");
        if (!success) revert TransferFailed();

        emit PurchaseReceipt(msg.sender, _merchant, _amount, _purpose);
    }

    function getAgentInfo(address _agent) external view returns (string memory name, uint256 remainingBudget, uint256 nextAllowedTxTime, bool active) {
        AgentPolicy memory p = agents[_agent];
        uint256 budgetUsed = (block.timestamp >= p.lastResetTime + 1 days) ? 0 : p.totalSpentToday;
        return (p.agentName, p.dailyLimit - budgetUsed, p.lastTxTimestamp + p.cooldownPeriod, p.isActive);
    }

    receive() external payable {}
}
