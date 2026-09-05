// Comprehensive GEMM Engine: Full Grid Block GEMM, Partial Products & Reduction

export function generateTiledExecutionTrace(matrixA, matrixB, tileWidth = 2) {
  const N = matrixA.length;
  const numTiles = Math.floor(N / tileWidth);
  const gridDim = Math.ceil(N / tileWidth); // Number of blocks in each dimension (e.g. 2x2 = 4 blocks)
  const steps = [];

  // Matrix C result state tracking
  let currentC = Array(N).fill(0).map(() => Array(N).fill(null));
  
  // Per-thread register accumulators [row][col] -> float
  let threadRegisters = Array(N).fill(0).map(() => Array(N).fill(0));

  // Track partial products for each tile step m: partialProducts[m][row][col]
  const partialProducts = Array(numTiles).fill(0).map(() => 
    Array(N).fill(0).map(() => Array(N).fill(0))
  );

  // Step 0: Grid & Block Initialization
  steps.push({
    id: 0,
    phase: 'INIT',
    title: 'Phase 0: Kernel Launch & Grid Allocation',
    description: `GPU launches Grid of ${gridDim}x${gridDim} Thread Blocks (${gridDim*gridDim} total blocks). Each block has ${tileWidth}x${tileWidth} threads. Total ${N*N} threads execute in parallel.`,
    cudaLine: 2,
    tileIndex: 0,
    kIndex: 0,
    activeTilesA: [],
    activeTilesB: [],
    blockData: getBlockDataForAllBlocks(matrixA, matrixB, 0, tileWidth, threadRegisters),
    threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
    matrixC: JSON.parse(JSON.stringify(currentC)),
    partialProducts: JSON.parse(JSON.stringify(partialProducts)),
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

  // Iterate through Tiles m = 0 .. numTiles-1
  for (let m = 0; m < numTiles; m++) {
    // 1. Cooperative Load across ALL Thread Blocks
    const activeA = [];
    const activeB = [];

    // Across the entire matrix grid:
    // For Matrix A: all blocks in row by load rows [by*T .. by*T+T-1], cols [m*T .. m*T+T-1]
    // For Matrix B: all blocks in col bx load rows [m*T .. m*T+T-1], cols [bx*T .. bx*T+T-1]
    for (let r = 0; r < N; r++) {
      for (let c = m * tileWidth; c < (m + 1) * tileWidth; c++) {
        activeA.push({ r, c, val: matrixA[r][c] });
      }
    }

    for (let r = m * tileWidth; r < (m + 1) * tileWidth; r++) {
      for (let c = 0; c < N; c++) {
        activeB.push({ r, c, val: matrixB[r][c] });
      }
    }

    // Cumulative DRAM Reads: Each thread in each block reads 1 float from A and 1 float from B
    cumulativeDramReads += 2 * (N * N);

    steps.push({
      id: steps.length,
      phase: 'LOAD_SRAM',
      title: `Phase 1: Cooperative DRAM -> SRAM Load (Tile Step m=${m})`,
      description: `All ${gridDim*gridDim} Thread Blocks cooperatively load their active sub-tiles from Matrix A (cols ${m*tileWidth}..${(m+1)*tileWidth-1}) and Matrix B (rows ${m*tileWidth}..${(m+1)*tileWidth-1}) into on-chip Shared Memory As and Bs.`,
      cudaLine: 11,
      tileIndex: m,
      kIndex: 0,
      activeTilesA: activeA,
      activeTilesB: activeB,
      blockData: getBlockDataForAllBlocks(matrixA, matrixB, m, tileWidth, threadRegisters),
      threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
      matrixC: JSON.parse(JSON.stringify(currentC)),
      partialProducts: JSON.parse(JSON.stringify(partialProducts)),
      stats: {
        dramReads: cumulativeDramReads,
        sramReads: cumulativeSramReads,
        flops: cumulativeFlops,
        arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4 || 1)).toFixed(2)
      }
    });

    // 2. Barrier Sync 1
    steps.push({
      id: steps.length,
      phase: 'SYNC_BARRIER_1',
      title: `Phase 2: __syncthreads() Barrier (Tile Step m=${m})`,
      description: `__syncthreads() hardware barrier ensures all ${N*N} threads finish writing to Shared Memory before any thread reads.`,
      cudaLine: 13,
      tileIndex: m,
      kIndex: 0,
      activeTilesA: activeA,
      activeTilesB: activeB,
      blockData: getBlockDataForAllBlocks(matrixA, matrixB, m, tileWidth, threadRegisters),
      threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
      matrixC: JSON.parse(JSON.stringify(currentC)),
      partialProducts: JSON.parse(JSON.stringify(partialProducts)),
      stats: {
        dramReads: cumulativeDramReads,
        sramReads: cumulativeSramReads,
        flops: cumulativeFlops,
        arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4 || 1)).toFixed(2)
      }
    });

    // 3. Local Compute Loop inside Tile (k = 0 .. tileWidth-1)
    for (let k = 0; k < tileWidth; k++) {
      // Update registers across ALL blocks for this inner index k
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const aVal = matrixA[r][m * tileWidth + k];
          const bVal = matrixB[m * tileWidth + k][c];
          const product = aVal * bVal;
          threadRegisters[r][c] += product;
          partialProducts[m][r][c] += product;
        }
      }

      cumulativeSramReads += 2 * (N * N);
      cumulativeFlops += 2 * (N * N); // 1 Multiply + 1 Add = 2 FLOPs per thread

      steps.push({
        id: steps.length,
        phase: 'COMPUTE_SRAM',
        title: `Phase 3: Multiply-Accumulate in Registers (Tile m=${m}, k=${k})`,
        description: `Each thread performs register accumulation: Pvalue += As[ty][${k}] * Bs[${k}][tx]. Computing partial products from 20-cycle SRAM with zero DRAM latency.`,
        cudaLine: 15,
        tileIndex: m,
        kIndex: k,
        activeTilesA: activeA,
        activeTilesB: activeB,
        activeSramACol: k,
        activeSramBRow: k,
        blockData: getBlockDataForAllBlocks(matrixA, matrixB, m, tileWidth, threadRegisters),
        threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
        matrixC: JSON.parse(JSON.stringify(currentC)),
        partialProducts: JSON.parse(JSON.stringify(partialProducts)),
        stats: {
          dramReads: cumulativeDramReads,
          sramReads: cumulativeSramReads,
          flops: cumulativeFlops,
          arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4 || 1)).toFixed(2)
        }
      });
    }

    // 4. Barrier Sync 2
    steps.push({
      id: steps.length,
      phase: 'SYNC_BARRIER_2',
      title: `Phase 4: __syncthreads() Barrier (Tile Step m=${m})`,
      description: `Barrier ensures all threads finish arithmetic for Tile ${m} before next tile loop overwrites Shared Memory.`,
      cudaLine: 17,
      tileIndex: m,
      kIndex: tileWidth - 1,
      activeTilesA: activeA,
      activeTilesB: activeB,
      blockData: getBlockDataForAllBlocks(matrixA, matrixB, m, tileWidth, threadRegisters),
      threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
      matrixC: JSON.parse(JSON.stringify(currentC)),
      partialProducts: JSON.parse(JSON.stringify(partialProducts)),
      stats: {
        dramReads: cumulativeDramReads,
        sramReads: cumulativeSramReads,
        flops: cumulativeFlops,
        arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4 || 1)).toFixed(2)
      }
    });
  }

  // 5. Final Output Write & Reduction Completion
  currentC = JSON.parse(JSON.stringify(threadRegisters));
  steps.push({
    id: steps.length,
    phase: 'WRITE_GLOBAL',
    title: 'Phase 5: Final Reduction Complete & Global Memory Store',
    description: `Full temporal reduction complete across all tiles (P = Partial_0 + Partial_1 + ...). All ${N*N} threads write their final reduced register values (Pvalue) into Matrix C in Global VRAM.`,
    cudaLine: 19,
    tileIndex: numTiles - 1,
    kIndex: tileWidth - 1,
    activeTilesA: [],
    activeTilesB: [],
    blockData: getBlockDataForAllBlocks(matrixA, matrixB, numTiles - 1, tileWidth, threadRegisters),
    threadRegisters: JSON.parse(JSON.stringify(threadRegisters)),
    matrixC: JSON.parse(JSON.stringify(currentC)),
    partialProducts: JSON.parse(JSON.stringify(partialProducts)),
    stats: {
      dramReads: cumulativeDramReads,
      sramReads: cumulativeSramReads,
      flops: cumulativeFlops,
      arithmeticIntensity: (cumulativeFlops / (cumulativeDramReads * 4 || 1)).toFixed(2)
    }
  });

  return steps;
}

// Helper to extract Shared Memory buffers and thread registers for EVERY thread block (bx, by)
export function getBlockDataForAllBlocks(matrixA, matrixB, tileIndex, tileWidth, threadRegisters) {
  const N = matrixA.length;
  const gridDim = Math.ceil(N / tileWidth);
  const blocks = {};

  for (let by = 0; by < gridDim; by++) {
    for (let bx = 0; bx < gridDim; bx++) {
      const blockKey = `${bx}_${by}`;
      const sharedA = Array(tileWidth).fill(0).map(() => Array(tileWidth).fill(0));
      const sharedB = Array(tileWidth).fill(0).map(() => Array(tileWidth).fill(0));
      const blockRegs = Array(tileWidth).fill(0).map(() => Array(tileWidth).fill(0));

      for (let ty = 0; ty < tileWidth; ty++) {
        for (let tx = 0; tx < tileWidth; tx++) {
          const globalRow = by * tileWidth + ty;
          const globalCol = bx * tileWidth + tx;

          // A tile: row from by slice, col from m slice
          const aCol = tileIndex * tileWidth + tx;
          sharedA[ty][tx] = matrixA[globalRow] ? matrixA[globalRow][aCol] || 0 : 0;

          // B tile: row from m slice, col from bx slice
          const bRow = tileIndex * tileWidth + ty;
          sharedB[ty][tx] = matrixB[bRow] ? matrixB[bRow][globalCol] || 0 : 0;

          blockRegs[ty][tx] = threadRegisters[globalRow] ? threadRegisters[globalRow][globalCol] || 0 : 0;
        }
      }

      blocks[blockKey] = {
        bx,
        by,
        sharedA,
        sharedB,
        registers: blockRegs,
        rowRange: [by * tileWidth, (by + 1) * tileWidth - 1],
        colRange: [bx * tileWidth, (bx + 1) * tileWidth - 1]
      };
    }
  }

  return blocks;
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

// Detailed step-by-step mathematical reduction equation for cell [r,c]
export function getReductionEquationForCell(matrixA, matrixB, row, col, tileWidth = 2) {
  const N = matrixA.length;
  const numTiles = Math.floor(N / tileWidth);
  const tileTerms = [];

  for (let m = 0; m < numTiles; m++) {
    const productsInTile = [];
    let tileSum = 0;
    for (let k = 0; k < tileWidth; k++) {
      const globalK = m * tileWidth + k;
      const valA = matrixA[row][globalK];
      const valB = matrixB[globalK][col];
      const prod = valA * valB;
      tileSum += prod;
      productsInTile.push({ valA, valB, prod, globalK });
    }
    tileTerms.push({
      m,
      products: productsInTile,
      partialSum: tileSum
    });
  }

  const finalTotal = tileTerms.reduce((sum, t) => sum + t.partialSum, 0);

  return {
    row,
    col,
    tileTerms,
    finalTotal
  };
}
