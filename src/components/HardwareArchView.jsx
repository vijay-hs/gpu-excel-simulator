import React, { useState } from 'react';
import { HardDrive, Cpu, Layers, Zap, ArrowDown, Activity, Clock, ShieldCheck } from 'lucide-react';
import { MEMORY_HIERARCHY_LEVELS } from '../data/constants';

export default function HardwareArchView() {
  const [selectedTier, setSelectedTier] = useState(MEMORY_HIERARCHY_LEVELS[1]); // Default to Shared Memory

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="glass-card p-6 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <HardDrive className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              GPU Hardware & Memory Hierarchy Architecture
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The fundamental bottleneck in deep learning and matrix multiplication is the <strong>Memory Wall</strong>. Reading from Global VRAM takes <strong>400–800 clock cycles</strong>, while reading from on-chip SRAM (Shared Memory) or Registers takes only <strong>0–30 cycles</strong>. Understanding this hierarchy is the secret to high-performance CUDA computing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Memory Hierarchy Pyramid (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between pb-3 border-b border-slate-800">
              <span>Interactive Memory Hierarchy Pyramid</span>
              <span className="text-xs text-slate-400">Click any tier to inspect</span>
            </h3>

            <div className="space-y-3">
              {MEMORY_HIERARCHY_LEVELS.map((tier, idx) => {
                const isSelected = selectedTier.name === tier.name;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedTier(tier)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tier.color }}
                        />
                        <span className="text-sm font-bold text-white">{tier.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
                          {tier.scope}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tier.latency}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Capacity:</span>
                        <span className="font-mono text-slate-200">{tier.capacity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Bandwidth:</span>
                        <span className="font-mono text-emerald-400 font-bold">{tier.bandwidth}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Memory Tier Deep Dive & Streaming Multiprocessor Layout (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Selected Tier Card */}
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Tier Deep Dive: {selectedTier.name}</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed text-sm">{selectedTier.desc}</p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block mb-1">Hardware Latency:</span>
                  <span className="font-mono text-lg font-bold text-rose-400">
                    {selectedTier.latency}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Clock cycles the SM execution pipeline waits for data.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block mb-1">Peak Bandwidth:</span>
                  <span className="font-mono text-lg font-bold text-emerald-400">
                    {selectedTier.bandwidth}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Maximum theoretical data transfer throughput.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Streaming Multiprocessor (SM) Schematic Block */}
          <div className="glass-card p-5 border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Cpu className="w-4 h-4" />
              <span>Streaming Multiprocessor (SM) Internal Architecture</span>
            </h3>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs text-slate-300 font-bold flex justify-between items-center">
                <span>NVIDIA SM (e.g. Hopper / Ampere / Ada)</span>
                <span className="text-[10px] text-purple-400 font-mono">128 CUDA Cores + 4 Tensor Cores</span>
              </div>

              {/* SM Subcomponents */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-purple-900/40">
                  <span className="text-[10px] text-purple-400 font-bold block mb-1">
                    4x Warp Schedulers
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Dispatches 32-thread instructions per clock cycle.
                  </p>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-cyan-900/40">
                  <span className="text-[10px] text-cyan-400 font-bold block mb-1">
                    Shared Memory / L1 (SRAM)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Up to 228 KB high-speed banked scratchpad.
                  </p>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-emerald-900/40">
                  <span className="text-[10px] text-emerald-400 font-bold block mb-1">
                    64 KB Register File
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Provides zero-latency registers to all active warps.
                  </p>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-amber-900/40">
                  <span className="text-[10px] text-amber-400 font-bold block mb-1">
                    Tensor Cores (MMA)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Hardware 16x16 matrix multiply-accumulate engines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
