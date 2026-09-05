import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Zap, Layers, Cpu, Code, Info, CheckCircle2, Flame, Repeat, Eye } from 'lucide-react';
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
  setAlgorithmMode,
  onOpenReductionTab
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoLoop, setAutoLoop] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState('0_0'); // 'all' or 'bx_by'
  const [selectedCell, setSelectedCell] = useState({ r: 0, c: 0 }); // Focus cell in Matrix C

  const timerRef = useRef(null);

  const N = matrixA.length;
  const gridDim = Math.ceil(N / tileWidth);
  const currentStep = executionTrace[currentStepIdx] || executionTrace[0];
  const maxSteps = executionTrace.length - 1;
  const isFinished = currentStepIdx === maxSteps;

  // Auto playback loop with Auto-Loop support
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= maxSteps) {
            if (autoLoop) {
              return 0; // Loop back to start
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
      }, 1300 / playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, maxSteps, playbackSpeed, autoLoop]);

  const handleStepNext = () => {
    setIsPlaying(false);
    if (currentStepIdx < maxSteps) setCurrentStepIdx(currentStepIdx + 1);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    if (currentStepIdx > 0) setCurrentStepIdx(currentStepIdx - 1);
  };

  const handleResetAndReplay = () => {
    setCurrentStepIdx(0);
    setIsPlaying(true);
  };

  const handleResetOnly = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  // Get current active block data
  const currentBlockKey = selectedBlock === 'all' ? '0_0' : selectedBlock;
  const activeBlockData = currentStep.blockData?.[currentBlockKey] || {
    sharedA: Array(tileWidth).fill(0).map(() => Array(tileWidth).fill('-')),
    sharedB: Array(tileWidth).fill(0).map(() => Array(tileWidth).fill('-')),
    registers: Array(tileWidth).fill(0).map(() => Array(tileWidth).fill(0))
  };

  const [selBx, selBy] = currentBlockKey.split('_').map(Number);

  // Helper to check if a cell in Matrix A is part of active DRAM load for the selected block
  const isCellActiveInA = (r, c) => {
    if (currentStep.phase === 'INIT' || currentStep.phase === 'WRITE_GLOBAL') return false;
    const m = currentStep.tileIndex;
    const inColStripe = c >= m * tileWidth && c < (m + 1) * tileWidth;
    if (selectedBlock === 'all') {
      return inColStripe;
    } else {
      const inRowSlice = r >= selBy * tileWidth && r < (selBy + 1) * tileWidth;
      return inColStripe && inRowSlice;
    }
  };

  // Helper to check if a cell in Matrix B is part of active DRAM load for the selected block
  const isCellActiveInB = (r, c) => {
    if (currentStep.phase === 'INIT' || currentStep.phase === 'WRITE_GLOBAL') return false;
    const m = currentStep.tileIndex;
    const inRowStripe = r >= m * tileWidth && r < (m + 1) * tileWidth;
    if (selectedBlock === 'all') {
      return inRowStripe;
    } else {
      const inColSlice = c >= selBx * tileWidth && c < (selBx + 1) * tileWidth;
      return inRowStripe && inColSlice;
    }
  };

  const selectedThreadId = selectedCell.r * N + selectedCell.c;
  const selectedWarpId = Math.floor(selectedThreadId / 32);
  const selectedTx = selectedCell.c % tileWidth;
  const selectedTy = selectedCell.r % tileWidth;
  const selectedCellBx = Math.floor(selectedCell.c / tileWidth);
  const selectedCellBy = Math.floor(selectedCell.r / tileWidth);

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
              <span>Tiled Shared Memory</span>
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
              <span>Naive DRAM</span>
            </button>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <button
            onClick={handleResetOnly}
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

          {isFinished ? (
            <button
              onClick={handleResetAndReplay}
              className="btn-success px-3.5 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-bold shadow-emerald-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay from Start</span>
            </button>
          ) : (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-bold"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Cycle'}</span>
            </button>
          )}

          <button
            onClick={handleStepNext}
            disabled={currentStepIdx === maxSteps}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-all"
            title="Next Step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Auto Loop Toggle */}
          <button
            onClick={() => setAutoLoop(!autoLoop)}
            className={`p-1.5 rounded-lg transition-all ml-1 flex items-center gap-1 text-[11px] ${
              autoLoop ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Continuous Loop Playback"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loop</span>
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

        {/* Right: Step Indicator & Scrub Slider */}
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

      {/* Interactive Step Timeline Scrubber */}
      <div className="glass-card px-4 py-2.5 border-slate-800 flex items-center gap-3">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Timeline Scrub:</span>
        <input
          type="range"
          min="0"
          max={maxSteps}
          value={currentStepIdx}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentStepIdx(parseInt(e.target.value));
          }}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex items-center gap-1">
          {executionTrace.map((st, i) => (
            <button
              key={i}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIdx(i);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                currentStepIdx === i
                  ? 'bg-cyan-400 ring-2 ring-cyan-400/50 scale-125'
                  : i < currentStepIdx
                  ? 'bg-cyan-800'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={`Step ${i}: ${st.title}`}
            />
          ))}
        </div>
      </div>

      {/* Thread Block Grid Selector Bar */}
      <div className="glass-card p-3 border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-300">GPU Thread Block View Focus:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedBlock('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                selectedBlock === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All {gridDim}x{gridDim} Blocks (Full Grid)
            </button>
            {Array.from({ length: gridDim }).map((_, by) =>
              Array.from({ length: gridDim }).map((_, bx) => {
                const bKey = `${bx}_${by}`;
                const isSelected = selectedBlock === bKey;
                return (
                  <button
                    key={bKey}
                    onClick={() => setSelectedBlock(bKey)}
                    className={`px-2 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Block({bx},{by})
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quick button to open Reduction deep-dive */}
        {onOpenReductionTab && (
          <button
            onClick={onOpenReductionTab}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40 transition-all hover:border-emerald-500/50"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Deep-Dive: Partial Products & Reduction Math ➔</span>
          </button>
        )}
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
          Thread: <span className="text-cyan-400 font-bold">({selectedTx}, {selectedTy})</span> in Block: <span className="text-purple-400 font-bold">({selectedCellBx}, {selectedCellBy})</span>
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
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedBlock === 'all' ? 'All Blocks Loading' : `Block (${selBx}, ${selBy}) Slice`}
              </span>
            </div>

            {/* Matrix A & B Grids Side-by-Side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Matrix A */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-400">Matrix A ({N}x{N})</span>
                  <span className="text-[10px] text-slate-400">Cols {currentStep.tileIndex * tileWidth}..{(currentStep.tileIndex + 1) * tileWidth - 1}</span>
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
                              title={`Matrix A [${r}, ${c}] = ${val}`}
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
                  <span className="text-[10px] text-slate-400">Rows {currentStep.tileIndex * tileWidth}..{(currentStep.tileIndex + 1) * tileWidth - 1}</span>
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
                              title={`Matrix B [${r}, ${c}] = ${val}`}
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

            {/* Fast On-Chip Shared Memory SRAM Buffers for Selected Block */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-300">
                    Shared Memory SRAM Cache for Block({selBx}, {selBy})
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-mono">
                  20 Cycles Latency
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-xl border border-cyan-900/30">
                {/* SRAM As */}
                <div>
                  <div className="text-[11px] font-mono font-bold text-cyan-400 mb-1 flex items-center justify-between">
                    <span>As[{tileWidth}][{tileWidth}] (From Matrix A)</span>
                  </div>
                  <table className="excel-table w-full">
                    <tbody>
                      {activeBlockData.sharedA.map((row, r) => (
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
                    <span>Bs[{tileWidth}][{tileWidth}] (From Matrix B)</span>
                  </div>
                  <table className="excel-table w-full">
                    <tbody>
                      {activeBlockData.sharedB.map((row, r) => (
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
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                All {N*N} Threads Active
              </span>
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

            {/* Thread Core Block Architecture for Selected Block */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Threads in Block({selBx}, {selBy})
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">SIMT Lockstep</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: tileWidth * tileWidth }).map((_, idx) => {
                  const ty = Math.floor(idx / tileWidth);
                  const tx = idx % tileWidth;
                  const globalRow = selBy * tileWidth + ty;
                  const globalCol = selBx * tileWidth + tx;
                  const isThisThreadSelected = selectedCell.r === globalRow && selectedCell.c === globalCol;
                  const regValue = currentStep.threadRegisters[globalRow][globalCol];
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCell({ r: globalRow, c: globalCol })}
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
                          Cell({globalCol},{globalRow})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <span className="text-slate-500 text-[10px]">Accumulator: </span>
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
                <span className="text-slate-400">Block ID (blockIdx):</span>
                <span className="font-mono font-bold text-purple-400">
                  ({selectedCellBx}, {selectedCellBy})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Thread ID in Block:</span>
                <span className="font-mono font-bold text-cyan-400">
                  ({selectedTx}, {selectedTy})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Warp ID & Lane:</span>
                <span className="font-mono font-bold text-emerald-400">
                  Warp {selectedWarpId}, Lane {selectedThreadId % 32}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Current Register Accumulator:</span>
                <span className="font-mono font-bold text-amber-400">
                  {currentStep.threadRegisters[selectedCell.r][selectedCell.c]}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Final Cell Result:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {currentStep.matrixC[selectedCell.r][selectedCell.c] !== null
                    ? currentStep.matrixC[selectedCell.r][selectedCell.c]
                    : 'Computing...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
