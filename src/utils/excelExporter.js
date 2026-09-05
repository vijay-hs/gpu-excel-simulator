// In-Browser Excel (.xlsx) Generator and Downloader using XLSX library

import * as XLSX from 'xlsx';

export function exportGpuSimulatorWorkbook(matrixA, matrixB, tileWidth = 2) {
  const wb = XLSX.utils.book_new();
  const N = matrixA.length;

  // --- SHEET 1: 0_GPU_Architecture ---
  const ws0_data = [
    ["GPU ARCHITECTURE & HARDWARE HIERARCHY SIMULATOR", "", "", "", "", "", ""],
    ["Why GPUs excel at Matrix Multiplication: Massive Parallelism + Hierarchical Memory Model", "", "", "", "", "", ""],
    [],
    ["1. CPU vs GPU: The Excel Mental Model", "", "", "2. GPU Memory Hierarchy & Latency", "", "", ""],
    ["CPU Worker (Sequential)", "1 worker filling 1 cell at a time. Loop i: Loop j: cell[i,j] = sumproduct()", "", "Tier", "Location", "Latency", "Bandwidth"],
    ["GPU Army (Massive SIMT)", "10,000 workers where EACH worker computes 1 cell in parallel lockstep!", "", "Registers", "Per Thread", "0-1 cycles", ">30 TB/s"],
    ["", "", "", "Shared Memory (SRAM)", "Per SM Block", "20-30 cycles", "12-19 TB/s"],
    ["", "", "", "L2 Cache", "Cross-SM Chip", "150-200 cycles", "3-5 TB/s"],
    ["", "", "", "Global Memory (VRAM)", "Off-Chip DRAM", "400-800 cycles", "1.0-3.3 TB/s"],
    [],
    ["3. Execution Hierarchy", "", "", "", "", "", ""],
    ["GRID", "Entire kernel launch (e.g. Matrix C 1024x1024). Split into 2D Grid of Blocks."],
    ["THREAD BLOCK", "Group of up to 1024 threads on 1 SM sharing fast SRAM and __syncthreads() barrier."],
    ["WARP", "32 Threads executed in lockstep (SIMT) by the Warp Scheduler."],
    ["THREAD", "Single worker with private registers (float acc=0) computing 1 matrix element."],
    [],
    ["CORE GEMM PROBLEM & TILING SOLUTION:", "", "", "", "", "", ""],
    ["Math FLOPs: 2 * N^3. If every thread reads from DRAM -> 2*N^3 slow reads."],
    [`Tiling in Shared Memory cuts DRAM traffic by ${tileWidth}x (e.g. ${tileWidth}x speedup)!`]
  ];
  const ws0 = XLSX.utils.aoa_to_sheet(ws0_data);
  XLSX.utils.book_append_sheet(wb, ws0, "0_GPU_Architecture");

  // --- SHEET 2: 1_Naive_GEMM ---
  const ws1_data = [
    ["NAIVE GPU MATRIX MULTIPLICATION (1 Thread = 1 Output Element)", "", "", "", "", "", "", "", "", "", ""],
    ["Each thread reads its entire row from A and column from B directly from slow Global VRAM.", "", "", "", "", "", "", "", "", "", ""],
    [],
    ["Matrix A (Global Memory)", "", "", "", "Matrix B (Global Memory)", "", "", "", "Matrix C = A x B (Thread Grid)", "", "", ""]
  ];

  for (let r = 0; r < N; r++) {
    const rowA = matrixA[r];
    const rowB = matrixB[r];
    const rowC = [];
    for (let c = 0; c < N; c++) {
      // Dynamic Excel SUMPRODUCT Formula
      const colLetterB = String.fromCharCode(69 + c); // E is col 5
      const formula = `SUMPRODUCT(A${5+r}:D${5+r}, Matrix_B!${colLetterB}$5:${colLetterB}$${4+N})`;
      rowC.push({ f: formula });
    }
    ws1_data.push([...rowA, "", ...rowB, "", ...rowC]);
  }

  ws1_data.push([]);
  ws1_data.push(["Naive Memory Traffic Stats:"]);
  ws1_data.push(["Total Threads / Elements", N * N]);
  ws1_data.push(["DRAM Reads per Thread", 2 * N]);
  ws1_data.push(["Total DRAM Reads", 2 * N * N * N]);
  ws1_data.push(["Total Math FLOPs", 2 * N * N * N]);
  ws1_data.push(["Arithmetic Intensity", "1.0 FLOP / element read (Memory Bottleneck!)"]);

  const ws1 = XLSX.utils.aoa_to_sheet(ws1_data);
  XLSX.utils.book_append_sheet(wb, ws1, "1_Naive_GEMM");

  // --- SHEET 3: 2_Tiled_Shared_Memory_GEMM ---
  const ws2_data = [
    ["TILED MATRIX MULTIPLICATION (Shared Memory SRAM Cache)", "", "", "", "", "", "", "", "", ""],
    ["Step Controller: Change cell D4 to '1' or '2' to update Shared Memory SRAM buffers!", "", "", "", "", "", "", "", "", ""],
    [],
    ["INTERACTIVE STEP:", 1, "<-- Change this to 1 or 2", "", "", "", "", "", "", ""],
    [],
    ["Matrix A (Global DRAM)", "", "", "", "Matrix B (Global DRAM)", "", "", "", "Shared Mem As (SRAM)", "Shared Mem Bs (SRAM)"]
  ];

  for (let r = 0; r < N; r++) {
    const rowA = matrixA[r];
    const rowB = matrixB[r];
    const sramA = r < tileWidth ? [`=INDEX(A7:D8, ${r+1}, (D4-1)*${tileWidth} + 1)`, `=INDEX(A7:D8, ${r+1}, (D4-1)*${tileWidth} + 2)`] : ["", ""];
    const sramB = r < tileWidth ? [`=INDEX(F7:I10, (D4-1)*${tileWidth} + 1, ${r+1})`, `=INDEX(F7:I10, (D4-1)*${tileWidth} + 2, ${r+1})`] : ["", ""];
    ws2_data.push([...rowA, "", ...rowB, "", sramA[0], sramB[0]]);
  }

  ws2_data.push([]);
  ws2_data.push(["CUDA Execution Steps:"]);
  ws2_data.push(["1. Cooperative Load", "Threads load 1 element each into As[ty][tx] and Bs[ty][tx]"]);
  ws2_data.push(["2. __syncthreads()", "Hardware barrier ensures all SRAM loads complete"]);
  ws2_data.push(["3. Local Compute", "Threads perform multiply-add from 20-cycle SRAM: Pvalue += As[ty][k] * Bs[k][tx]"]);
  ws2_data.push(["4. __syncthreads()", "Barrier before next tile overwrites SRAM"]);
  ws2_data.push(["5. Output Store", "Accumulated Pvalue written to Matrix C in Global VRAM"]);

  const ws2 = XLSX.utils.aoa_to_sheet(ws2_data);
  XLSX.utils.book_append_sheet(wb, ws2, "2_Tiled_Shared_Memory");

  // --- SHEET 4: 3_Warp_&_Thread_Mapping ---
  const ws3_data = [
    ["CUDA THREAD, WARP & BLOCK COORDINATE TRANSLATOR", "", "", "", "", "", ""],
    ["Linear Thread ID", "threadIdx.x", "threadIdx.y", "Warp ID", "Lane ID (0..31)", "Matrix Row", "Matrix Col"]
  ];

  for (let tid = 0; tid < N * N; tid++) {
    const ty = Math.floor(tid / N);
    const tx = tid % N;
    const warpId = Math.floor(tid / 32);
    const laneId = tid % 32;
    ws3_data.push([tid, tx, ty, `Warp ${warpId}`, laneId, `Row ${ty}`, `Col ${tx}`]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(ws3_data);
  XLSX.utils.book_append_sheet(wb, ws3, "3_Warp_&_Thread_Map");

  // --- SHEET 5: 4_Roofline_Performance ---
  const ws4_data = [
    ["ROOFLINE PERFORMANCE & HARDWARE SPECS", "", "", "", "", ""],
    ["GPU Architecture", "FP32 TFLOPs", "Tensor TFLOPs", "Memory Bandwidth", "Ridge Point", "Max Efficiency"],
    ["NVIDIA H100 (Hopper)", 67, 989, "3,350 GB/s", 20.0, "95% (Tensor Cores)"],
    ["NVIDIA A100 (Ampere)", 19.5, 312, "2,039 GB/s", 9.6, "92% (Tensor Cores)"],
    ["NVIDIA RTX 4090 (Ada)", 82.6, 330, "1,008 GB/s", 81.9, "88% (Tiled Shared Mem)"],
    ["NVIDIA V100 (Volta)", 15.7, 125, "900 GB/s", 17.4, "85% (Tiled Shared Mem)"]
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(ws4_data);
  XLSX.utils.book_append_sheet(wb, ws4, "4_Roofline_Model");

  // Trigger Download
  XLSX.writeFile(wb, "GPU_Matrix_Multiplication_Simulator.xlsx");
}
