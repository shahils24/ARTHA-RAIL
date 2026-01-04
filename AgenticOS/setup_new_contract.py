from web3 import Web3

# ---------------- CONFIGURATION ----------------
# 1. Connect to Sepolia
w3 = Web3(Web3.HTTPProvider("https://sepolia.infura.io/v3/c3d8f24a1c434d7a89fbd26e0e080082"))

# 2. KEYS (Must be the OWNER of the contract)
owner_private_key = "cf1f4a54037ae702f9064422d31ff2ce3308bf18c493abd16b7a41db6e607ef2"
owner_address = w3.eth.account.from_key(owner_private_key).address

# 3. THE NEW CONTRACT ADDRESS (From your error message)
contract_address = "0xA2a438cA74A1F271D2Dc5158b7C6c1177403B43e"

# 4. DATA TO ADD
# 4. DATA TO ADD (Wrapped in Checksum converter)
agent_address = w3.to_checksum_address("0xdfb6fEd8Fc66614D19D21Bd6d720a7f39Ef32501") 
merchant_address = w3.to_checksum_address("0xac9701e15726c9e7517007740ea722b194597e14") # <--- Fixed here!

# -----------------------------------------------

# Minimal ABI to access Admin functions
abi = [
    {"inputs":[{"internalType":"address","name":"_agent","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"uint256","name":"_dailyLimit","type":"uint256"},{"internalType":"uint256","name":"_cooldown","type":"uint256"}],"name":"configureAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_merchant","type":"address"},{"internalType":"string","name":"_label","type":"string"}],"name":"addMerchant","outputs":[],"stateMutability":"nonpayable","type":"function"}
]

contract = w3.eth.contract(address=contract_address, abi=abi)

print(f"🔧 Configuring Contract: {contract_address}")
print(f"👤 Owner: {owner_address}")

# --- FUNCTION 1: Configure Agent ---
print("\n1️⃣  Authorizing Agent...")
nonce = w3.eth.get_transaction_count(owner_address)

tx1 = contract.functions.configureAgent(
    agent_address,
    "AI-Agent",
    w3.to_wei(0.5, 'ether'), # Daily Limit: 0.5 ETH
    60                       # Cooldown: 60 seconds
).build_transaction({
    'from': owner_address,
    'nonce': nonce,
    'gasPrice': w3.eth.gas_price
})

signed_tx1 = w3.eth.account.sign_transaction(tx1, owner_private_key)
tx_hash1 = w3.eth.send_raw_transaction(signed_tx1.raw_transaction)
print(f"   ⏳ Sent! Waiting for confirmation... (Hash: {tx_hash1.hex()})")
w3.eth.wait_for_transaction_receipt(tx_hash1)
print("   ✅ Agent Authorized!")

# --- FUNCTION 2: Whitelist Merchant ---
print("\n2️⃣  Whitelisting Merchant...")
nonce = w3.eth.get_transaction_count(owner_address) # Get new nonce

tx2 = contract.functions.addMerchant(
    merchant_address,
    "Target Merchant"
).build_transaction({
    'from': owner_address,
    'nonce': nonce,
    'gasPrice': w3.eth.gas_price
})

signed_tx2 = w3.eth.account.sign_transaction(tx2, owner_private_key)
tx_hash2 = w3.eth.send_raw_transaction(signed_tx2.raw_transaction)
print(f"   ⏳ Sent! Waiting for confirmation... (Hash: {tx_hash2.hex()})")
w3.eth.wait_for_transaction_receipt(tx_hash2)
print("   ✅ Merchant Whitelisted!")

print("\n🚀 SETUP COMPLETE. You can now run your main payment script.")