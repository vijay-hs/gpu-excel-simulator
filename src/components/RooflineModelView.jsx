import React, { useState } from 'react';
import { Activity, Zap, TrendingUp, Cpu, Server, CheckCircle2 } from 'lucide-react';
import { GPU_HARDWARE_SPECS } from '../data/constants';

export default function RooflineModelView() {
  const [selectedGpu, setSelectedGpu] = useState(GPU_HARDWARE_SPECS[0]); // Default H100
  const [customTileSize, setCustomTileSize] = useState(16);

  // Arithmetic Intensity calculation
  // For Tiled GEMM: AI ≈ TILE_SIZE / (2 * sizeof(float)) = TILE_SIZE / 8 FLOPs/Byte
  const naiveAI = 0.25; // 2 FLOPs / (2 reads * 4 bytes) = 0.25 FLOPs/Byte
  const tiledAI = (customTileSize / 8).toFixed(2);

  const isTiledComputeBound = parseFloat(tiledAI) >= selectedGpu.ridgePoint;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Activity className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Roofline Performance Model & Hardware Comparison
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The <strong>Roofline Model</strong> defines the theoretical speed limit of any algorithm on a GPU. An algorithm's performance is capped either by the GPU's <strong>Peak Compute (TFLOPs)</strong> or by its <strong>Memory Bandwidth (GB/s)</strong>. Tiled matrix multiplication boosts Arithmetic Intensity past the GPU's <em>Ridge Point</em>, achieving peak compute performance.
          </p>
        </div>
      </div>

      {/* GPU Architecture Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {GPU_HARDWARE_SPECS.map((gpu) => {
          const isSelected = selectedGpu.name === gpu.name;
          return (
            <div
              key={gpu.name}
              onClick={() => setSelectedGpu(gpu)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900/90 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white truncate">{gpu.name}</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded font-mono">
                  {gpu.architecture.split(' ')[0]}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">FP32 Peak:</span>
                  <span className="font-mono font-bold text-cyan-400">{gpu.fp32Tflops} TFLOPs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tensor Cores:</span>
                  <span className="font-mono font-bold text-purple-400">{gpu.tensorTflops} TFLOPs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VRAM Bandwidth:</span>
                  <span className="font-mono font-bold text-emerald-400">{gpu.memBandwidthGBs} GB/s</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-500">Ridge Point:</span>
                  <span className="font-mono font-bold text-amber-400">{gpu.ridgePoint} FLOP/B</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Roofline Analyzer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Tile Size & Intensity Calculator (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Arithmetic Intensity Calculator</span>
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 font-bold mb-2">
                  <span>Tile Dimension (TILE_WIDTH × TILE_WIDTH):</span>
                  <span className="font-mono text-cyan-400 font-bold text-sm">{customTileSize} × {customTileSize}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="128"
                  step="2"
                  value={customTileSize}
                  onChange={(e) => setCustomTileSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>2 (Toy)</span>
                  <span>16 (Classic)</span>
                  <span>32 (Modern Shared Mem)</span>
                  <span>128 (Tensor Core MMA)</span>
                </div>
              </div>

              {/* Comparison Box */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-rose-950/20 p-3.5 rounded-xl border border-rose-900/40 space-y-1">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                    Naive GEMM
                  </span>
                  <div className="text-lg font-mono font-bold text-rose-300">
                    {naiveAI} <span className="text-xs font-normal">FLOPs/Byte</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded font-bold inline-block">
                    ❌ Severely Memory Bound
                  </span>
                </div>

                <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-900/40 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Tiled GEMM (Tile={customTileSize})
                  </span>
                  <div className="text-lg font-mono font-bold text-emerald-300">
                    {tiledAI} <span className="text-xs font-normal">FLOPs/Byte</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold inline-block ${
                      isTiledComputeBound
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {isTiledComputeBound ? '🚀 100% Compute Bound' : '⚠️ Still Memory Bound'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected GPU Hardware Limits (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Roofline Equation for {selectedGpu.name}</span>
              </h3>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="text-slate-400">
                Ridge Point = <span className="text-white">Peak TFLOPs / Bandwidth (TB/s)</span>
              </div>
              <div className="text-cyan-300 text-sm font-bold">
                {selectedGpu.fp32Tflops} TFLOPs ÷ {(selectedGpu.memBandwidthGBs / 1000).toFixed(2)} TB/s ={' '}
                <span className="text-amber-400">{selectedGpu.ridgePoint} FLOPs / Byte</span>
              </div>

              <p className="text-slate-300 font-sans text-xs leading-relaxed pt-2 border-t border-slate-800">
                {isTiledComputeBound ? (
                  <span className="text-emerald-400">
                    ✅ With Tile Size = {customTileSize}, the arithmetic intensity ({tiledAI} FLOPs/Byte) exceeds the ridge point ({selectedGpu.ridgePoint}). All {selectedGpu.cudaCores} CUDA cores are fully utilized without stalling on memory latency!
                  </span>
                ) : (
                  <span className="text-amber-400">
                    ⚠️ With Tile Size = {customTileSize}, arithmetic intensity ({tiledAI} FLOPs/Byte) is below the ridge point ({selectedGpu.ridgePoint}). Cores spend clock cycles idling waiting for memory. Increase tile size to reach peak throughput.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
