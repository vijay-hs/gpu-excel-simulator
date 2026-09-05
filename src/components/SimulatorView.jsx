import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Zap, Layers, Cpu, Code, Info, CheckCircle2, Flame } from 'lucide-react';
import { CUDA_TILED_CODE, CUDA_NAIVE_CODE } from '../data/constants';
import { toExcelCoord, getExcelFormulaForCell } from '../utils/gemmEngine';

export default function SimulatorView({
  matrixA,
  matrixB,
  tileWidth,
  executionTrace,
  selectedPreset,
  setSelectedPreset,
  algorithmMode,
  setAlgorithmMode
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedCell, setSelectedCell] = useState({ r: 0, c: 0 }); // Focus cell in Matrix C

  const timerRef = useRef(null);

  const N = matrixA.length;
  const currentStep = executionTrace[currentStepIdx] || executionTrace[0];
  const maxSteps = executionTrace.length - 1;

  // Auto playback loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= maxSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1400 / playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, maxSteps, playbackSpeed]);

  const handleStepNext = () => {
    setIsPlaying(false);
    if (currentStepIdx < maxSteps) setCurrentStepIdx(currentStepIdx + 1);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    if (currentStepIdx > 0) setCurrentStepIdx(currentStepIdx - 1);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  // Helper to check if a cell in Matrix A is part of active DRAM load
  const isCellActiveInA = (r, c) => {
    return currentStep.activeTilesA?.some((item) => item.r === r && item.c === c);
  };

  // Helper to check if a cell in Matrix B is part of active DRAM load
  const isCellActiveInB = (r, c) => {
    return currentStep.activeTilesB?.some((item) => item.r === r && item.c === c);
  };

  const selectedThreadId = selectedCell.r * N + selectedCell.c;
  const selectedWarpId = Math.floor(selectedThreadId / 32);
  const selectedTx = selectedCell.c % tileWidth;
  const selectedTy = selectedCell.r % tileWidth;
  const selectedBx = Math.floor(selectedCell.c / tileWidth);
  const selectedBy = Math.floor(selectedCell.r / tileWidth);

  return (
    <div className="space-y-5">
      {/* Top Controller Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4 border-slate-800">
        {/* Left: Presets & Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 px-2">Matrix Size:</span>
            {['4x4', '8x8'].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setSelectedPreset(preset);
                  setCurrentStepIdx(0);
                  setIsPlaying(false);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  selectedPreset === preset
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 px-2">Mode:</span>
            <button
              onClick={() => setAlgorithmMode('tiled')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                algorithmMode === 'tiled'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-cyan-300" />
              <span>Tiled Shared Memory (Fast)</span>
            </button>
            <button
              onClick={() => setAlgorithmMode('naive')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                algorithmMode === 'naive'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-300" />
              <span>Naive Direct DRAM (Slow)</span>
            </button>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Reset to Step 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleStepPrev}
            disabled={currentStepIdx === 0}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-all"
            title="Previous Step"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-bold"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Cycle'}</span>
          </button>
          <button
            onClick={handleStepNext}
            disabled={currentStepIdx === maxSteps}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-all"
            title="Next Step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800 text-[11px] text-slate-400">
            <span>Speed:</span>
            {[0.5, 1, 2, 3].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                  playbackSpeed === speed ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Step Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-300">
              Cycle Step <span className="text-cyan-400 font-mono text-sm">{currentStepIdx}</span> / {maxSteps}
            </div>
            <div className="text-[10px] text-slate-400">
              Tile Step <span className="text-purple-400 font-mono font-bold">{currentStep.tileIndex + 1}</span> of{' '}
              {Math.ceil(N / tileWidth)}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Phase Status Banner */}
      <div className="glass-card p-4 border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold font-mono text-sm">
              {currentStep.tileIndex + 1}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{currentStep.title}</span>
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full font-mono uppercase">
                  {currentStep.phase}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">{currentStep.description}</p>
            </div>
          </div>

          {/* Quick Metrics Tag */}
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">DRAM Reads</span>
              <span className="font-mono font-bold text-rose-400">{currentStep.stats.dramReads} words</span>
            </div>
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">SRAM Hits</span>
              <span className="font-mono font-bold text-cyan-400">{currentStep.stats.sramReads} words</span>
            </div>
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">FLOPs Done</span>
              <span className="font-mono font-bold text-emerald-400">{currentStep.stats.flops}</span>
            </div>
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Arithmetic Intensity</span>
              <span className="font-mono font-bold text-amber-400">{currentStep.stats.arithmeticIntensity} FLOP/B</span>
            </div>
          </div>
        </div>
      </div>

      {/* Excel Formula Bar */}
      <div className="formula-bar">
        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
          {toExcelCoord(selectedCell.r, selectedCell.c, 'Matrix_C!')}
        </span>
        <span className="formula-fx">fx</span>
        <div className="formula-text flex-1 overflow-x-auto whitespace-nowrap">
          {getExcelFormulaForCell(selectedCell.r, selectedCell.c, N)}
        </div>
        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Thread: <span className="text-cyan-400 font-bold">({selectedCell.c}, {selectedCell.r})</span> | Block: <span className="text-purple-400 font-bold">({selectedBx}, {selectedBy})</span>
        </div>
      </div>

      {/* Main 3-Column Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Global DRAM Matrices & SRAM Tiling (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-4 space-y-4 border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Global Memory DRAM (400-Cycle Latency)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Row-Major VRAM</span>
            </div>

            {/* Matrix A & B Grids Side-by-Side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Matrix A */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-400">Matrix A ({N}x{N})</span>
                  <span className="text-[10px] text-slate-400">Row {selectedCell.r + 1}</span>
                </div>
                <table className="excel-table w-full">
                  <thead>
                    <tr>
                      <th className="excel-th w-6 text-[10px]"></th>
                      {Array.from({ length: N }).map((_, c) => (
                        <th key={c} className="excel-th text-[10px]">
                          {String.fromCharCode(65 + c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixA.map((row, r) => (
                      <tr key={r}>
                        <td className="excel-th text-[10px] font-mono">{r + 1}</td>
                        {row.map((val, c) => {
                          const isActive = isCellActiveInA(r, c);
                          const isSelectedRow = selectedCell.r === r;
                          return (
                            <td
                              key={c}
                              className={`excel-td font-mono text-xs ${
                                isActive ? 'cell-active-tile-a' : isSelectedRow ? 'bg-cyan-950/30 text-cyan-200' : ''
                              }`}
                              title={`Matrix A [${r}, ${c}] = ${val} (Global Addr: 0x${(r * N + c) * 4})`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Matrix B */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-purple-400">Matrix B ({N}x{N})</span>
                  <span className="text-[10px] text-slate-400">Col {selectedCell.c + 1}</span>
                </div>
                <table className="excel-table w-full">
                  <thead>
                    <tr>
                      <th className="excel-th w-6 text-[10px]"></th>
                      {Array.from({ length: N }).map((_, c) => (
                        <th key={c} className="excel-th text-[10px]">
                          {String.fromCharCode(65 + c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixB.map((row, r) => (
                      <tr key={r}>
                        <td className="excel-th text-[10px] font-mono">{r + 1}</td>
                        {row.map((val, c) => {
                          const isActive = isCellActiveInB(r, c);
                          const isSelectedCol = selectedCell.c === c;
                          return (
                            <td
                              key={c}
                              className={`excel-td font-mono text-xs ${
                                isActive ? 'cell-active-tile-b' : isSelectedCol ? 'bg-purple-950/30 text-purple-200' : ''
                              }`}
                              title={`Matrix B [${r}, ${c}] = ${val} (Global Addr: 0x${(r * N + c) * 4})`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fast On-Chip Shared Memory SRAM Buffers */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-300">
                    On-Chip Shared Memory SRAM Cache (20 Cycles)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-mono">
                  Active Tile Step m={currentStep.tileIndex}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-xl border border-cyan-900/30">
                {/* SRAM As */}
                <div>
                  <div className="text-[11px] font-mono font-bold text-cyan-400 mb-1 flex items-center justify-between">
                    <span>As[{tileWidth}][{tileWidth}]</span>
                    <span className="text-[9px] text-slate-500">SRAM Bank 0..{tileWidth - 1}</span>
                  </div>
                  <table className="excel-table w-full">
                    <tbody>
                      {currentStep.sharedMemA.map((row, r) => (
                        <tr key={r}>
                          {row.map((val, c) => {
                            const isComputeActive = currentStep.activeSramACol === c;
                            return (
                              <td
                                key={c}
                                className={`excel-td font-mono text-xs font-bold ${
                                  isComputeActive
                                    ? 'bg-cyan-500/40 text-cyan-100 border-2 border-cyan-400 cell-sram-pulse'
                                    : 'bg-cyan-950/40 text-cyan-300'
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SRAM Bs */}
                <div>
                  <div className="text-[11px] font-mono font-bold text-purple-400 mb-1 flex items-center justify-between">
                    <span>Bs[{tileWidth}][{tileWidth}]</span>
                    <span className="text-[9px] text-slate-500">SRAM Bank 0..{tileWidth - 1}</span>
                  </div>
                  <table className="excel-table w-full">
                    <tbody>
                      {currentStep.sharedMemB.map((row, r) => (
                        <tr key={r}>
                          {row.map((val, c) => {
                            const isComputeActive = currentStep.activeSramBRow === r;
                            return (
                              <td
                                key={c}
                                className={`excel-td font-mono text-xs font-bold ${
                                  isComputeActive
                                    ? 'bg-purple-500/40 text-purple-100 border-2 border-purple-400 cell-sram-pulse'
                                    : 'bg-purple-950/40 text-purple-300'
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Streaming Multiprocessor (SM) Execution Core & Matrix C (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card p-4 space-y-4 border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  SM Core & Register Accumulators
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">Block (0,0) Focus</span>
            </div>

            {/* Matrix C Output Spreadsheet Grid */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400">
                  Matrix C (Global Output VRAM)
                </span>
                <span className="text-[10px] text-slate-400">Click any cell to inspect</span>
              </div>
              <table className="excel-table w-full">
                <thead>
                  <tr>
                    <th className="excel-th w-6 text-[10px]"></th>
                    {Array.from({ length: N }).map((_, c) => (
                      <th key={c} className="excel-th text-[10px]">
                        {String.fromCharCode(65 + c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentStep.matrixC.map((row, r) => (
                    <tr key={r}>
                      <td className="excel-th text-[10px] font-mono">{r + 1}</td>
                      {row.map((val, c) => {
                        const isSelected = selectedCell.r === r && selectedCell.c === c;
                        const regVal = currentStep.threadRegisters[r][c];
                        const displayVal = val !== null ? val : regVal > 0 ? `(${regVal})` : '0';
                        return (
                          <td
                            key={c}
                            onClick={() => setSelectedCell({ r, c })}
                            className={`excel-td font-mono text-xs font-bold transition-all ${
                              isSelected
                                ? 'cell-active-tile-c ring-2 ring-emerald-400'
                                : val !== null
                                ? 'bg-emerald-950/40 text-emerald-300'
                                : regVal > 0
                                ? 'bg-amber-950/30 text-amber-300 italic'
                                : 'text-slate-600'
                            }`}
                            title={`Thread (${c}, ${r}) Register Pvalue = ${regVal}`}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thread Core Block Architecture (4x4 or 2x2 ALUs) */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Thread ALUs (Multiply-Add Units)</span>
                <span className="text-[10px] text-cyan-400 font-mono">SIMT Lockstep</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: tileWidth * tileWidth }).map((_, idx) => {
                  const ty = Math.floor(idx / tileWidth);
                  const tx = idx % tileWidth;
                  const isThisThreadSelected = selectedCell.r === ty && selectedCell.c === tx;
                  const regValue = currentStep.threadRegisters[ty][tx];
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCell({ r: ty, c: tx })}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isThisThreadSelected
                          ? 'bg-emerald-950/50 border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono font-bold text-cyan-400">
                          T({tx},{ty})
                        </span>
                        <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                          ID: {ty * N + tx}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <span className="text-slate-500 text-[10px]">Register: </span>
                        <span className="font-mono font-bold text-emerald-400">{regValue}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                        As[{ty}][k] * Bs[k][{tx}]
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Synchronized CUDA Kernel & Thread Inspector (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Synchronized CUDA Kernel Panel */}
          <div className="glass-card p-4 space-y-3 border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live CUDA C++ Kernel
                </h3>
              </div>
              <span className="text-[10px] text-purple-400 font-mono">Line {currentStep.cudaLine}</span>
            </div>

            <div className="bg-[#0b0f19] p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] max-h-64 overflow-y-auto space-y-0.5">
              {(algorithmMode === 'tiled' ? CUDA_TILED_CODE : CUDA_NAIVE_CODE).map((item) => {
                const isActive = item.line === currentStep.cudaLine;
                return (
                  <div
                    key={item.line}
                    className={`flex items-start gap-2 px-1.5 py-0.5 rounded transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-200 border-l-2 border-cyan-400 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 select-none text-[10px] w-4 text-right">
                      {item.line}
                    </span>
                    <span className="flex-1 whitespace-pre">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thread / Cell Inspector Card */}
          <div className="glass-card p-4 space-y-3 border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Thread / Cell Inspector
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                {toExcelCoord(selectedCell.r, selectedCell.c, 'C')}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Global Coordinate:</span>
                <span className="font-mono font-bold text-white">
                  Row {selectedCell.r}, Col {selectedCell.c}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Thread ID (threadIdx):</span>
                <span className="font-mono font-bold text-cyan-400">
                  ({selectedTx}, {selectedTy})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Block ID (blockIdx):</span>
                <span className="font-mono font-bold text-purple-400">
                  ({selectedBx}, {selectedBy})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Warp ID & Lane:</span>
                <span className="font-mono font-bold text-emerald-400">
                  Warp {selectedWarpId}, Lane {selectedThreadId % 32}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Accumulator Register:</span>
                <span className="font-mono font-bold text-amber-400">
                  {currentStep.threadRegisters[selectedCell.r][selectedCell.c]}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Final Cell Value:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {currentStep.matrixC[selectedCell.r][selectedCell.c] !== null
                    ? currentStep.matrixC[selectedCell.r][selectedCell.c]
                    : 'In Progress...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
