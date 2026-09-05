import React, { useState } from 'react';
import { Zap, CheckCircle2, XCircle, Layers, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export default function WarpCoalescingView() {
  const [accessPattern, setAccessPattern] = useState('coalesced'); // 'coalesced' vs 'strided'

  const threads = Array.from({ length: 32 }, (_, i) => i); // 32 threads in 1 Warp

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="glass-card p-6 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Warp SIMT Execution & Memory Coalescing Visualizer
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The GPU Memory Controller does not load single float values. It loads data in <strong>128-byte or 32-byte cache lines</strong>. When all 32 threads in a Warp access contiguous 4-byte floats, the entire warp is serviced in a <strong>single 128-byte DRAM transaction (100% Bus Efficiency)</strong>. If threads access scattered or strided memory (e.g. columns of Matrix B), the hardware is forced to issue up to <strong>32 separate transactions</strong>, wasting up to 96% of memory bandwidth!
          </p>
        </div>
      </div>

      {/* Interactive Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAccessPattern('coalesced')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            accessPattern === 'coalesced'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Coalesced Contiguous Access (Row-Major Matrix A)</span>
        </button>

        <button
          onClick={() => setAccessPattern('strided')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            accessPattern === 'strided'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Uncoalesced Strided Access (Column-Major Matrix B in DRAM)</span>
        </button>
      </div>

      {/* Visual Memory Bus Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 32 Threads in Warp (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Warp 0: 32 CUDA Threads (Lanes 0 to 31)</span>
              </h3>
              <span className="text-xs text-cyan-400 font-mono">SIMT Lockstep Instruction</span>
            </div>

            {/* Grid of 32 Threads */}
            <div className="grid grid-cols-8 gap-2">
              {threads.map((tid) => {
                const targetAddress = accessPattern === 'coalesced' ? tid * 4 : tid * 64; // Strided by 64 bytes
                return (
                  <div
                    key={tid}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      accessPattern === 'coalesced'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-400 font-bold">T{tid}</div>
                    <div className="text-[9px] font-mono font-bold mt-0.5">
                      {targetAddress}B
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex items-center justify-between">
              <span>Instruction: <code className="text-cyan-300 font-mono">LDG.E R1, [Addr]</code></span>
              <span className="text-[11px] font-bold text-slate-300">
                {accessPattern === 'coalesced' ? '✅ Contiguous Address Offset (+4B)' : '❌ Strided Address Offset (+64B)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: DRAM Bus Transactions & Efficiency (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Memory Bus Efficiency</h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                  accessPattern === 'coalesced'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {accessPattern === 'coalesced' ? '100% Optimal' : '6.25% Degraded'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Requested Data:</span>
                  <span className="font-mono font-bold text-white">32 × 4B = 128 Bytes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DRAM Cache Lines Transferred:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {accessPattern === 'coalesced' ? '1 × 128B Transaction' : '32 × 32B Transactions (1024B)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bus Bandwidth Utilization:</span>
                  <span
                    className={`font-mono font-bold ${
                      accessPattern === 'coalesced' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {accessPattern === 'coalesced' ? '100% Useful Data' : '93.75% Wasted Traffic'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
                {accessPattern === 'coalesced' ? (
                  <p>
                    🎉 <strong>Why Shared Memory Tiling Saves GEMM:</strong> By loading tiles cooperatively in row-major chunks, threads always execute coalesced 128-byte transactions. Once inside SRAM, threads can read column elements at high speed without bus penalty!
                  </p>
                ) : (
                  <p>
                    ⚠️ <strong>The Strided Read Penalty:</strong> When naive matrix multiplication reads a column of $B$ from Global Memory, adjacent threads in a warp access memory addresses separated by $N \times 4$ bytes. The hardware must serialize these reads into multiple separate memory transactions.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
