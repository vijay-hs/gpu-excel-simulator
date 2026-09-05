# ⚡ GPU Matrix Engine (GEMM) & Excel Architecture Simulator

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
[![CUDA](https://img.shields.io/badge/CUDA-12.x-76B900.svg)](https://developer.nvidia.com/cuda-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> An educational, interactive visual simulator that demystifies **GPU Hardware Architecture, Warp SIMT Execution, Memory Coalescing, and Tiled Matrix Multiplication (GEMM)** using an intuitive **Excel Spreadsheet Mental Model**.

---

## 🌟 Why Explain GPUs Using Excel?

Every cell in a matrix multiplication result $C[i,j]$ is calculated independently:
$$\text{Formula: } C[i,j] = \sum_{k=0}^{N-1} A[i,k] \times B[k,j]$$

In Excel, this is represented by `=SUMPRODUCT(Row_i, Col_j)`.
- **CPU Mental Model**: 1 clerk computing cells one-by-one in sequential nested loops ($O(N^3)$).
- **GPU Mental Model**: 10,000+ workers where **each worker is assigned to exactly one cell** computing in lockstep parallelism!

```
                 +-------------------------------------------------------------+
                 |                       GPU GLOBAL MEMORY                     |
                 |             (High Latency DRAM - e.g. 80GB VRAM)            |
                 +-------------------------------------------------------------+
                                     |                     ^
                     Tile A (Coop Load)   |                     | Write Result Tile C
                                     v                     |
                 +-------------------------------------------------------------+
                 |             STREAMING MULTIPROCESSOR (SM)                   |
                 |                                                             |
                 |  +-------------------------------------------------------+  |
                 |  |            SHARED MEMORY (SRAM TILE CACHE)            |  |
                 |  |       As[TILE][TILE]              Bs[TILE][TILE]      |  |
                 |  +-------------------------------------------------------+  |
                 |               |                            |                |
                 |               v                            v                |
                 |  +-------------------------------------------------------+  |
                 |  |   WARP SCHEDULERS (32 Threads in Lockstep SIMT)       |  |
                 |  |   Thread (0,0)  Thread (0,1) ... Thread (tx, ty)      |  |
                 |  |   +-----------------------------------------------+   |  |
                 |  |   | REGISTERS: float acc_sum = 0.0f               |   |  |
                 |  |   | MATH: acc_sum += As[ty][k] * Bs[k][tx]        |   |  |
                 |  |   +-----------------------------------------------+   |  |
                 |  |   | CUDA CORES / TENSOR CORES (FP32 Fused Mul-Add)|   |  |
                 |  +-------------------------------------------------------+  |
                 +-------------------------------------------------------------+
```

---

## ✨ Features

### 1. 🖥️ Interactive Web Simulator (Vite + React)
- **Live Cycle Controller**: Step through the 5 phases of Tiled GEMM:
  1. Cooperative Global Memory $\to$ Shared Memory load (`As[ty][tx]`, `Bs[ty][tx]`).
  2. `__syncthreads()` barrier synchronization.
  3. Zero-wait SRAM dot product into per-thread register accumulators.
  4. Barrier sync before next tile overwrite.
  5. Final write transaction into Global Matrix C.
- **Synchronized CUDA Code Panel**: Live line-by-line syntax highlighting mapped directly to the current execution phase.
- **Thread & Cell Inspector**: Click any cell in Matrix C to view its `threadIdx`, `blockIdx`, `warpId`, register status, and memory load addresses.
- **Warp SIMT & Memory Coalescing**: Visualizer comparing 128-byte contiguous memory bursts vs. strided DRAM penalties.
- **Roofline Model**: Dynamic Tile Size slider calculating Arithmetic Intensity for **NVIDIA H100, A100, RTX 4090, and V100**.
- **One-Click Excel Export**: Export the live simulation directly into a formatted `.xlsx` workbook.

### 2. 📊 Standalone Formula-Driven Excel Master Workbook
- Generated via Python (`generate_gpu_excel_simulator.py`).
- 6 interactive sheets featuring native formulas:
  - `0_GPU_Architecture`: Visual layout & latency table (0-cycle registers vs 400-cycle DRAM).
  - `1_Naive_GEMM`: $4 \times 4$ GEMM using `=SUMPRODUCT(...)` formulas highlighting the memory wall.
  - `2_Tiled_Shared_Memory_GEMM`: **Interactive Step Controller** (Cell `D4` changes active SRAM tile dynamically via `=INDEX(...)`).
  - `3_Warp_&_Thread_Mapping`: 2D to 1D thread and warp mapping.
  - `4_Memory_Coalescing`: 128-byte cache line burst visualization.
  - `5_Roofline_Model`: Dynamic Ridge Point calculations.

---

## 🚀 Quick Start

### Running the Web Simulator Locally:
```bash
# Clone the repository
git clone https://github.com/vijay-hs/gpu-excel-simulator.git
cd gpu-excel-simulator

# Install dependencies
npm install

# Start local dev server
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Re-generating the Master Excel File:
```bash
python generate_gpu_excel_simulator.py
```

---

## 🏛️ Memory Hierarchy Comparison

| Memory Tier | Location | Capacity | Latency (Clock Cycles) | Bandwidth | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Registers** | On-Chip (SM) | ~64 KB / SM | **0–1 cycles** | >30 TB/s | Private per Thread |
| **Shared Memory (SRAM)** | On-Chip (SM) | 64–228 KB / SM | **20–30 cycles** | ~12–19 TB/s | Shared in Block |
| **L2 Cache** | On-Die | 32–96 MB | **150–200 cycles** | ~3–5 TB/s | All SMs |
| **Global Memory (VRAM)** | Off-Chip (HBM3/GDDR6X) | 24–80 GB | **400–800 cycles** | 1.0–3.3 TB/s | All Threads |

---

## 📜 License

MIT License. Feel free to use this for educational purposes, university courses, and hardware architecture workshops!
