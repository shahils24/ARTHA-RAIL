import React, { useState } from "react";
import LandingPage from "./pages/LandingPage";
import ConnectWallet from "./components/ConnectWallet";
import Dashboard from "./pages/Dashboard";
import { getWeb3 } from "./web3/web3";

function App() {
  const [currentPage, setCurrentPage] = useState("landing");
  const [walletAddress, setWalletAddress] = useState(null);
  const [web3, setWeb3] = useState(null);

  return (
    <>
      {currentPage === "landing" && (
        <LandingPage
          onConnect={() => setCurrentPage("connect")}
        />
      )}

      {currentPage === "connect" && (
        <ConnectWallet
          onBack={() => setCurrentPage("landing")}
          onWalletConnected={async (address) => {
            setWalletAddress(address);

            try {
              const web3Instance = await getWeb3();
              if (web3Instance) {
                setWeb3(web3Instance);
                setCurrentPage("dashboard");
              } else {
                alert("Failed to initialize Web3. Please try again.");
              }
            } catch (error) {
              console.error("Web3 initialization failed:", error);
              alert("Failed to connect to MetaMask. Please try again.");
            }
          }}
        />
      )}

      {currentPage === "dashboard" && (
        <Dashboard walletAddress={walletAddress} web3={web3} />
      )}
    </>
  );
}

export default App;
