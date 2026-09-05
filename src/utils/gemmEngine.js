// GEMM Execution & Trace Engine for Tiled & Naive Matrix Multiplication

export function generateTiledExecutionTrace(matrixA, matrixB, tileWidth = 2) {
  const N = matrixA.length;
  const numTiles = Math.floor(N / tileWidth);
  const steps = [];

  // Matrix C result state tracking
  let currentC = Array(N).fill(0).map(() => Array(N).fill(null));
  
  // Per-thread register accumulators [row][col] -> float
  let threadRegisters = Array(N).fill(0).map(() => Array(N).fill(0));

  // Step 0: Grid & Block Initialization
  steps.push({
    id: 0,
    phase: 'INIT',
    title: 'Phase 0: Kernel Launch & Thread Grid Allocation',
    description: `GPU launches Grid of ${Math.ceil(N/tileWidth)}x${Math.ceil(N/tileWidth)} Blocks with ${tileWidth}x${tileWidth} Threads per block (${N*N} total threads running in lockstep).`,
    cudaLine: 2,
    tileIndex: 0,
    kIndex: 0,
    activeTilesA: [],
    activeTilesB: [],
    sharedMemA: Array(tileWidth).fill(0).map(() => Array(tileWidth).fill('-')),
    sharedMemB: Array(tileWidth).fill(0).map(() => Array(tileWidth).fill('-')),
    threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
    matrixC: JSON.parse(JSON.stringify(currentC)),
    stats: {
      dramReads: 0,
      sramReads: 0,
      flops: 0,
      arithmeticIntensity: 0
    }
  });

  let cumulativeDramReads = 0;
  let cumulativeSramReads = 0;
  let cumulativeFlops = 0;

  // Iterate through Tiles
  for (let m = 0; m < numTiles; m++) {
    // 1. Cooperative Load
    const sharedA = Array(tileWidth).fill(0).map(() => Array(tileWidth).fill(0));
    const sharedB = Array(tileWidth).fill(0).map(() => Array(tileWidth).fill(0));
    const activeA = [];
    const activeB = [];

    // Simulate for Block (0,0) as primary visual focus, or across all blocks
    for (let ty = 0; ty < tileWidth; ty++) {
      for (let tx = 0; tx < tileWidth; tx++) {
        const row = ty; // Block 0,0 row
        const col = tx; // Block 0,0 col
        const valA = matrixA[row][m * tileWidth + tx];
        const valB = matrixB[m * tileWidth + ty][col];
        sharedA[ty][tx] = valA;
        sharedB[ty][tx] = valB;
        activeA.push({ r: row, c: m * tileWidth + tx, ty, tx, val: valA });
        activeB.push({ r: m * tileWidth + ty, c: col, ty, tx, val: valB });
      }
    }

    // Total DRAM reads across all N*N threads for this tile step
    cumulativeDramReads += 2 * (N * N * (tileWidth / N));

    steps.push({
      id: steps.length,
      phase: 'LOAD_SRAM',
      title: `Phase 1: Cooperative Load (Tile Step m=${m})`,
      description: `Each thread (tx, ty) loads 1 element from Matrix A and 1 from Matrix B into fast on-chip Shared Memory As[ty][tx] and Bs[ty][tx].`,
      cudaLine: 11,
      tileIndex: m,
      kIndex: 0,
      activeTilesA: activeA,
      activeTilesB: activeB,
      sharedMemA: JSON.parse(JSON.stringify(sharedA)),
      sharedMemB: JSON.parse(JSON.stringify(sharedB)),
      threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
      matrixC: JSON.parse(JSON.stringify(currentC)),
      stats: {
        dramReads: cumulativeDramReads,
        sramReads: cumulativeSramReads,
        flops: cumulativeFlops,
        arithmeticIntensity: cumulativeDramReads > 0 ? (cumulativeFlops / (cumulativeDramReads * 4)).toFixed(2) : 0
      }
    });

    // 2. Barrier Sync 1
    steps.push({
      id: steps.length,
      phase: 'SYNC_BARRIER_1',
      title: `Phase 2: __syncthreads() Barrier (Tile Step m=${m})`,
      description: `Hardware execution barrier forces all threads to wait until every thread finishes loading its SRAM tile.`,
      cudaLine: 13,
      tileIndex: m,
      kIndex: 0,
      activeTilesA: activeA,
      activeTilesB: activeB,
      sharedMemA: JSON.parse(JSON.stringify(sharedA)),
      sharedMemB: JSON.parse(JSON.stringify(sharedB)),
      threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
      matrixC: JSON.parse(JSON.stringify(currentC)),
      stats: {
        dramReads: cumulativeDramReads,
        sramReads: cumulativeSramReads,
        flops: cumulativeFlops,
        arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4)).toFixed(2)
      }
    });

    // 3. Local Compute Loop inside Tile
    for (let k = 0; k < tileWidth; k++) {
      // Update registers across all threads for this k
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const aVal = matrixA[r][m * tileWidth + k];
          const bVal = matrixB[m * tileWidth + k][c];
          threadRegisters[r][c] += aVal * bVal;
        }
      }

      cumulativeSramReads += 2 * (N * N);
      cumulativeFlops += 2 * (N * N); // 1 mul + 1 add = 2 FLOPs per element

      steps.push({
        id: steps.length,
        phase: 'COMPUTE_SRAM',
        title: `Phase 3: Ultra-Fast SRAM Multiply-Add (Tile m=${m}, k=${k})`,
        description: `Threads read As[ty][${k}] and Bs[${k}][tx] from 20-cycle SRAM and accumulate into register: Pvalue += As[ty][${k}] * Bs[${k}][tx]. Zero DRAM latency!`,
        cudaLine: 15,
        tileIndex: m,
        kIndex: k,
        activeTilesA: activeA,
        activeTilesB: activeB,
        activeSramACol: k,
        activeSramBRow: k,
        sharedMemA: JSON.parse(JSON.stringify(sharedA)),
        sharedMemB: JSON.parse(JSON.stringify(sharedB)),
        threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
        matrixC: JSON.parse(JSON.stringify(currentC)),
        stats: {
          dramReads: cumulativeDramReads,
          sramReads: cumulativeSramReads,
          flops: cumulativeFlops,
          arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4)).toFixed(2)
        }
      });
    }

    // 4. Barrier Sync 2
    steps.push({
      id: steps.length,
      phase: 'SYNC_BARRIER_2',
      title: `Phase 4: __syncthreads() Barrier (Tile Step m=${m})`,
      description: `Barrier ensures all threads finish arithmetic operations before the next tile loop iteration overwrites As and Bs.`,
      cudaLine: 17,
      tileIndex: m,
      kIndex: tileWidth - 1,
      activeTilesA: activeA,
      activeTilesB: activeB,
      sharedMemA: JSON.parse(JSON.stringify(sharedA)),
      sharedMemB: JSON.parse(JSON.stringify(sharedB)),
      threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
      matrixC: JSON.parse(JSON.stringify(currentC)),
      stats: {
        dramReads: cumulativeDramReads,
        sramReads: cumulativeSramReads,
        flops: cumulativeFlops,
        arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4)).toFixed(2)
      }
    });
  }

  // 5. Final Output Write to Global Memory C
  currentC = JSON.parse(JSON.stringify(threadRegisters));
  steps.push({
    id: steps.length,
    phase: 'WRITE_GLOBAL',
    title: 'Phase 5: Commit Register Accumulators to Global Matrix C',
    description: `All ${N*N} threads simultaneously write their private register value (Pvalue) to Matrix C in Global VRAM via coalesced memory write transactions.`,
    cudaLine: 19,
    tileIndex: numTiles - 1,
    kIndex: tileWidth - 1,
    activeTilesA: [],
    activeTilesB: [],
    sharedMemA: Array(tileWidth).fill(0).map(() => Array(tileWidth).fill('-')),
    sharedMemB: Array(tileWidth).fill(0).map(() => Array(tileWidth).fill('-')),
    threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
    matrixC: JSON.parse(JSON.stringify(currentC)),
    stats: {
      dramReads: cumulativeDramReads,
      sramReads: cumulativeSramReads,
      flops: cumulativeFlops,
      arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4)).toFixed(2)
    }
  });

  return steps;
}

// Convert 0-indexed row/col to Excel coordinates (e.g. A1, B3, D4)
export function toExcelCoord(row, col, prefix = '') {
  const colLetter = String.fromCharCode(65 + col);
  return `${prefix}${colLetter}${row + 1}`;
}

// Generate Excel Formula string for Matrix C element [r,c]
export function getExcelFormulaForCell(row, col, N) {
  const lastColLetter = String.fromCharCode(65 + N - 1);
  const colLetter = String.fromCharCode(65 + col);
  return `=SUMPRODUCT(A${row + 1}:${lastColLetter}${row + 1}, Matrix_B!${colLetter}$1:${colLetter}$${N})`;
}

// Calculate Naive vs Tiled memory metrics
export function calculateComparisonStats(N, tileWidth = 2) {
  const totalFlops = 2 * N * N * N;
  
  // Naive: each of N*N threads reads 2*N values from DRAM
  const naiveDramReads = 2 * N * N * N;
  const naiveDramBytes = naiveDramReads * 4; // 4 bytes per float
  const naiveArithmeticIntensity = (totalFlops / naiveDramBytes).toFixed(2);

  // Tiled: each element of A and B is loaded into SMEM N/tileWidth times
  const tiledDramReads = (2 * N * N * N) / tileWidth;
  const tiledDramBytes = tiledDramReads * 4;
  const tiledArithmeticIntensity = (totalFlops / tiledDramBytes).toFixed(2);
  const bandwidthReduction = tileWidth;

  return {
    N,
    tileWidth,
    totalFlops,
    naive: {
      dramReads: naiveDramReads,
      dramBytes: naiveDramBytes,
      arithmeticIntensity: naiveArithmeticIntensity
    },
    tiled: {
      dramReads: tiledDramReads,
      dramBytes: tiledDramBytes,
      arithmeticIntensity: tiledArithmeticIntensity,
      speedupFactor: bandwidthReduction
    }
  };
}
