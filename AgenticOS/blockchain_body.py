import os
import json
from web3 import Web3
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class BlockchainBody:
    def __init__(self):
        # 1. Connection Setup
        rpc_url = os.getenv("RPC_URL")
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        # 2. Key/Address Setup
        self.agent_private_key = os.getenv("AGENT_PRIVATE_KEY")
        self.agent_address = os.getenv("AGENT_ADDRESS")
        
        # Pull Merchant from .env (matching your change)
        merchant = os.getenv("MERCHANT_ADDRESS")
        if not merchant:
            raise ValueError("❌ MERCHANT_ADDRESS not found in .env!")
        
        # Ensure address is in Checksum format (prevents ABI errors)
        self.merchant_address = self.w3.to_checksum_address(merchant)

        # 3. Contract Setup
        self.contract_address = os.getenv("CONTRACT_ADDRESS")
        with open("abi.json", "r") as f:
            self.abi = json.load(f)
        
        self.contract = self.w3.eth.contract(address=self.contract_address, abi=self.abi)

    def execute_purchase(self, purpose):
        """Executes the purchase on the blockchain."""
        amount_wei = self.w3.to_wei(0.001, 'ether')

        try:
            # Get nonce for the agent
            nonce = self.w3.eth.get_transaction_count(self.agent_address)
            
            # Build transaction
            tx_build = self.contract.functions.executePurchase(
                self.merchant_address,
                amount_wei,
                purpose
            ).build_transaction({
                'from': self.agent_address,
                'nonce': nonce,
                'gas': 500000, 
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 11155111 # Sepolia
            })

            # Sign the transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx_build, self.agent_private_key)
            
            # Changed .rawTransaction -> .raw_transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            print(f"⏳ Transaction Sent! Hash: {tx_hash.hex()}")
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # 🚀 THE UPDATE: Access transaction hash via dict key or correct attribute name
            return receipt['transactionHash'].hex()

        except Exception as e:
            print(f"❌ Blockchain Body Error: {e}")
            return None