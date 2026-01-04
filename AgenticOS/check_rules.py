from web3 import Web3

# ----------------- CONFIGURATION -----------------
# 1. Your RPC URL (Infura/Alchemy/Local)
RPC_URL = "YOUR_INFURA_OR_ALCHEMY_URL_HERE" 

# 2. The NEW Contract Address (The one with 0.012 ETH)
CONTRACT_ADDRESS = "0xA2a438cA...77403B43e" # <--- PASTE THE FULL ADDRESS HERE

# 3. The Addresses involved in the failed transaction
AGENT_ADDRESS = "0xdfb6fEd8Fc66614D19D21Bd6d720a7f39Ef32501"
MERCHANT_ADDRESS = "0xac9701e15726c9e7517007740ea722b194597e14" # From your input data
# -------------------------------------------------

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Minimal ABI to read the rules
abi = [
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"whitelistedMerchants","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_agent","type":"address"}],"name":"getAgentInfo","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"remainingBudget","type":"uint256"},{"internalType":"uint256","name":"nextAllowedTxTime","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"}
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)

print(f"🔍 INSPECTING CONTRACT: {CONTRACT_ADDRESS}")
print("-" * 40)

# CHECK 1: Is Merchant Whitelisted?
is_merchant_ok = contract.functions.whitelistedMerchants(MERCHANT_ADDRESS).call()
print(f"🏢 Merchant ({MERCHANT_ADDRESS[:6]}...): {'✅ ALLOWED' if is_merchant_ok else '❌ BANNED (Not Whitelisted)'}")

# CHECK 2: Is Agent Configured?
try:
    agent_info = contract.functions.getAgentInfo(AGENT_ADDRESS).call()
    name, budget, next_time, is_active = agent_info
    
    print(f"🤖 Agent ({AGENT_ADDRESS[:6]}...):    {'✅ ACTIVE' if is_active else '❌ INACTIVE'}")
    print(f"   - Name: {name}")
    print(f"   - Budget: {w3.from_wei(budget, 'ether')} ETH")
except Exception as e:
    print(f"🤖 Agent ({AGENT_ADDRESS[:6]}...):    ❌ NOT FOUND (Never configured)")

print("-" * 40)