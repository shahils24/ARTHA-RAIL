import Web3 from "web3";

let web3;

export const getWeb3 = async () => {
  if (window.ethereum) {
    try {
      // Request account access if needed
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      web3 = new Web3(window.ethereum);
      return web3;
    } catch (error) {
      console.error("User denied account access or error occurred:", error);
      return null;
    }
  } else {
    alert("MetaMask not detected");
    return null;
  }
};

export default getWeb3;