import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { ethers } from "ethers";
import {
  Plus,
  ShieldCheck,
  Cpu,
  Zap,
  Wallet,
  Menu,
  X,
  PauseCircle,
  Trash2,
  PlayCircle,
  ExternalLink
} from "lucide-react";
import AgentABI from "../contracts/AgentABI.json";

/* ---------------- CONFIG ---------------- */
// Make sure this is your NEW contract address
const CONTRACT_ADDRESS = "0xA2a438cA74A1F271D2Dc5158b7C6c1177403B43e"; 
const AGENT_ADDRESS = "0xdfb6fEd8Fc66614D19D21Bd6d720a7f39Ef32501";
const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io/tx/";

/* ---------------- COMPONENT ---------------- */
const AgenticDashboard = ({ walletAddress, web3 }) => {
  /* ---------------- USER ---------------- */
  const user = {
    name: "Wallet",
    wallet: walletAddress,
  };

  /* ---------------- CONTRACT ---------------- */
  const contract = useMemo(
    () => new web3.eth.Contract(AgentABI, CONTRACT_ADDRESS),
    [web3]
  );

  /* ---------------- STATE ---------------- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [remainingBudget, setRemainingBudget] = useState("0");
  const [cooldownActive, setCooldownActive] = useState(false);
  const [paused, setPaused] = useState(false);
  // Removed unused 'transactions' state to clean up console warnings
  const [fundAmount, setFundAmount] = useState("");
  const [systemLoad, setSystemLoad] = useState(0);
  const [userBalance, setUserBalance] = useState("0");
  const [vaultBalance, setVaultBalance] = useState("0");
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [targetTimestamp, setTargetTimestamp] = useState(0);
  const [newLimit, setNewLimit] = useState("");
  const [recentTx, setRecentTx] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Use refs instead of state to prevent infinite loop from loading flags
  const isLoadingStateRef = useRef(false);
  const isLoadingTransactionsRef = useRef(false);

  const [merchants, setMerchants] = useState([
    { id: 1, name: "AWS", wallet: "0xAWS", limit: 200 },
    { id: 2, name: "Uber", wallet: "0xUBER", limit: 50 },
  ]);

  /* -------- MODALS -------- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);

  const [newMerchant, setNewMerchant] = useState({
    name: "",
    wallet: "",
    limit: "",
  });

  const blurBg = showAddModal || showRemoveModal || drawerOpen;

  /* ---------------- POLL SYSTEM STATUS ---------------- */
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5001/status");
        const data = await response.json();
        setSystemLoad(data.load || 0);
      } catch (error) {
        console.log("Failed to fetch system status:", error);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- LOAD AGENT STATE ---------------- */
  const loadAgentState = useCallback(async () => {
    if (isLoadingStateRef.current || !contract) return;
    isLoadingStateRef.current = true;

    try {
      const info = await contract.methods
        .getAgentInfo(AGENT_ADDRESS)
        .call();

      const isPaused = await contract.methods.isPaused().call();
      const now = Math.floor(Date.now() / 1000);

      setRemainingBudget(info.remainingBudget);
      setTargetTimestamp(Number(info.nextAllowedTxTime));
      setCooldownActive(info.nextAllowedTxTime > now);
      setPaused(isPaused);

      const balance = await web3.eth.getBalance(walletAddress);
      setUserBalance(web3.utils.fromWei(balance, "ether"));

      const contractBalance = await web3.eth.getBalance(CONTRACT_ADDRESS);
      setVaultBalance(web3.utils.fromWei(contractBalance, "ether"));

      console.log("✅ Agent state loaded successfully");
    } catch (error) {
      console.error("❌ Error loading agent state:", error.message || error);
    } finally {
      isLoadingStateRef.current = false;
    }
  }, [contract, walletAddress, web3]);

  useEffect(() => {
    if (contract && walletAddress) {
      loadAgentState();
    }
  }, [contract, walletAddress, loadAgentState]);

  /* ---------------- COOLDOWN TIMER TICK ---------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = targetTimestamp - now;

      if (secondsRemaining > 0) {
        setCooldownTimer(secondsRemaining);
        setCooldownActive(true);
      } else {
        setCooldownTimer(0);
        setCooldownActive(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  /* ---------------- FETCH TRANSACTIONS ---------------- */
  const fetchTransactions = useCallback(async () => {
    if (isLoadingTransactionsRef.current || !contract) return;
    isLoadingTransactionsRef.current = true;

    try {
      console.log("🔍 Fetching history...");
      
      // 1. Fetch AgentConfigured events
      const configuredEvents = await contract.getPastEvents('AgentConfigured', {
        fromBlock: 0,
        toBlock: 'latest'
      });

      // 2. Fetch AgentRun events (Using 'allEvents' ensures we catch it even if name varies slightly, but here we specify AgentRun)
      let agentRunEvents = [];
      try {
        agentRunEvents = await contract.getPastEvents('AgentRun', {
          fromBlock: 0,
          toBlock: 'latest'
        });
      } catch (err) {
        console.warn("⚠️ Could not fetch AgentRun events:", err.message);
      }

      // 3. Combine
      const allEvents = [...configuredEvents, ...agentRunEvents];

      // 4. Filter for THIS agent
      const myEvents = allEvents.filter(e => 
        e.returnValues.agent && e.returnValues.agent.toLowerCase() === AGENT_ADDRESS.toLowerCase()
      );

      // 5. Format & Sort
      const formattedTx = myEvents.map(event => {
        let displayLabel = event.event;
        if (event.event === 'AgentRun') {
          displayLabel = '💰 Payment Executed';
        } else if (event.event === 'AgentConfigured') {
          displayLabel = '⚙️ Configuration Updated';
        }

        return {
          hash: event.transactionHash,
          eventName: displayLabel,
          eventType: event.event,
          blockNumber: event.blockNumber,
          args: event.returnValues,
          rawEvent: event
        };
      });

      formattedTx.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      setRecentTx(formattedTx);
      
    } catch (error) {
      console.error("❌ Error fetching history:", error.message || error);
    } finally {
      isLoadingTransactionsRef.current = false;
    }
  }, [contract]);

  /* ---------------- POLL SYSTEM STATE ---------------- */
  useEffect(() => {
    if (contract && walletAddress) {
      fetchTransactions();
      loadAgentState();

      const interval = setInterval(() => {
        fetchTransactions();
        loadAgentState();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [AGENT_ADDRESS, fetchTransactions, loadAgentState, contract, walletAddress]); 

  /* ---------------- ACTIONS ---------------- */
  const setMaxAmount = () => {
    const max = Math.max(0, parseFloat(userBalance) - 0.001);
    setFundAmount(max.toFixed(4));
  };

  const fundAgent = async () => {
    if (!fundAmount) return alert("Enter amount");

    try {
      await web3.eth.sendTransaction({
        from: walletAddress,
        to: CONTRACT_ADDRESS,
        value: web3.utils.toWei(fundAmount, "ether"),
        gas: 300000,
      });

      setFundAmount("");
      alert("Success!");
    } catch (error) {
      alert(error.message);
    }
  };

  const togglePause = async () => {
    await contract.methods.togglePause().send({ from: walletAddress });
    setPaused(!paused);
  };

  const setDailyLimit = async () => {
    if (!newLimit) return alert("Enter amount");

    try {
      await contract.methods
        .configureAgent(AGENT_ADDRESS, "AI-Agent", web3.utils.toWei(newLimit, "ether"), 60)
        .send({ from: walletAddress });
      
      setNewLimit("");
      alert("Limit Updated!");
    } catch (error) {
      alert(error.message);
    }
  };

  const addMerchant = async () => {
    if (!newMerchant.name || !newMerchant.wallet || !newMerchant.limit) {
      return alert("Fill all fields");
    }

    try {
      alert("Transaction Pending...");
      await contract.methods
        .addMerchant(newMerchant.wallet, newMerchant.name)
        .send({ from: walletAddress });

      setMerchants((prev) => [
        ...prev,
        { id: Date.now(), ...newMerchant },
      ]);
      setNewMerchant({ name: "", wallet: "", limit: "" });
      setShowAddModal(false);
      alert("Success!");
    } catch (error) {
      alert(error?.message || "Transaction failed");
    }
  };

  const removeMerchant = () => {
    setMerchants((prev) =>
      prev.filter((m) => m.id !== selectedMerchant.id)
    );
    setShowRemoveModal(false);
  };

  // ✅ FIXED: Robust Disconnect Function
  const disconnectWallet = () => {
    console.log("🔌 Disconnecting wallet...");
    // 1. Close drawer first
    setDrawerOpen(false);
    
    // 2. Clear ALL storage keys that might keep the session alive
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("user");
    localStorage.clear();

    // 3. Force a hard redirect to the home page
    window.location.href = "/";
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 p-6">
      <div className={`${blurBg ? "blur-sm" : ""} max-w-7xl mx-auto`}>
        {/* HEADER */}
        <header className="flex justify-between mb-10">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <Cpu />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase">
                Artha <span className="text-indigo-500">Rail</span>
              </h1>
              <p className="text-xs text-slate-500">
                The Autonomous Governance Layer for AI Commerce
              </p>
            </div>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 bg-[#161B22] px-4 py-2 rounded-xl hover:bg-[#1f2630] transition"
          >
            <Wallet size={16} />
            <span className="font-mono text-sm">
              {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
            </span>
            <Menu size={16} />
          </button>
        </header>

        {/* METRICS */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <GlassCard
            title="Vault Balance"
            value={`${parseFloat(vaultBalance).toFixed(4)} ETH`}
            icon={<Wallet />}
          />
          <GlassCard
            title="Remaining Budget"
            value={`${Number(remainingBudget) / 1e18} ETH`}
            icon={<Wallet />}
          />
          <GlassCard
            title="Cooldown Status"
            value={cooldownActive ? `${cooldownTimer}s WAIT` : "READY"}
            icon={<ShieldCheck />}
            className={cooldownActive ? "border border-orange-500 text-orange-400" : ""}
          />
          <GlassCard
            title="System Status"
            value={paused ? "PAUSED" : `ACTIVE - ${systemLoad}%`}
            icon={<Zap />}
            className={systemLoad > 90 ? "border border-rose-500 text-rose-400" : ""}
          />
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-[#10141B] p-6 rounded-2xl">
            <h3 className="font-bold mb-4">Fund Agent</h3>
            <p className="text-sm text-slate-400 mb-3">
              Your Balance: <span className="text-indigo-300 font-mono">{parseFloat(userBalance).toFixed(4)} ETH</span>
            </p>
            <div className="flex gap-3">
              <input
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="ETH"
                className="w-full bg-black/40 border rounded px-3 py-2"
              />
              <button onClick={setMaxAmount} className="bg-slate-700 px-4 rounded hover:bg-slate-600">
                Max
              </button>
              <button onClick={fundAgent} className="bg-indigo-600 px-4 rounded hover:bg-indigo-700">
                Fund
              </button>
            </div>
          </div>

          <div className="bg-[#10141B] p-6 rounded-2xl">
            <h3 className="font-bold mb-4">Emergency Control</h3>
            <button
              onClick={togglePause}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded transition ${
                paused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {paused ? <PlayCircle /> : <PauseCircle />}
              {paused ? "Resume Agent" : "Pause Agent"}
            </button>
          </div>

          <div className="bg-[#10141B] p-6 rounded-2xl">
            <h3 className="font-bold mb-4">Update Daily Limit</h3>
            <div className="flex gap-3">
              <input
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="ETH"
                className="w-full bg-black/40 border rounded px-3 py-2"
              />
              <button onClick={setDailyLimit} className="bg-indigo-600 px-4 rounded hover:bg-indigo-700">
                Set Limit
              </button>
            </div>
          </div>
        </div>

        {/* TRANSACTION HISTORY */}
        <div className="bg-[#10141B] p-8 rounded-2xl mb-10">
          <h2 className="font-bold mb-4">Transaction History</h2>
          
          {recentTx.length === 0 && (
            <p className="text-slate-500 text-sm">No events found.</p>
          )}

          {(showAllHistory ? recentTx : recentTx.slice(0, 3)).map((tx, i) => {
            const formatValue = (value) => {
              if (typeof value === 'bigint' || (typeof value === 'object' && value?._isBigNumber)) {
                try {
                  return ethers.formatEther(value.toString()) + ' ETH';
                } catch {
                  return value.toString();
                }
              }
              if (typeof value === 'object') return JSON.stringify(value);
              return String(value);
            };

            const isPayment = tx.eventName === "💰 Payment Executed" || tx.eventType === "AgentRun";

            return (
              <div key={tx.hash + i} className="mb-4 p-4 bg-black/30 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {isPayment ? (
                        <span className="text-green-400 font-bold flex items-center gap-1">
                            💰 Payment Successful
                        </span>
                    ) : (
                        <span className="text-indigo-400 font-bold flex items-center gap-1">
                            ⚙️ Agent Setup
                        </span>
                    )}
                    <span className="text-[10px] bg-green-900/50 text-green-300 px-2 py-0.5 rounded border border-green-800">
                        ✅ Success
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">Block #{tx.blockNumber}</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-slate-500">Tx Hash:</span>
                  <a 
                    href={`${SEPOLIA_EXPLORER}${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-mono flex items-center gap-1"
                  >
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                    <ExternalLink size={10} />
                  </a>
                </div>

                <div className="space-y-1 bg-black/20 p-2 rounded">
                  {Object.keys(tx.args).map((key) => {
                    if (!isNaN(key) || key === '__length__') return null;
                    return (
                      <div key={key} className="flex justify-between text-sm py-1 border-b border-slate-800/30 last:border-0">
                        <span className="text-slate-500 font-medium capitalize">{key}:</span>
                        <span className="text-slate-300 font-mono text-right truncate pl-4">
                          {formatValue(tx.args[key])}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {recentTx.length > 3 && (
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="w-full mt-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-indigo-300 font-medium transition"
            >
              {showAllHistory ? '▲ Show Less' : `▼ Show More (${recentTx.length - 3} more)`}
            </button>
          )}
        </div>

        {/* MERCHANTS */}
        <div className="bg-[#10141B] p-8 rounded-2xl">
          <div className="flex justify-between mb-6">
            <h2 className="font-bold">Merchant Spend Rules</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 px-3 py-1 rounded flex gap-1 hover:bg-indigo-700 transition"
            >
              <Plus size={14} /> Add Merchant
            </button>
          </div>

          {merchants.map((m) => (
            <div key={m.id} className="flex justify-between mb-3">
              <div>
                <p>{m.name}</p>
                <p className="text-xs text-slate-500">{m.wallet}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedMerchant(m);
                  setShowRemoveModal(true);
                }}
                className="text-rose-400 hover:text-rose-300 transition"
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      </div>

   {/* DRAWER MENU */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
          {/* Backdrop - Added z-0 to keep it behind */}
          <div
            className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-sm z-0"
            onClick={() => setDrawerOpen(false)}
          />
          
          {/* Menu Content - Added 'relative' and 'z-10' to force it ON TOP of the blur */}
          <div className="relative z-10 w-96 bg-[#161B22] p-8 border-l border-indigo-500/30 shadow-2xl pointer-events-auto h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <p className="font-bold text-xl text-indigo-300">{user.name}</p>
                <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                    <X />
                </button>
            </div>
            
            <p className="text-sm font-mono text-slate-400 bg-black/40 p-3 rounded mb-6 break-all border border-white/5">
                {user.wallet}
            </p>

            <button
              onClick={disconnectWallet}
              className="mt-6 w-full border border-rose-500 text-rose-400 py-2 rounded hover:bg-rose-500/10 transition flex items-center justify-center gap-2"
            >
              <Wallet size={16} /> Disconnect Wallet
            </button>
          </div>
        </div>
      )}
      
      {/* ADD MERCHANT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161B22] p-6 rounded-2xl w-96 border border-white/10 shadow-2xl">
            <h3 className="font-bold mb-4 text-lg">Add Merchant</h3>

            <input
              placeholder="Name"
              value={newMerchant.name}
              onChange={(e) =>
                setNewMerchant({ ...newMerchant, name: e.target.value })
              }
              className="w-full mb-2 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-indigo-500 outline-none"
            />

            <input
              placeholder="Wallet Address"
              value={newMerchant.wallet}
              onChange={(e) =>
                setNewMerchant({ ...newMerchant, wallet: e.target.value })
              }
              className="w-full mb-2 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-indigo-500 outline-none"
            />

            <input
              placeholder="Limit (ETH)"
              value={newMerchant.limit}
              onChange={(e) =>
                setNewMerchant({ ...newMerchant, limit: e.target.value })
              }
              className="w-full mb-4 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-indigo-500 outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={addMerchant}
                className="bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE MERCHANT MODAL */}
      {showRemoveModal && selectedMerchant && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161B22] p-6 rounded-2xl w-96 border border-white/10 shadow-2xl">
            <h3 className="font-bold mb-4 text-lg text-rose-400">Remove Merchant</h3>

            <p className="mb-6 text-slate-300">
              Are you sure you want to remove <span className="font-bold text-white">{selectedMerchant.name}</span>?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRemoveModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={removeMerchant}
                className="bg-rose-600 px-4 py-2 rounded hover:bg-rose-700 transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- HELPERS ---------------- */
const GlassCard = ({ title, value, icon, className }) => (
  <div className={`bg-[#10141B] p-6 rounded-2xl border border-white/5 ${className}`}>
    <div className="mb-3 text-indigo-500">{icon}</div>
    <div className="text-2xl font-black">{value}</div>
    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{title}</p>
  </div>
);

export default AgenticDashboard;