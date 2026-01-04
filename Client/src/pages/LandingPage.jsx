import React from "react";

export default function LandingPage({ onConnect }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#0B1225] to-[#05070F] text-white flex items-center relative">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      {/* Glass Container */}
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 md:p-14 shadow-2xl">

          {/* HERO */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-sky-400">
              Artha Rail
            </h1>

            <p className="mt-4 text-gray-300 text-lg max-w-3xl mx-auto">
              The Autonomous Governance Layer for AI Commerce
            </p>

            {/* ✅ ONLY NAVIGATION */}
            <button
              onClick={onConnect}
              className="mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:opacity-90 transition"
            >
              Connect Wallet
            </button>
          </div>

          {/* KEY POINTS */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-200">
            {[
              "Smart-Contract Limits",
              "Autonomous AI Agents",
              "Human-in-the-Loop",
              "On-Chain Auditability",
            ].map((item) => (
              <div
                key={item}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl py-4 text-center"
              >
                {item}
              </div>
            ))}
          </div>

          {/* HOW IT WORKS */}
          <div className="mt-12 text-center text-sm text-gray-300">
            <span>Create Agent</span>
            <span className="mx-3 text-purple-400">→</span>
            <span>Set Rules</span>
            <span className="mx-3 text-purple-400">→</span>
            <span>Monitor Transactions</span>
          </div>

          {/* TECH STACK */}
          <div className="mt-10 text-center text-xs text-gray-400">
            Ethereum · Solidity · React · Tailwind CSS · Web3.js · AI Agents
          </div>
        </div>
      </div>
    </div>
  );
}
