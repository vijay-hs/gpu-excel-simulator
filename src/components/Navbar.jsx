import React from 'react';
import { Cpu, FileSpreadsheet, Layers, Zap, Activity, Download, HardDrive, Calculator } from 'lucide-react';
import { exportGpuSimulatorWorkbook } from '../utils/excelExporter';
import confetti from 'canvas-confetti';

export default function Navbar({ activeTab, setActiveTab, matrixA, matrixB, tileWidth }) {
  const tabs = [
    { id: 'simulator', label: 'Interactive GEMM Simulator', icon: Cpu, badge: 'Live Core' },
    { id: 'block-reduction', label: 'Block GEMM & Reduction', icon: Calculator, badge: 'Math Deep Dive' },
    { id: 'excel-model', label: 'Excel Mental Model', icon: FileSpreadsheet, badge: 'Formulas' },
    { id: 'hardware', label: 'GPU Hardware & SM', icon: HardDrive, badge: 'Architecture' },
    { id: 'warp-coalescing', label: 'Warp SIMT & Coalescing', icon: Zap, badge: 'Memory Bus' },
    { id: 'roofline', label: 'Roofline & Specs', icon: Activity, badge: 'Performance' }
  ];

  const handleDownloadExcel = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 }
    });
    exportGpuSimulatorWorkbook(matrixA, matrixB, tileWidth);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
                GPU Matrix Engine
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                Excel Mental Model
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Block GEMM, Partial Products, Register Reduction & CUDA Visualization
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action: Download Excel Workbook */}
        <button
          onClick={handleDownloadExcel}
          className="btn-success text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2"
          title="Download the full interactive multi-sheet Excel simulator (.xlsx)"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel Workbook (.xlsx)</span>
        </button>
      </div>
    </header>
  );
}
