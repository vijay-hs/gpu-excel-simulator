import React, { useState } from 'react';
import { FileSpreadsheet, ArrowRight, Layers, Zap, CheckCircle2, HelpCircle } from 'lucide-react';
import { toExcelCoord } from '../utils/gemmEngine';

export default function ExcelMentalModelView({ matrixA, matrixB }) {
  const [selectedCell, setSelectedCell] = useState({ r: 0, c: 0 });
  const N = matrixA.length;

  const comparisons = [
    {
      concept: "Array & Memory Layout",
      excel: "2D Grid with Column Letters (A, B, C...) and Row Numbers (1, 2, 3...)",
      cuda: "1D Flattened Buffer in Global VRAM: index = row * N + col (Row-Major)",
      icon: Layers,
      color: "text-cyan-400"
    },
    {
      concept: "Worker / Execution Unit",
      excel: "1 human clerk sitting at Excel manually typing formulas into cells one-by-one",
      cuda: "10,000+ CUDA Threads computing all cells in parallel lockstep (SIMT)",
      icon: Zap,
      color: "text-purple-400"
    },
    {
      concept: "Dot Product Computation",
      excel: "=SUMPRODUCT(A1:D1, B1:B4) computes 1 output cell in isolation",
      cuda: "1 CUDA Thread (tx, ty) runs a loop: Pvalue += A[row*N+k] * B[k*N+col]",
      icon: CheckCircle2,
      color: "text-emerald-400"
    },
    {
      concept: "Shared Memory Sub-Tiling",
      excel: "Copying active sub-ranges into helper cells via =INDEX(A1:D4, row, col_offset)",
      cuda: "Cooperative load into __shared__ float As[TILE][TILE] and Bs[TILE][TILE] SRAM",
      icon: FileSpreadsheet,
      color: "text-amber-400"
    }
  ];

  // Calculate dot product elements for the selected cell
  const rowA = matrixA[selectedCell.r];
  const colB = matrixB.map((row) => row[selectedCell.c]);
  const productTerms = rowA.map((valA, idx) => ({
    valA,
    valB: colB[idx],
    prod: valA * colB[idx],
    cellA: toExcelCoord(selectedCell.r, idx, 'A'),
    cellB: toExcelCoord(idx, selectedCell.c, 'B')
  }));
  const totalSum = productTerms.reduce((sum, item) => sum + item.prod, 0);

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="glass-card p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-cyan-950/30">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              The Excel Mental Model: Why Spreadsheets Explain GPUs Best
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every cell in a matrix multiplication result $C[i,j]$ is completely independent of every other cell. In Excel, calculating $C[i,j]$ uses the formula <code className="text-cyan-300 font-mono font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">=SUMPRODUCT(Row_i, Col_j)</code>. While a CPU calculates these cells sequentially one after another, a GPU allocates a dedicated hardware thread to <strong>every single cell</strong> to compute all formulas simultaneously!
          </p>
        </div>
      </div>

      {/* Interactive Side-by-Side Mental Model */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Spreadsheet Grid (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Interactive Spreadsheet Workspace</span>
              </h3>
              <span className="text-xs text-slate-400">Click any cell in Matrix C</span>
            </div>

            {/* Matrix Selection Table */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Matrix C = A ✖ B (Click cell to inspect dot product):
                </span>
                <table className="excel-table w-full">
                  <thead>
                    <tr>
                      <th className="excel-th w-8 text-xs"></th>
                      {Array.from({ length: N }).map((_, c) => (
                        <th key={c} className="excel-th text-xs">
                          {String.fromCharCode(65 + c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixA.map((_, r) => (
                      <tr key={r}>
                        <td className="excel-th text-xs font-mono">{r + 1}</td>
                        {matrixB[0].map((_, c) => {
                          const isSelected = selectedCell.r === r && selectedCell.c === c;
                          const cellVal = matrixA[r].reduce(
                            (acc, valA, k) => acc + valA * matrixB[k][c],
                            0
                          );
                          return (
                            <td
                              key={c}
                              onClick={() => setSelectedCell({ r, c })}
                              className={`excel-td font-mono text-xs font-bold cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-cyan-500/40 text-cyan-100 border-2 border-cyan-400 shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/50'
                                  : 'hover:bg-slate-800 text-slate-200'
                              }`}
                            >
                              {cellVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Cell Dot Product Breakdown */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-300">
                    Cell Formula Breakdown for {toExcelCoord(selectedCell.r, selectedCell.c, 'C')}
                  </span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    Sum = {totalSum}
                  </span>
                </div>

                <div className="font-mono text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                  = {productTerms.map((t, i) => (
                    <span key={i}>
                      ({t.valA} × {t.valB}){i < productTerms.length - 1 ? ' + ' : ''}
                    </span>
                  ))} = <strong className="text-emerald-400">{totalSum}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Row Vector A{selectedCell.r + 1}:</span>
                    <span className="font-mono text-cyan-300 font-bold">[{rowA.join(', ')}]</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">
                      Col Vector {String.fromCharCode(65 + selectedCell.c)}:
                    </span>
                    <span className="font-mono text-purple-300 font-bold">[{colB.join(', ')}]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Excel vs CUDA Architectural Translation (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Concept Translation Table: Excel ↔ CUDA GPU</span>
              </h3>
            </div>

            <div className="space-y-3">
              {comparisons.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs font-bold text-slate-200">{item.concept}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                          📊 In Excel:
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{item.excel}</p>
                      </div>

                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block mb-1">
                          ⚡ In CUDA GPU:
                        </span>
                        <p className="text-slate-300 text-[11px] font-mono leading-relaxed">
                          {item.cuda}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
