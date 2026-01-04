import os
import json
import time
from web3 import Web3
from dotenv import load_dotenv, find_dotenv

# Automatically finds and loads your .env file
load_dotenv(find_dotenv())

# 1. Connection Setup
rpc_url = os.getenv("RPC_URL")
if not rpc_url:
    raise ValueError("❌ RPC_URL not found in .env. Please check your file.")

w3 = Web3(Web3.HTTPProvider(rpc_url))

# Load Owner Credentials (Account 1)
owner_key = os.getenv("PRIVATE_KEY")
if not owner_key:
    raise ValueError("❌ PRIVATE_KEY (Owner) not found in .env.")

owner_address = w3.eth.account.from_key(owner_key).address

# 2. Contract & Agent Details
contract_address = os.getenv("CONTRACT_ADDRESS")
agent_address = os.getenv("AGENT_ADDRESS")

if not contract_address or not agent_address:
    raise ValueError("❌ Missing CONTRACT_ADDRESS or AGENT_ADDRESS in .env.")

with open("abi.json", "r") as f:
    contract_abi = json.load(f)

contract = w3.eth.contract(address=contract_address, abi=contract_abi)

def send_tx(func_call, value_wei=0):
    """Helper function to build, sign, and send transactions."""
    nonce = w3.eth.get_transaction_count(owner_address)
    
    # Build
    tx = func_call.build_transaction({
        'from': owner_address,
        'nonce': nonce,
        'value': value_wei,
        'gas': 400000,
        'gasPrice': w3.eth.gas_price,
        'chainId': 11155111 # Sepolia
    })
    
    # Sign
    signed = w3.eth.account.sign_transaction(tx, owner_key)
    
    # Send (Updated to .raw_transaction for v6/v7)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    
    print(f"⏳ Transaction Sent: {tx_hash.hex()}")
    return w3.eth.wait_for_transaction_receipt(tx_hash)

def run_setup():
    print(f"🚀 Starting Governance Setup for: {contract_address}")

    # A. Configure the Agent (Limit: 0.05 ETH, Cooldown: 60s)
    print("\n🤖 Configuring Agent Permissions...")
    daily_limit = w3.to_wei(0.05, 'ether')
    receipt = send_tx(contract.functions.configureAgent(agent_address, "AI-Agent-01", daily_limit, 60))
    print(f"✅ Agent Authorized (Status: {receipt['status']})")

    # B. Whitelist the Merchant
    # For demo, we whitelist the Owner address so money goes back to you
    print("\n🏪 Whitelisting Merchant...")
    receipt = send_tx(contract.functions.addMerchant(owner_address, "Cloud-Provider-Alpha"))
    print(f"✅ Merchant Whitelisted (Status: {receipt['status']})")

    # C. Fund the Contract Vault
    # The contract needs money inside it to execute the AI's purchase
    print("\n💰 Funding Contract Vault with 0.02 ETH...")
    nonce = w3.eth.get_transaction_count(owner_address)
    fund_tx = {
        'to': contract_address,
        'value': w3.to_wei(0.02, 'ether'),
        'gas': 22000,
        'nonce': nonce,
        'gasPrice': w3.eth.gas_price,
        'chainId': 11155111
    }
    signed_fund = w3.eth.account.sign_transaction(fund_tx, owner_key)
    tx_hash = w3.eth.send_raw_transaction(signed_fund.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    print("✅ Vault Funded Successfully.")

    print("\n" + "="*40)
    print("🎉 DEMO SETUP COMPLETE!")
    print(f"Agent {agent_address} is now READY.")
    print("="*40)

if __name__ == "__main__":
    run_setup()