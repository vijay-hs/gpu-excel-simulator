import React, { useState } from 'react';
import { Layers, Plus, ArrowRight, Zap, CheckCircle2, Calculator, RefreshCw, Cpu } from 'lucide-react';
import { toExcelCoord, getReductionEquationForCell } from '../utils/gemmEngine';

export default function BlockGemmReductionView({ matrixA, matrixB, tileWidth }) {
  const [selectedCell, setSelectedCell] = useState({ r: 0, c: 0 });
  const [activeStepTab, setActiveStepTab] = useState('reduction'); // 'reduction' vs 'partial-matrices'

  const N = matrixA.length;
  const numTiles = Math.floor(N / tileWidth);
  const gridDim = Math.ceil(N / tileWidth);

  // Compute all partial product matrices for m = 0 .. numTiles-1
  const partialMatrices = [];
  for (let m = 0; m < numTiles; m++) {
    const pMat = Array(N).fill(0).map(() => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let sum = 0;
        for (let k = 0; k < tileWidth; k++) {
          sum += matrixA[r][m * tileWidth + k] * matrixB[m * tileWidth + k][c];
        }
        pMat[r][c] = sum;
      }
    }
    partialMatrices.push(pMat);
  }

  // Final Matrix C
  const matrixC = Array(N).fill(0).map((_, r) =>
    Array(N).fill(0).map((_, c) =>
      partialMatrices.reduce((acc, pMat) => acc + pMat[r][c], 0)
    )
  );

  const reductionDetail = getReductionEquationForCell(matrixA, matrixB, selectedCell.r, selectedCell.c, tileWidth);

  const selectedBx = Math.floor(selectedCell.c / tileWidth);
  const selectedBy = Math.floor(selectedCell.r / tileWidth);
  const selectedTx = selectedCell.c % tileWidth;
  const selectedTy = selectedCell.r % tileWidth;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Calculator className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Block GEMM, Partial Products & Register Reduction Engine
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            In standard matrix multiplication, each output element is a long dot product of length $K$. On a GPU, this is split into <strong>Sub-Matrix Tile Multiplications</strong>. Each Thread Block computes intermediate <strong>Partial Products</strong> from fast on-chip SRAM, which are then temporally reduced inside private <strong>Thread Registers</strong>:
            <span className="block font-mono text-emerald-300 mt-2 font-bold bg-slate-950/80 p-2 rounded border border-slate-800">
              C = PartialProduct^(Tile 0) + PartialProduct^(Tile 1) + ... + PartialProduct^(Tile M-1)
            </span>
          </p>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveStepTab('reduction')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeStepTab === 'reduction'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Cell-by-Cell Register Reduction Trace</span>
        </button>

        <button
          onClick={() => setActiveStepTab('partial-matrices')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeStepTab === 'partial-matrices'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Partial Product Sub-Matrices Sum (Full Grid View)</span>
        </button>
      </div>

      {activeStepTab === 'partial-matrices' ? (
        /* PARTIAL PRODUCT MATRICES FULL GRID BREAKDOWN */
        <div className="glass-card p-6 border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Sub-Matrix Tile Reduction: Summing Partial Products to Form Matrix C</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every tile step $m$ produces a full $N \times N$ partial matrix. Adding them together yields the final output.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 px-3 py-1 bg-cyan-950/60 rounded-lg border border-cyan-800/60">
              {numTiles} Tile Steps Total
            </span>
          </div>

          {/* Equation Layout: Partial 0 + Partial 1 = Matrix C */}
          <div className="flex flex-wrap items-center justify-center gap-6 py-4 overflow-x-auto">
            {partialMatrices.map((pMat, m) => (
              <React.Fragment key={m}>
                {m > 0 && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-lg">
                      +
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">Accumulate</span>
                  </div>
                )}

                {/* Partial Product Matrix Card */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5 min-w-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 font-mono">
                      Partial P^({m})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      k = {m * tileWidth}..{(m + 1) * tileWidth - 1}
                    </span>
                  </div>

                  <table className="excel-table w-full">
                    <thead>
                      <tr>
                        <th className="excel-th w-5 text-[10px]"></th>
                        {Array.from({ length: N }).map((_, c) => (
                          <th key={c} className="excel-th text-[10px]">
                            {String.fromCharCode(65 + c)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pMat.map((row, r) => (
                        <tr key={r}>
                          <td className="excel-th text-[10px] font-mono">{r + 1}</td>
                          {row.map((val, c) => (
                            <td
                              key={c}
                              className="excel-td font-mono text-xs text-cyan-200 bg-cyan-950/20"
                            >
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-[10px] text-slate-400 text-center font-mono">
                    Tile Step {m + 1} of {numTiles}
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Equals Arrow */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-lg shadow-lg">
                =
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">Final Store</span>
            </div>

            {/* Final Matrix C */}
            <div className="bg-slate-950/80 p-4 rounded-xl border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 space-y-2.5 min-w-[180px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  Final Matrix C
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  Reduced Result
                </span>
              </div>

              <table className="excel-table w-full">
                <thead>
                  <tr>
                    <th className="excel-th w-5 text-[10px]"></th>
                    {Array.from({ length: N }).map((_, c) => (
                      <th key={c} className="excel-th text-[10px]">
                        {String.fromCharCode(65 + c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixC.map((row, r) => (
                    <tr key={r}>
                      <td className="excel-th text-[10px] font-mono">{r + 1}</td>
                      {row.map((val, c) => (
                        <td
                          key={c}
                          className="excel-td font-mono text-xs font-bold text-emerald-300 bg-emerald-950/40"
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[10px] text-emerald-400 text-center font-mono font-bold">
                100% Complete
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CELL-BY-CELL REGISTER REDUCTION EXPLORER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Matrix C Selector Grid (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-card p-5 border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>Select Any Cell in Matrix C</span>
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {toExcelCoord(selectedCell.r, selectedCell.c, 'C')}
                </span>
              </div>

              <table className="excel-table w-full">
                <thead>
                  <tr>
                    <th className="excel-th w-6 text-xs"></th>
                    {Array.from({ length: N }).map((_, c) => (
                      <th key={c} className="excel-th text-xs">
                        {String.fromCharCode(65 + c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixC.map((row, r) => (
                    <tr key={r}>
                      <td className="excel-th text-xs font-mono">{r + 1}</td>
                      {row.map((val, c) => {
                        const isSelected = selectedCell.r === r && selectedCell.c === c;
                        return (
                          <td
                            key={c}
                            onClick={() => setSelectedCell({ r, c })}
                            className={`excel-td font-mono text-xs font-bold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-500/40 text-emerald-100 border-2 border-emerald-400 ring-2 ring-emerald-400/50'
                                : 'hover:bg-slate-800 text-slate-200'
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

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Thread Block:</span>
                  <span className="font-mono font-bold text-purple-400">
                    Block ({selectedBx}, {selectedBy})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Thread in Block:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    Thread ({selectedTx}, {selectedTy})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Global Thread ID:</span>
                  <span className="font-mono font-bold text-amber-400">
                    ID {selectedCell.r * N + selectedCell.c}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Detailed Register Accumulation Trace (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-card p-5 border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  <span>Register Temporal Accumulation for {toExcelCoord(selectedCell.r, selectedCell.c, 'C')}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Total = {reductionDetail.finalTotal}
                </span>
              </div>

              {/* Step-by-Step Register Accumulator Timeline */}
              <div className="space-y-3">
                {/* Initial State */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">1. Register Initialization:</span>
                  <span className="font-mono font-bold text-slate-300">
                    float Pvalue = 0.0f;
                  </span>
                </div>

                {/* Each Tile Step Accumulation */}
                {reductionDetail.tileTerms.map((term, idx) => {
                  let runningTotal = 0;
                  for (let i = 0; i <= idx; i++) {
                    runningTotal += reductionDetail.tileTerms[i].partialSum;
                  }

                  return (
                    <div
                      key={term.m}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 font-mono">
                          Tile Step m={term.m} (k = {term.m * tileWidth}..{(term.m + 1) * tileWidth - 1})
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded font-mono font-bold">
                          Partial Sum = +{term.partialSum}
                        </span>
                      </div>

                      {/* Products in this tile */}
                      <div className="font-mono text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        {term.products.map((p, pIdx) => (
                          <div key={pIdx} className="flex justify-between items-center text-[11px]">
                            <span>
                              As[{selectedTy}][{pIdx}] × Bs[{pIdx}][{selectedTx}] = ({p.valA} × {p.valB})
                            </span>
                            <span className="text-cyan-300 font-bold">
                              = {p.prod}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Register Update */}
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Register state after Tile {term.m}:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          Pvalue = {runningTotal}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Final Commit to DRAM */}
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Final Global VRAM Store:</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    C[{selectedCell.r * N + selectedCell.c}] = {reductionDetail.finalTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
