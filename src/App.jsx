import React, { useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import SimulatorView from './components/SimulatorView';
import ExcelMentalModelView from './components/ExcelMentalModelView';
import HardwareArchView from './components/HardwareArchView';
import WarpCoalescingView from './components/WarpCoalescingView';
import RooflineModelView from './components/RooflineModelView';
import { MATRIX_PRESETS } from './data/constants';
import { generateTiledExecutionTrace } from './utils/gemmEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator');
  const [selectedPreset, setSelectedPreset] = useState('4x4');
  const [algorithmMode, setAlgorithmMode] = useState('tiled'); // 'tiled' vs 'naive'

  const currentPresetData = MATRIX_PRESETS[selectedPreset];
  const matrixA = currentPresetData.A;
  const matrixB = currentPresetData.B;
  const tileWidth = currentPresetData.tileWidth;

  // Generate trace for simulation
  const executionTrace = useMemo(() => {
    return generateTiledExecutionTrace(matrixA, matrixB, tileWidth);
  }, [matrixA, matrixB, tileWidth]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        matrixA={matrixA}
        matrixB={matrixB}
        tileWidth={tileWidth}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'simulator' && (
          <SimulatorView
            matrixA={matrixA}
            matrixB={matrixB}
            tileWidth={tileWidth}
            executionTrace={executionTrace}
            selectedPreset={selectedPreset}
            setSelectedPreset={setSelectedPreset}
            algorithmMode={algorithmMode}
            setAlgorithmMode={setAlgorithmMode}
          />
        )}

        {activeTab === 'excel-model' && (
          <ExcelMentalModelView
            matrixA={matrixA}
            matrixB={matrixB}
            tileWidth={tileWidth}
          />
        )}

        {activeTab === 'hardware' && <HardwareArchView />}

        {activeTab === 'warp-coalescing' && <WarpCoalescingView />}

        {activeTab === 'roofline' && <RooflineModelView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>GPU Matrix Multiplication & Architecture Simulator • Excel Mental Model</span>
          <span className="font-mono text-[11px] text-slate-400">
            CUDA 12.x • Tensor Core GEMM • SIMT Warp Scheduling
          </span>
        </div>
      </footer>
    </div>
  );
}
