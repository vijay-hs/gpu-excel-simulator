import React, { useState } from 'react';
import { BookOpen, Cpu, Layers, Zap, HardDrive, Users, CheckCircle2, HelpCircle, ArrowRight, ShieldAlert, Sparkles, Building2, FileSpreadsheet } from 'lucide-react';

export default function GpuTerminologyView() {
  const [selectedConcept, setSelectedConcept] = useState('warp');
  const [analogyMode, setAnalogyMode] = useState('office'); // 'office' vs 'excel'

  const concepts = [
    {
      id: 'thread',
      name: 'CUDA Thread',
      swTerm: 'Thread (threadIdx)',
      hwTerm: 'CUDA Core / ALU Execution Lane',
      icon: Users,
      badge: 'Individual Worker',
      color: 'cyan',
      headline: 'The single smallest unit of execution in CUDA software.',
      swDescription: 'A single sequential instruction stream. In code, it has coordinates: `threadIdx.x`, `threadIdx.y`, `threadIdx.z`. It has its own private stack and private register variables (e.g. `float Pvalue = 0.0f;`).',
      hwDescription: 'Executed on a single physical 32-bit Floating Point ALU (CUDA Core) inside a Streaming Multiprocessor. Uses physical 32-bit registers from the SM register file.',
      analogyOffice: 'A single human clerk sitting at a desk with a notebook and pen, calculating 1 specific number.',
      analogyExcel: 'A single cell formula (e.g. cell C12) calculating its value in isolation.',
      codeSnippet: 'int tx = threadIdx.x;\nint ty = threadIdx.y;\nfloat my_reg = 0.0f; // Private register'
    },
    {
      id: 'warp',
      name: 'Warp (32 Threads)',
      swTerm: 'Warp (Implicit / SIMT)',
      hwTerm: 'Warp Scheduler & 32-Lane SIMT Vector Unit',
      icon: Zap,
      badge: 'Hardware Unit (32 Threads)',
      color: 'purple',
      headline: 'The fundamental physical execution unit on NVIDIA GPUs (32 threads in lockstep).',
      swDescription: 'CUDA programs write code from the perspective of 1 thread, but hardware ALWAYS bundles 32 consecutive threads (Lane 0 to 31) into a Warp. All 32 threads execute the EXACT SAME instruction at the EXACT SAME clock cycle (SIMT).',
      hwDescription: 'The SM Warp Scheduler issues 1 instruction per cycle to 32 parallel execution lanes. If threads branch (`if/else`), the warp must serialize both branches (Warp Divergence), cutting performance in half.',
      analogyOffice: 'A 32-person Olympic rowing crew. Everyone rows their oar in unison to the same drumbeat. If 1 person needs to stop, all 32 pause.',
      analogyExcel: 'A SIMD vector calculation processing 32 adjacent rows simultaneously on 1 CPU vector instruction.',
      codeSnippet: '// 32 threads execute this line simultaneously in 1 cycle:\nfloat val = __shfl_sync(0xFFFFFFFF, my_reg, 0);'
    },
    {
      id: 'block',
      name: 'Thread Block (CTA)',
      swTerm: 'Thread Block (blockIdx, blockDim)',
      hwTerm: 'Resident on 1 Streaming Multiprocessor (SM)',
      icon: Layers,
      badge: 'Cooperative Team',
      color: 'emerald',
      headline: 'A group of up to 1024 threads that can cooperate and share on-chip SRAM.',
      swDescription: 'Programmed with 1D, 2D, or 3D dimensions (e.g. `dim3 block(16, 16)` = 256 threads). Threads inside the same block can share `__shared__` memory and synchronize execution barriers using `__syncthreads()`.',
      hwDescription: 'A Thread Block is assigned to EXACTLY ONE Streaming Multiprocessor (SM) for its entire lifetime. It cannot be split across multiple SMs. (An SM can host multiple blocks if resources permit).',
      analogyOffice: 'A specialized department room (e.g., Accounting Department) with 256 clerks sharing a giant dry-erase whiteboard (Shared Memory).',
      analogyExcel: 'A 2D sub-matrix tile (e.g. range A1:B2) whose cells cooperatively compute partial products.',
      codeSnippet: '__shared__ float As[16][16]; // Shared by this block only\n__syncthreads();              // All threads in block wait here'
    },
    {
      id: 'sm',
      name: 'Streaming Multiprocessor (SM)',
      swTerm: 'Execution Hardware Host',
      hwTerm: 'Physical SM Core (The "CPU Core" of GPUs)',
      icon: Cpu,
      badge: 'Hardware Super-Core',
      color: 'amber',
      headline: 'The independent processing engine on the GPU chip containing Cores, Schedulers, and SRAM.',
      swDescription: 'CUDA software does not directly name an SM; the CUDA runtime hardware scheduler automatically distributes Thread Blocks across available SMs.',
      hwDescription: 'A modern NVIDIA SM (Hopper/Ada) contains 128 CUDA FP32 Cores, 4 Tensor Cores, 4 Warp Schedulers, 64KB Register File, and up to 228KB Shared Memory/L1 cache. A full GPU chip has 80 to 144 SMs.',
      analogyOffice: 'An entire office floor with 4 department managers (Warp Schedulers), 128 desks (ALUs), and a dedicated breakroom/whiteboard (SRAM).',
      analogyExcel: 'A multi-core calculation engine processing an entire sheet of formulas simultaneously.',
      codeSnippet: '// NVIDIA H100 GPU = 132 SMs\n// NVIDIA RTX 4090 = 128 SMs\n// NVIDIA A100 = 108 SMs'
    },
    {
      id: 'grid',
      name: 'Grid (Kernel Launch)',
      swTerm: 'Grid (gridDim)',
      hwTerm: 'Full GPU Chip (All SMs + VRAM)',
      icon: HardDrive,
      badge: 'Global Problem Space',
      color: 'rose',
      headline: 'The entire problem space for a kernel launch containing all Thread Blocks.',
      swDescription: 'When calling `myKernel<<<gridDim, blockDim>>>(...)`, the Grid defines all blocks needed to compute the entire matrix or dataset (e.g. a 4096x4096 matrix).',
      hwDescription: 'The GPU GigaThread Engine dispatches the blocks of the grid across all available SMs on the chip. Data is read from and written to Global Memory (DRAM VRAM).',
      analogyOffice: 'The entire Global Enterprise headquarters with 100+ department floors working on a multi-million-row corporate balance sheet.',
      analogyExcel: 'The entire master Excel spreadsheet with 1,000,000 rows calculated in parallel.',
      codeSnippet: 'dim3 grid(64, 64);   // 4096 Thread Blocks\ndim3 block(16, 16);  // 256 Threads per Block\nmatrixMulKernel<<<grid, block>>>(d_A, d_B, d_C, 1024);'
    }
  ];

  const currentConcept = concepts.find((c) => c.id === selectedConcept) || concepts[0];

  const faqs = [
    {
      q: "Why is a Warp 32 threads and not 16 or 64?",
      a: "NVIDIA hardware engineers designed the SIMT instruction pipeline around 32 lanes. 32 is the optimal sweet spot balancing instruction decode overhead, transistor area, and memory coalescing bus width (32 threads × 4 bytes = 128-byte cache line transaction)."
    },
    {
      q: "Can a single Thread Block be split across two different SMs?",
      a: "NO! A Thread Block is guaranteed to execute on EXACTLY ONE SM. This fundamental hardware rule allows threads in the same block to share ultra-fast on-chip SRAM (Shared Memory) and synchronize using zero-latency hardware barriers (__syncthreads)."
    },
    {
      q: "What is the difference between a CUDA Core and a CPU Core?",
      a: "A CPU Core is large, complex, heavily branched, with massive out-of-order execution, branch predictors, and huge L3 caches (optimized for low latency on 1 sequential thread). A CUDA Core is a streamlined ALU (Arithmetic Logic Unit) designed to execute math operations (Multiply-Add) in lockstep across thousands of parallel threads."
    },
    {
      q: "What is Warp Divergence?",
      a: "Because all 32 threads in a Warp share 1 Program Counter, if you write `if (threadIdx.x < 16) { ... } else { ... }`, the hardware must execute the IF path with 16 threads active (and 16 disabled), then execute the ELSE path with the other 16 active! Both paths run sequentially, doubling execution time."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              GPU Terminology & Hardware Mapping Guide
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The secret to mastering GPUs is understanding the dual relationship between the <strong>Software Programming Model</strong> (Thread, Block, Grid) and the <strong>Physical Silicon Hardware</strong> (CUDA Core, Warp, SM, GPU Chip).
          </p>
        </div>
      </div>

      {/* The Master Translation Rosetta Stone Table */}
      <div className="glass-card p-5 border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>The GPU Rosetta Stone: Software ↔ Hardware ↔ Analogy Mapping</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400">
                <th className="p-3 font-bold text-cyan-400">Hierarchy Level</th>
                <th className="p-3 font-bold text-blue-400">💻 Software (CUDA Code)</th>
                <th className="p-3 font-bold text-purple-400">⚙️ Physical Hardware</th>
                <th className="p-3 font-bold text-emerald-400">🏢 Office Analogy</th>
                <th className="p-3 font-bold text-amber-400">📊 Excel Spreadsheet Analogy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-900/50 transition-all">
                <td className="p-3 font-bold text-slate-200">1. Thread</td>
                <td className="p-3 text-cyan-300">threadIdx.x, y, z</td>
                <td className="p-3 text-purple-300">1 CUDA Core (ALU)</td>
                <td className="p-3 font-sans text-slate-300">1 Worker at a desk</td>
                <td className="p-3 font-sans text-slate-300">1 Cell formula (=SUMPRODUCT)</td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition-all">
                <td className="p-3 font-bold text-slate-200">2. Warp</td>
                <td className="p-3 text-cyan-300">Warp (32 threads implicit)</td>
                <td className="p-3 text-purple-300">32-Lane SIMT Vector Unit</td>
                <td className="p-3 font-sans text-slate-300">32-Person rowing crew (1 beat)</td>
                <td className="p-3 font-sans text-slate-300">32-wide SIMD vector slice</td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition-all">
                <td className="p-3 font-bold text-slate-200">3. Thread Block</td>
                <td className="p-3 text-cyan-300">blockIdx, blockDim (CTA)</td>
                <td className="p-3 text-purple-300">Resident on 1 SM (+ SRAM)</td>
                <td className="p-3 font-sans text-slate-300">Department sharing whiteboard</td>
                <td className="p-3 font-sans text-slate-300">2D Tile subgrid (e.g. A1:B2)</td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition-all">
                <td className="p-3 font-bold text-slate-200">4. Streaming Multiprocessor</td>
                <td className="p-3 text-cyan-300">Hardware Host (Automatic)</td>
                <td className="p-3 text-purple-300">SM Super-Core (128 ALUs)</td>
                <td className="p-3 font-sans text-slate-300">Entire office floor</td>
                <td className="p-3 font-sans text-slate-300">1 Multi-threaded calc engine</td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition-all">
                <td className="p-3 font-bold text-slate-200">5. Grid</td>
                <td className="p-3 text-cyan-300">gridDim.x, y, z</td>
                <td className="p-3 text-purple-300">Entire GPU Chip (All SMs)</td>
                <td className="p-3 font-sans text-slate-300">Entire Global Enterprise</td>
                <td className="p-3 font-sans text-slate-300">The entire master Workbook</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Concept Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Concept Selector Tabs (4 Cols) */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select a Concept to Explore:
          </span>
          {concepts.map((c) => {
            const isSelected = selectedConcept === c.id;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedConcept(c.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {c.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {c.swTerm}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400">
                  {c.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Detailed Breakdown Card (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-card p-6 border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{currentConcept.name}</span>
                  <span className="text-xs px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full font-mono">
                    {currentConcept.badge}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">{currentConcept.headline}</p>
              </div>

              {/* Analogy Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setAnalogyMode('office')}
                  className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
                    analogyMode === 'office'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Office Analogy</span>
                </button>
                <button
                  onClick={() => setAnalogyMode('excel')}
                  className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
                    analogyMode === 'excel'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel Analogy</span>
                </button>
              </div>
            </div>

            {/* Software vs Hardware Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-blue-900/30 space-y-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💻 Software Abstraction (CUDA)</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentConcept.swDescription}
                </p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-purple-900/30 space-y-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚙️ Hardware Reality (Silicon)</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentConcept.hwDescription}
                </p>
              </div>
            </div>

            {/* Analogy Box */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-4 rounded-xl border border-emerald-900/30 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💡 Mental Model Analogy ({analogyMode === 'office' ? 'Office Organization' : 'Excel Spreadsheet'}):</span>
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {analogyMode === 'office' ? currentConcept.analogyOffice : currentConcept.analogyExcel}
              </p>
            </div>

            {/* CUDA Code Snippet */}
            <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono block">Code Example:</span>
              <pre className="font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre">
                {currentConcept.codeSnippet}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions / Confusion Busters */}
      <div className="glass-card p-6 border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>GPU Confusion Busters: The Most Common Questions Answered</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{faq.q}</span>
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
