// Matrix & GPU Hardware Constants

export const MATRIX_PRESETS = {
  '4x4': {
    N: 4,
    tileWidth: 2,
    A: [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 1, 2, 3],
      [4, 5, 6, 7]
    ],
    B: [
      [2, 0, 1, 3],
      [1, 2, 0, 1],
      [3, 1, 2, 0],
      [0, 3, 1, 2]
    ]
  },
  '8x8': {
    N: 8,
    tileWidth: 4,
    A: [
      [1, 2, 3, 4, 2, 1, 0, 3],
      [5, 6, 7, 8, 1, 3, 2, 1],
      [9, 1, 2, 3, 4, 0, 1, 2],
      [4, 5, 6, 7, 2, 1, 3, 0],
      [2, 3, 1, 0, 5, 4, 3, 2],
      [1, 0, 4, 2, 1, 6, 5, 3],
      [3, 2, 1, 5, 0, 2, 4, 1],
      [2, 4, 3, 1, 3, 1, 2, 5]
    ],
    B: [
      [2, 0, 1, 3, 1, 2, 0, 1],
      [1, 2, 0, 1, 3, 0, 2, 1],
      [3, 1, 2, 0, 1, 3, 1, 0],
      [0, 3, 1, 2, 2, 1, 0, 3],
      [1, 2, 3, 0, 1, 0, 2, 1],
      [2, 1, 0, 2, 3, 1, 1, 0],
      [0, 3, 1, 1, 0, 2, 3, 2],
      [3, 0, 2, 1, 1, 2, 0, 1]
    ]
  }
};

export const CUDA_TILED_CODE = [
  { line: 1, text: "#define TILE_WIDTH 16", comment: "Tile dimensions for SRAM" },
  { line: 2, text: "__global__ void tiledMatrixMul(float* A, float* B, float* C, int N) {", comment: "Kernel entry" },
  { line: 3, text: "    __shared__ float As[TILE_WIDTH][TILE_WIDTH];", comment: "Fast on-chip SRAM for A" },
  { line: 4, text: "    __shared__ float Bs[TILE_WIDTH][TILE_WIDTH];", comment: "Fast on-chip SRAM for B" },
  { line: 5, text: "    int bx = blockIdx.x, by = blockIdx.y;", comment: "Block coordinates" },
  { line: 6, text: "    int tx = threadIdx.x, ty = threadIdx.y;", comment: "Thread coordinates in block" },
  { line: 7, text: "    int Row = by * TILE_WIDTH + ty;", comment: "Global matrix row" },
  { line: 8, text: "    int Col = bx * TILE_WIDTH + tx;", comment: "Global matrix col" },
  { line: 9, text: "    float Pvalue = 0.0f;", comment: "Private register accumulator" },
  { line: 10, text: "    for (int m = 0; m < (N / TILE_WIDTH); ++m) {", comment: "Loop over matrix sub-tiles" },
  { line: 11, text: "        As[ty][tx] = A[Row * N + (m * TILE_WIDTH + tx)];", comment: "1. Cooperative load A from DRAM" },
  { line: 12, text: "        Bs[ty][tx] = B[(m * TILE_WIDTH + ty) * N + Col];", comment: "1. Cooperative load B from DRAM" },
  { line: 13, text: "        __syncthreads();", comment: "2. Barrier: wait for all threads" },
  { line: 14, text: "        for (int k = 0; k < TILE_WIDTH; ++k) {", comment: "Local compute loop" },
  { line: 15, text: "            Pvalue += As[ty][k] * Bs[k][tx];", comment: "3. Multiply-accumulate from SRAM" },
  { line: 16, text: "        }", comment: "End local compute" },
  { line: 17, text: "        __syncthreads();", comment: "4. Barrier before next tile overwrite" },
  { line: 18, text: "    }", comment: "End tile loop" },
  { line: 19, text: "    C[Row * N + Col] = Pvalue;", comment: "5. Write final output to Global DRAM" },
  { line: 20, text: "}", comment: "End Kernel" }
];

export const CUDA_NAIVE_CODE = [
  { line: 1, text: "__global__ void naiveMatrixMul(float* A, float* B, float* C, int N) {", comment: "Kernel entry" },
  { line: 2, text: "    int Row = blockIdx.y * blockDim.y + threadIdx.y;", comment: "Calculate global row" },
  { line: 3, text: "    int Col = blockIdx.x * blockDim.x + threadIdx.x;", comment: "Calculate global col" },
  { line: 4, text: "    if (Row < N && Col < N) {", comment: "Boundary check" },
  { line: 5, text: "        float sum = 0.0f;", comment: "Private register accumulator" },
  { line: 6, text: "        for (int k = 0; k < N; ++k) {", comment: "Loop across entire dimension" },
  { line: 7, text: "            sum += A[Row * N + k] * B[k * N + Col];", comment: "❌ Uncached DRAM reads every step!" },
  { line: 8, text: "        }", comment: "End loop" },
  { line: 9, text: "        C[Row * N + Col] = sum;", comment: "Store result to DRAM" },
  { line: 10, text: "    }", comment: "End boundary check" },
  { line: 11, text: "}", comment: "End Kernel" }
];

export const GPU_HARDWARE_SPECS = [
  {
    name: "NVIDIA H100 SXM (Hopper)",
    architecture: "Hopper (GH100)",
    fp32Tflops: 67,
    tensorTflops: 989,
    memBandwidthGBs: 3350,
    memType: "80 GB HBM3",
    smCount: 132,
    cudaCores: 16896,
    tensorCores: 528,
    smemPerSmKB: 228,
    regPerSmKB: 64,
    ridgePoint: 20.0
  },
  {
    name: "NVIDIA A100 SXM (Ampere)",
    architecture: "Ampere (GA100)",
    fp32Tflops: 19.5,
    tensorTflops: 312,
    memBandwidthGBs: 2039,
    memType: "80 GB HBM2e",
    smCount: 108,
    cudaCores: 6912,
    tensorCores: 432,
    smemPerSmKB: 164,
    regPerSmKB: 64,
    ridgePoint: 9.6
  },
  {
    name: "NVIDIA RTX 4090 (Ada Lovelace)",
    architecture: "Ada (AD102)",
    fp32Tflops: 82.6,
    tensorTflops: 330,
    memBandwidthGBs: 1008,
    memType: "24 GB GDDR6X",
    smCount: 128,
    cudaCores: 16384,
    tensorCores: 512,
    smemPerSmKB: 128,
    regPerSmKB: 64,
    ridgePoint: 81.9
  },
  {
    name: "NVIDIA V100 SXM (Volta)",
    architecture: "Volta (GV100)",
    fp32Tflops: 15.7,
    tensorTflops: 125,
    memBandwidthGBs: 900,
    memType: "32 GB HBM2",
    smCount: 80,
    cudaCores: 5120,
    tensorCores: 640,
    smemPerSmKB: 96,
    regPerSmKB: 64,
    ridgePoint: 17.4
  }
];

export const MEMORY_HIERARCHY_LEVELS = [
  {
    name: "Registers",
    scope: "Per Thread",
    latency: "0-1 cycles",
    capacity: "64 KB / SM",
    bandwidth: ">30 TB/s",
    color: "#10B981",
    desc: "Private local storage for each CUDA thread (e.g. accumulator float Pvalue). Zero memory wait states."
  },
  {
    name: "Shared Memory (SRAM)",
    scope: "Per Thread Block (SM)",
    latency: "20-30 cycles",
    capacity: "64 - 228 KB / SM",
    bandwidth: "12 - 19 TB/s",
    color: "#0EA5E9",
    desc: "Ultra-fast on-chip scratchpad SRAM divided into 32 banks. Shared among all threads in a thread block."
  },
  {
    name: "L1 Data Cache",
    scope: "Per SM",
    latency: "20-30 cycles",
    capacity: "Unified with SMEM",
    bandwidth: "12 - 19 TB/s",
    color: "#8B5CF6",
    desc: "Hardware-managed caching for global memory accesses and local spills."
  },
  {
    name: "L2 Cache",
    scope: "Cross-SM (Entire GPU)",
    latency: "150-200 cycles",
    capacity: "32 - 96 MB",
    bandwidth: "3.5 - 6.0 TB/s",
    color: "#F59E0B",
    desc: "Massive shared on-die cache connected via crossbar to all SMs and memory controllers."
  },
  {
    name: "Global Memory (DRAM VRAM)",
    scope: "All Threads / Host",
    latency: "400-800 cycles",
    capacity: "24 - 80 GB",
    bandwidth: "1.0 - 3.3 TB/s",
    color: "#EF4444",
    desc: "Off-chip high-capacity memory (HBM3/GDDR6X). High latency; requires memory coalescing and tiling to avoid pipeline stalls."
  }
];
