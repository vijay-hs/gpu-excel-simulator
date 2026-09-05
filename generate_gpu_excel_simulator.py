"""
GPU & Matrix Multiplication (GEMM) Interactive Excel Simulator Generator
Generates a multi-sheet, richly formatted, formula-driven Excel workbook
explaining GPU Architecture, Naive vs Tiled Matrix Multiplication, Shared Memory,
Warps, Memory Coalescing, and the Roofline Model.
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def create_gpu_simulator_workbook(filename="GPU_Matrix_Multiplication_Simulator.xlsx"):
    wb = openpyxl.Workbook()
    # Remove default sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    # Common Styles & Palette
    FONT_FAMILY = "Segoe UI"
    
    # Palette
    NAVY_HEADER = "1E293B"      # Dark slate blue
    CYAN_ACCENT = "0EA5E9"      # Cyan
    PURPLE_ACCENT = "8B5CF6"    # Purple
    EMERALD_ACCENT = "10B981"   # Emerald
    AMBER_ACCENT = "F59E0B"     # Amber
    LIGHT_BG = "F8FAFC"         # Light slate
    CARD_BG = "F1F5F9"          # Card background
    BORDER_COLOR = "CBD5E1"     # Border light
    DARK_BORDER = "64748B"

    # Style Helpers
    def header_font(size=14, bold=True, color="FFFFFF"):
        return Font(name=FONT_FAMILY, size=size, bold=bold, color=color)
    
    def regular_font(size=11, bold=False, color="1E293B", italic=False):
        return Font(name=FONT_FAMILY, size=size, bold=bold, color=color, italic=italic)
    
    def fill(hex_color):
        return PatternFill(start_color=hex_color, end_color=hex_color, fill_type="solid")
    
    def thin_border():
        thin = Side(border_style="thin", color=BORDER_COLOR)
        return Border(left=thin, right=thin, top=thin, bottom=thin)

    def medium_border(color=DARK_BORDER):
        med = Side(border_style="medium", color=color)
        return Border(left=med, right=med, top=med, bottom=med)

    def center_align(wrap=False):
        return Alignment(horizontal="center", vertical="center", wrap_text=wrap)

    def left_align(wrap=False):
        return Alignment(horizontal="left", vertical="center", wrap_text=wrap)

    # -------------------------------------------------------------
    # SHEET 1: 0_Architecture_Overview
    # -------------------------------------------------------------
    ws0 = wb.create_sheet(title="0_GPU_Architecture")
    ws0.views.sheetView[0].showGridLines = True

    # Title Banner
    ws0.merge_cells("A1:N2")
    title_cell = ws0["A1"]
    title_cell.value = "  GPU ARCHITECTURE & HARDWARE HIERARCHY SIMULATOR"
    title_cell.font = header_font(size=16, bold=True, color="FFFFFF")
    title_cell.fill = fill(NAVY_HEADER)
    title_cell.alignment = left_align()

    # Subtitle
    ws0.merge_cells("A3:N3")
    sub_cell = ws0["A3"]
    sub_cell.value = "Why GPUs excel at Matrix Multiplication: Massive Parallelism + Hierarchical Memory Model"
    sub_cell.font = regular_font(size=11, italic=True, color="475569")
    sub_cell.alignment = left_align()

    # Section 1: CPU vs GPU Mental Model in Excel
    ws0.merge_cells("A5:F5")
    ws0["A5"].value = "  1. CPU vs GPU: The Excel Mental Model"
    ws0["A5"].font = header_font(size=12, bold=True, color="FFFFFF")
    ws0["A5"].fill = fill(CYAN_ACCENT)

    cards = [
        ("A6:F7", "CPU Mental Model (Sequential Worker)", 
         "Imagine 1 person sitting at Excel filling 1 cell at a time with a formula:\nfor i in 1..M: for j in 1..N: cell[i,j] = sumproduct(row_i, col_j).\nHigh clock speed (5 GHz), huge L3 cache, but only 8-16 workers."),
        ("A9:F10", "GPU Mental Model (Massive Parallel Army)", 
         "Imagine 10,000 workers where EACH WORKER is assigned to EXACTLY ONE CELL!\nAll workers calculate their cell's formula at the EXACT same instant in lockstep.\nModerate clock speed (1.8-2.5 GHz), but massive throughput (thousands of ALUs).")
    ]

    for cell_range, title, desc in cards:
        ws0.merge_cells(cell_range)
        top_left = ws0[cell_range.split(":")[0]]
        top_left.value = f"• {title}\n{desc}"
        top_left.font = regular_font(size=10, color="1E293B")
        top_left.fill = fill(CARD_BG)
        top_left.alignment = left_align(wrap=True)
        top_left.border = thin_border()

    # Section 2: GPU Memory Hierarchy Table
    ws0.merge_cells("H5:N5")
    ws0["H5"].value = "  2. GPU Memory Hierarchy & Latency (The Memory Wall)"
    ws0["H5"].font = header_font(size=12, bold=True, color="FFFFFF")
    ws0["H5"].fill = fill(PURPLE_ACCENT)

    headers_mem = ["Memory Tier", "Location", "Capacity", "Latency (Cycles)", "Bandwidth", "Scope"]
    for col_idx, h in enumerate(headers_mem, start=8):
        c = ws0.cell(row=6, column=col_idx, value=h)
        c.font = regular_font(size=10, bold=True, color="FFFFFF")
        c.fill = fill("334155")
        c.alignment = center_align()
        c.border = thin_border()

    mem_rows = [
        ("Registers", "On-Chip (Thread)", "~64 KB / SM", "0-1 cycles", "Ultra (>30 TB/s)", "Private per Thread"),
        ("Shared Memory (SRAM)", "On-Chip (SM)", "64-228 KB / SM", "20-30 cycles", "~12-19 TB/s", "Shared in Block"),
        ("L1 Cache", "On-Chip (SM)", "Integrated w/ SMEM", "20-30 cycles", "~12-19 TB/s", "SM / Streaming"),
        ("L2 Cache", "On-Chip (Cross-SM)", "32-96 MB (Chip)", "150-200 cycles", "~3-5 TB/s", "All SMs on GPU"),
        ("Global Memory (VRAM)", "Off-Chip (HBM3/GDDR6X)", "24-80 GB", "400-800 cycles", "1.0 - 3.3 TB/s", "Global (All Threads)")
    ]

    for r_idx, row_data in enumerate(mem_rows, start=7):
        for c_idx, val in enumerate(row_data, start=8):
            c = ws0.cell(row=r_idx, column=c_idx, value=val)
            c.font = regular_font(size=9.5)
            c.border = thin_border()
            c.alignment = center_align() if c_idx in [10, 11, 12] else left_align()
            if r_idx % 2 == 1:
                c.fill = fill(LIGHT_BG)

    # Section 3: Thread & Execution Hierarchy Diagram
    ws0.merge_cells("A12:N12")
    ws0["A12"].value = "  3. Execution Hierarchy: Grid -> Thread Blocks -> Warps -> Threads"
    ws0["A12"].font = header_font(size=12, bold=True, color="FFFFFF")
    ws0["A12"].fill = fill(EMERALD_ACCENT)

    hierarchy_steps = [
        ("A13:C15", "GRID (Kernel Launch)", "The entire problem space.\ne.g. Matrix C (1024x1024).\nDivided into a 2D grid of Blocks:\n(gridDim.x, gridDim.y)", "0284C7"),
        ("D13:F15", "THREAD BLOCK (CTA)", "A group of up to 1024 threads.\nAssigned to 1 SM.\nShare fast SRAM (Shared Memory)\nSynchronize via __syncthreads()", "2563EB"),
        ("G13:J15", "WARP (Hardware Unit)", "32 Threads executed in LOCKSTEP (SIMT).\nWarp Scheduler dispatches 1 instruction for all 32 threads simultaneously.\nBranches (if/else) cause Warp Divergence.", "7C3AED"),
        ("K13:N15", "THREAD (Worker)", "Single execution stream.\nHas private Registers (float acc=0).\nComputes 1 element of Matrix C\nCoordinates: (threadIdx.x, threadIdx.y)", "059669")
    ]

    for cell_range, title, desc, col_fill in hierarchy_steps:
        ws0.merge_cells(cell_range)
        c = ws0[cell_range.split(":")[0]]
        c.value = f"【 {title} 】\n\n{desc}"
        c.font = regular_font(size=9.5, bold=False, color="FFFFFF")
        c.fill = fill(col_fill)
        c.alignment = left_align(wrap=True)
        c.border = medium_border(DARK_BORDER)

    # Key Takeaway Box
    ws0.merge_cells("A17:N19")
    takeaway = ws0["A17"]
    takeaway.value = (
        "💡 THE CORE PROBLEM OF MATRIX MULTIPLICATION (GEMM) ON GPU:\n"
        "To calculate C = A x B for size N x N:\n"
        "• Total Math Operations: 2 * N^3 FLOPs (Multiply-Adds).\n"
        "• If every thread reads directly from Global Memory (DRAM): 2 * N^3 reads from slow 400-cycle memory!\n"
        "• Solution -> TILING IN SHARED MEMORY: Load a tile into on-chip SRAM once, reuse it TILE_SIZE times, cutting memory traffic by TILE_SIZE (e.g. 16x - 32x speedup)!"
    )
    takeaway.font = regular_font(size=10.5, bold=True, color="1E293B")
    takeaway.fill = fill("FEF3C7") # Warm yellow
    takeaway.alignment = left_align(wrap=True)
    takeaway.border = medium_border(AMBER_ACCENT)

    # -------------------------------------------------------------
    # SHEET 2: 1_Naive_GEMM
    # -------------------------------------------------------------
    ws1 = wb.create_sheet(title="1_Naive_GEMM")
    ws1.views.sheetView[0].showGridLines = True

    # Header
    ws1.merge_cells("A1:L2")
    ws1["A1"].value = "  NAIVE GPU MATRIX MULTIPLICATION (1 Thread = 1 Output Element)"
    ws1["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws1["A1"].fill = fill("DC2626") # Red accent for naive/unoptimized
    ws1["A1"].alignment = left_align()

    ws1.merge_cells("A3:L3")
    ws1["A3"].value = "In Naive GEMM, each thread (tx, ty) loads its ENTIRE ROW from Matrix A and ENTIRE COLUMN from Matrix B from Global VRAM."
    ws1["A3"].font = regular_font(size=10.5, italic=True, color="475569")

    # Matrices Layout: 4x4 Example
    ws1.merge_cells("B5:E5")
    ws1["B5"].value = "Matrix A (Global Memory)"
    ws1["B5"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws1["B5"].fill = fill(CYAN_ACCENT)
    ws1["B5"].alignment = center_align()

    matA_data = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 1, 2, 3],
        [4, 5, 6, 7]
    ]

    for r in range(4):
        for c in range(4):
            cell = ws1.cell(row=6+r, column=2+c, value=matA_data[r][c])
            cell.font = regular_font(size=11, bold=True)
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("E0F2FE")

    # Matrix B (4x4) at G6:J9
    ws1.merge_cells("G5:J5")
    ws1["G5"].value = "Matrix B (Global Memory)"
    ws1["G5"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws1["G5"].fill = fill(PURPLE_ACCENT)
    ws1["G5"].alignment = center_align()

    matB_data = [
        [2, 0, 1, 3],
        [1, 2, 0, 1],
        [3, 1, 2, 0],
        [0, 3, 1, 2]
    ]

    for r in range(4):
        for c in range(4):
            cell = ws1.cell(row=6+r, column=7+c, value=matB_data[r][c])
            cell.font = regular_font(size=11, bold=True)
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("F3E8FF")

    # Operator 'X'
    ws1["F7"].value = "✖"
    ws1["F7"].font = header_font(size=16, bold=True, color="1E293B")
    ws1["F7"].alignment = center_align()

    # Operator '='
    ws1["K7"].value = "➡"
    ws1["K7"].font = header_font(size=16, bold=True, color="1E293B")
    ws1["K7"].alignment = center_align()

    # Matrix C (4x4) at L6:O9 with Live Formulas
    ws1.merge_cells("L5:O5")
    ws1["L5"].value = "Matrix C = A x B (Thread Grid)"
    ws1["L5"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws1["L5"].fill = fill(EMERALD_ACCENT)
    ws1["L5"].alignment = center_align()

    for r in range(4):
        for c in range(4):
            row_idx = 6 + r
            col_idx = 12 + c
            col_letter_b = get_column_letter(7 + c)
            formula = f"=SUMPRODUCT(B{row_idx}:E{row_idx}, {col_letter_b}$6:{col_letter_b}$9)"
            cell = ws1.cell(row=row_idx, column=col_idx, value=formula)
            cell.font = regular_font(size=11, bold=True, color="065F46")
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("D1FAE5")

    # Performance & Memory Traffic Analysis Table
    ws1.merge_cells("A12:G12")
    ws1["A12"].value = "  Naive Memory Bandwidth Breakdown (N = 4)"
    ws1["A12"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws1["A12"].fill = fill("475569")

    metrics_naive = [
        ("Number of Output Elements (Threads)", "16 threads", "4 x 4 elements"),
        ("Reads from Global Memory per Thread", "8 reads (4 from A + 4 from B)", "2 * N reads per thread"),
        ("Total Global Memory Reads (All Threads)", "=16*8", "128 DRAM reads for just 4x4 matrix!"),
        ("Arithmetic Floating Point Ops (FLOPs)", "=2*4*4*4", "2 * N^3 = 128 FLOPs"),
        ("Arithmetic Intensity (FLOPs / DRAM Read)", "=128/128", "1.0 FLOP / element loaded (Extremely Memory Bound!)"),
        ("Cache / Memory Reuse Factor", "0x (None)", "Every thread redundantly re-reads the exact same rows & columns")
    ]

    for idx, (label, val, note) in enumerate(metrics_naive, start=13):
        ws1.merge_cells(f"A{idx}:C{idx}")
        c1 = ws1[f"A{idx}"]
        c1.value = label
        c1.font = regular_font(size=10, bold=True)
        c1.border = thin_border()
        c1.fill = fill(LIGHT_BG)

        ws1.merge_cells(f"D{idx}:E{idx}")
        c2 = ws1[f"D{idx}"]
        c2.value = val
        c2.font = regular_font(size=10, bold=True, color="DC2626")
        c2.border = thin_border()
        c2.alignment = center_align()

        ws1.merge_cells(f"F{idx}:J{idx}")
        c3 = ws1[f"F{idx}"]
        c3.value = note
        c3.font = regular_font(size=9.5, italic=True, color="475569")
        c3.border = thin_border()

    # Naive CUDA Code Snippet
    ws1.merge_cells("A21:L28")
    cuda_naive_code = (
        "// NAIVE CUDA KERNEL (Why it is slow: Low Arithmetic Intensity)\n"
        "__global__ void naiveMatrixMul(const float* A, const float* B, float* C, int N) {\n"
        "    int row = blockIdx.y * blockDim.y + threadIdx.y; // Output row index\n"
        "    int col = blockIdx.x * blockDim.x + threadIdx.x; // Output col index\n"
        "    if (row < N && col < N) {\n"
        "        float sum = 0.0f;\n"
        "        for (int k = 0; k < N; ++k) {\n"
        "            sum += A[row * N + k] * B[k * N + col]; // ❌ 2 Global Memory reads per loop iteration!\n"
        "        }\n"
        "        C[row * N + col] = sum;\n"
        "    }\n"
        "}"
    )
    ws1["A21"].value = cuda_naive_code
    ws1["A21"].font = Font(name="Consolas", size=9.5, color="F8FAFC")
    ws1["A21"].fill = fill("0F172A")
    ws1["A21"].alignment = left_align(wrap=True)

    # -------------------------------------------------------------
    # SHEET 3: 2_Tiled_Shared_Memory_GEMM (Interactive Simulator)
    # -------------------------------------------------------------
    ws2 = wb.create_sheet(title="2_Tiled_Shared_Memory_GEMM")
    ws2.views.sheetView[0].showGridLines = True

    # Title
    ws2.merge_cells("A1:P2")
    ws2["A1"].value = "  TILED MATRIX MULTIPLICATION IN SHARED MEMORY (The Standard CUDA Optimization)"
    ws2["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws2["A1"].fill = fill(CYAN_ACCENT)
    ws2["A1"].alignment = left_align()

    # Step Controller Box
    ws2.merge_cells("A4:C4")
    ws2["A4"].value = "🎮 INTERACTIVE STEP:"
    ws2["A4"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws2["A4"].fill = fill(PURPLE_ACCENT)
    ws2["A4"].alignment = center_align()

    ws2["D4"].value = 1
    ws2["D4"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws2["D4"].fill = fill("7C3AED")
    ws2["D4"].alignment = center_align()
    ws2["D4"].border = medium_border("4C1D95")

    ws2.merge_cells("E4:N4")
    ws2["E4"].value = "⬅ Change cell D4 to '1' (Tile Step 0: k=0..1) or '2' (Tile Step 1: k=2..3). Watch Shared Memory buffers update!"
    ws2["E4"].font = regular_font(size=10.5, bold=True, color="6D28D9")
    ws2["E4"].alignment = left_align()

    # Global Matrix A & B (4x4)
    ws2.merge_cells("A6:D6")
    ws2["A6"].value = "Matrix A (Global Memory)"
    ws2["A6"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["A6"].fill = fill("334155")
    ws2["A6"].alignment = center_align()

    for r in range(4):
        for c in range(4):
            cell = ws2.cell(row=7+r, column=1+c, value=matA_data[r][c])
            cell.font = regular_font(size=10.5, bold=True)
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("F1F5F9")

    ws2.merge_cells("F6:I6")
    ws2["F6"].value = "Matrix B (Global Memory)"
    ws2["F6"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["F6"].fill = fill("334155")
    ws2["F6"].alignment = center_align()

    for r in range(4):
        for c in range(4):
            cell = ws2.cell(row=7+r, column=6+c, value=matB_data[r][c])
            cell.font = regular_font(size=10.5, bold=True)
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("F1F5F9")

    # Shared Memory Buffers (TILE_SIZE = 2x2)
    ws2.merge_cells("K6:L6")
    ws2["K6"].value = "As (SMEM SRAM)"
    ws2["K6"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["K6"].fill = fill(CYAN_ACCENT)
    ws2["K6"].alignment = center_align()

    # Formula for As using INDEX based on Step in D4
    for r in range(2):
        for c in range(2):
            row_idx = 7 + r
            col_idx = 11 + c
            formula = f"=INDEX($A$7:$D$8, {r+1}, ($D$4-1)*2 + {c+1})"
            cell = ws2.cell(row=row_idx, column=col_idx, value=formula)
            cell.font = header_font(size=11, bold=True, color="0369A1")
            cell.alignment = center_align()
            cell.border = medium_border(CYAN_ACCENT)
            cell.fill = fill("E0F2FE")

    ws2.merge_cells("N6:O6")
    ws2["N6"].value = "Bs (SMEM SRAM)"
    ws2["N6"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["N6"].fill = fill(PURPLE_ACCENT)
    ws2["N6"].alignment = center_align()

    for r in range(2):
        for c in range(2):
            row_idx = 7 + r
            col_idx = 14 + c
            formula = f"=INDEX($F$7:$I$10, ($D$4-1)*2 + {r+1}, {c+1})"
            cell = ws2.cell(row=row_idx, column=col_idx, value=formula)
            cell.font = header_font(size=11, bold=True, color="6D28D9")
            cell.alignment = center_align()
            cell.border = medium_border(PURPLE_ACCENT)
            cell.fill = fill("F3E8FF")

    # Local Register Accumulators (Thread Block 2x2)
    ws2.merge_cells("K10:O10")
    ws2["K10"].value = "⚡ Fast On-Chip Multiply-Add (Registers): Partial Sum"
    ws2["K10"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["K10"].fill = fill(EMERALD_ACCENT)
    ws2["K10"].alignment = center_align()

    for r in range(2):
        for c in range(2):
            row_idx = 11 + r
            col_idx = 12 + c
            formula = f"=K{7+r}*N{7+0} + L{7+r}*N{7+1}" if c==0 else f"=K{7+r}*O{7+0} + L{7+r}*O{7+1}"
            cell = ws2.cell(row=row_idx, column=col_idx, value=formula)
            cell.font = header_font(size=11, bold=True, color="065F46")
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("D1FAE5")

    # Final Output Matrix C (Accumulated over all tiles)
    ws2.merge_cells("A14:D14")
    ws2["A14"].value = "Final Matrix C (Global Output)"
    ws2["A14"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["A14"].fill = fill(EMERALD_ACCENT)
    ws2["A14"].alignment = center_align()

    for r in range(4):
        for c in range(4):
            row_idx = 15 + r
            col_idx = 1 + c
            col_letter_b = get_column_letter(6 + c)
            formula = f"=SUMPRODUCT(A{7+r}:D{7+r}, {col_letter_b}$7:{col_letter_b}$10)"
            cell = ws2.cell(row=row_idx, column=col_idx, value=formula)
            cell.font = regular_font(size=10.5, bold=True, color="065F46")
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("ECFDF5")

    # Step-by-Step Tiled Execution Table
    ws2.merge_cells("F14:P14")
    ws2["F14"].value = "  Step-by-Step CUDA Tile Execution Cycle"
    ws2["F14"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["F14"].fill = fill("334155")

    tile_steps = [
        ("Phase 1: Cooperative Load", "Threads (tx, ty) in block load 1 element each from A and B into SRAM:\nAs[ty][tx] = A[Row*N + (m*TILE + tx)] and Bs[ty][tx] = B[(m*TILE + ty)*N + Col]"),
        ("Phase 2: Barrier Sync", "__syncthreads() ensures all 4 threads finish loading before any thread reads SRAM."),
        ("Phase 3: Compute in SRAM", "Threads perform TILE (2) multiply-adds from ultra-fast (20-cycle) Shared Memory:\nacc_sum += As[ty][k] * Bs[k][tx] (Zero DRAM latency!)"),
        ("Phase 4: Barrier Sync", "__syncthreads() ensures all threads finish computing before next tile overwrites SRAM."),
        ("Phase 5: Write Output", "When all tiles finish (m=0, 1), thread writes accumulated register value to C[Row*N + Col].")
    ]

    for idx, (title, desc) in enumerate(tile_steps, start=15):
        ws2.merge_cells(f"F{idx}:H{idx}")
        c1 = ws2[f"F{idx}"]
        c1.value = title
        c1.font = regular_font(size=9.5, bold=True, color="1E293B")
        c1.fill = fill(CARD_BG)
        c1.border = thin_border()
        c1.alignment = center_align()

        ws2.merge_cells(f"I{idx}:P{idx}")
        c2 = ws2[f"I{idx}"]
        c2.value = desc
        c2.font = regular_font(size=9, color="334155")
        c2.border = thin_border()
        c2.alignment = left_align(wrap=True)

    # Tiled CUDA Code Block
    ws2.merge_cells("A21:P30")
    tiled_cuda_code = (
        "// TILED CUDA GEMM KERNEL (Using Shared Memory SRAM)\n"
        "#define TILE_WIDTH 16\n"
        "__global__ void tiledMatrixMul(const float* A, const float* B, float* C, int N) {\n"
        "    __shared__ float As[TILE_WIDTH][TILE_WIDTH]; // Fast On-Chip SRAM\n"
        "    __shared__ float Bs[TILE_WIDTH][TILE_WIDTH];\n"
        "    int bx = blockIdx.x, by = blockIdx.y;\n"
        "    int tx = threadIdx.x, ty = threadIdx.y;\n"
        "    int Row = by * TILE_WIDTH + ty, Col = bx * TILE_WIDTH + tx;\n"
        "    float Pvalue = 0.0f; // Register accumulator\n"
        "    for (int m = 0; m < (N / TILE_WIDTH); ++m) {\n"
        "        As[ty][tx] = A[Row * N + (m * TILE_WIDTH + tx)]; // 1. Cooperative Load A\n"
        "        Bs[ty][tx] = B[(m * TILE_WIDTH + ty) * N + Col]; // 1. Cooperative Load B\n"
        "        __syncthreads();                                  // 2. Barrier Sync\n"
        "        for (int k = 0; k < TILE_WIDTH; ++k) {\n"
        "            Pvalue += As[ty][k] * Bs[k][tx];             // 3. Compute from ultra-fast SRAM\n"
        "        }\n"
        "        __syncthreads();                                  // 4. Barrier Sync before next tile\n"
        "    }\n"
        "    C[Row * N + Col] = Pvalue;                            // 5. Final output write\n"
        "}"
    )
    ws2["A21"].value = tiled_cuda_code
    ws2["A21"].font = Font(name="Consolas", size=9, color="F8FAFC")
    ws2["A21"].fill = fill("0F172A")
    ws2["A21"].alignment = left_align(wrap=True)

    # -------------------------------------------------------------
    # SHEET 4: 3_Thread_Block_Warp_Map
    # -------------------------------------------------------------
    ws3 = wb.create_sheet(title="3_Warp_&_Thread_Mapping")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:K2")
    ws3["A1"].value = "  CUDA THREAD, WARP & BLOCK COORDINATE TRANSLATOR"
    ws3["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws3["A1"].fill = fill(EMERALD_ACCENT)
    ws3["A1"].alignment = left_align()

    ws3.merge_cells("A3:K3")
    ws3["A3"].value = "Hardware maps 2D Thread Coordinates (threadIdx.x, threadIdx.y) to 1D Linear Thread IDs and 32-thread Warps."
    ws3["A3"].font = regular_font(size=10.5, italic=True, color="475569")

    # Table of 32 Threads (1 Warp)
    warp_headers = [
        "Linear Thread ID", "threadIdx.x", "threadIdx.y", "Warp ID", "Lane ID (0..31)", 
        "Matrix Output Row", "Matrix Output Col", "Shared Mem As[ty][tx]", "Shared Mem Bs[ty][tx]", "Status"
    ]

    for col_idx, h in enumerate(warp_headers, start=1):
        c = ws3.cell(row=5, column=col_idx, value=h)
        c.font = regular_font(size=10, bold=True, color="FFFFFF")
        c.fill = fill("1E293B")
        c.alignment = center_align()
        c.border = thin_border()

    for tid in range(16):
        ty = tid // 4
        tx = tid % 4
        warp_id = tid // 32
        lane_id = tid % 32
        row_idx = 6 + tid

        vals = [
            tid, tx, ty, f"Warp {warp_id}", lane_id,
            f"Row {ty}", f"Col {tx}", f"As[{ty}][{tx}]", f"Bs[{ty}][{tx}]", "ACTIVE (SIMT)"
        ]

        for col_idx, val in enumerate(vals, start=1):
            c = ws3.cell(row=row_idx, column=col_idx, value=val)
            c.font = regular_font(size=9.5)
            c.border = thin_border()
            c.alignment = center_align()
            if ty % 2 == 1:
                c.fill = fill(LIGHT_BG)
            if col_idx == 10:
                c.font = regular_font(size=9.5, bold=True, color="059669")
                c.fill = fill("DCFCE7")

    # Explanation Box
    ws3.merge_cells("A23:K27")
    warp_expl = (
        "📌 KEY WARP & SIMT RULES:\n"
        "1. Thread Indexing Formula: Linear_TID = threadIdx.y * blockDim.x + threadIdx.x\n"
        "2. Warp Size: Hardware always groups 32 consecutive Linear TIDs into 1 Warp.\n"
        "3. Lockstep Execution: All 32 threads in a Warp execute the same instruction at the same clock cycle.\n"
        "4. Branch Divergence: If thread 0 takes the 'if' branch and thread 1 takes the 'else' branch, the hardware serializes both branches, cutting throughput in half!"
    )
    ws3["A23"].value = warp_expl
    ws3["A23"].font = regular_font(size=10, bold=True, color="1E293B")
    ws3["A23"].fill = fill("FEF3C7")
    ws3["A23"].border = medium_border(AMBER_ACCENT)
    ws3["A23"].alignment = left_align(wrap=True)

    # -------------------------------------------------------------
    # SHEET 5: 4_Memory_Coalescing
    # -------------------------------------------------------------
    ws4 = wb.create_sheet(title="4_Memory_Coalescing")
    ws4.views.sheetView[0].showGridLines = True

    ws4.merge_cells("A1:K2")
    ws4["A1"].value = "  MEMORY COALESCING: HOW GPU BUS ARCHITECTURE LOADS DATA"
    ws4["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws4["A1"].fill = fill(PURPLE_ACCENT)
    ws4["A1"].alignment = left_align()

    # Coalesced vs Uncoalesced Diagram
    ws4.merge_cells("A4:E4")
    ws4["A4"].value = "✅ COALESCED ACCESS (Contiguous 128-byte cache line)"
    ws4["A4"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws4["A4"].fill = fill("059669")
    ws4["A4"].alignment = center_align()

    ws4.merge_cells("A5:E7")
    ws4["A5"].value = (
        "Thread 0 reads A[0], Thread 1 reads A[1], Thread 2 reads A[2]...\n"
        "Memory addresses are strictly contiguous in row-major order.\n"
        "➡ The GPU Memory Controller satisfies all 32 threads in a SINGLE 128-byte DRAM transaction!\n"
        "Bus Efficiency = 100%."
    )
    ws4["A5"].font = regular_font(size=9.5, color="065F46")
    ws4["A5"].fill = fill("ECFDF5")
    ws4["A5"].border = thin_border()
    ws4["A5"].alignment = left_align(wrap=True)

    ws4.merge_cells("G4:K4")
    ws4["G4"].value = "❌ UNCOALESCED / STRIDED ACCESS (Scattered Reads)"
    ws4["G4"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws4["G4"].fill = fill("DC2626")
    ws4["G4"].alignment = center_align()

    ws4.merge_cells("G5:K7")
    ws4["G5"].value = (
        "Thread 0 reads B[0*N], Thread 1 reads B[1*N], Thread 2 reads B[2*N]...\n"
        "Reading a column of Matrix B directly from row-major Global Memory.\n"
        "➡ GPU must issue 32 SEPARATE 32-byte DRAM transactions, wasting 96% of bus bandwidth!\n"
        "Bus Efficiency = 3% - 6%."
    )
    ws4["G5"].font = regular_font(size=9.5, color="991B1B")
    ws4["G5"].fill = fill("FEF2F2")
    ws4["G5"].border = thin_border()
    ws4["G5"].alignment = left_align(wrap=True)

    # Visual Memory Line Table
    ws4.merge_cells("A9:K9")
    ws4["A9"].value = "  DRAM Bus 128-Byte Transaction Visualizer (32 Threads in Warp)"
    ws4["A9"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws4["A9"].fill = fill("334155")

    for t in range(16):
        c_th = ws4.cell(row=10, column=1+t%8, value=f"T{t}: Addr {t*4}B")
        c_th.font = regular_font(size=9, bold=True)
        c_th.alignment = center_align()
        c_th.border = thin_border()
        c_th.fill = fill("D1FAE5" if t < 8 else "E0F2FE")

    # -------------------------------------------------------------
    # SHEET 6: 5_Roofline_Performance_Model
    # -------------------------------------------------------------
    ws5 = wb.create_sheet(title="5_Roofline_Model")
    ws5.views.sheetView[0].showGridLines = True

    ws5.merge_cells("A1:K2")
    ws5["A1"].value = "  ROOFLINE PERFORMANCE MODEL & GPU SPEC COMPARISON"
    ws5["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws5["A1"].fill = fill(AMBER_ACCENT)
    ws5["A1"].alignment = left_align()

    # GPU Specs Comparison Table
    spec_headers = ["GPU Architecture", "FP32 TFLOPs", "Tensor TFLOPs (FP16/BF16)", "Memory Bandwidth", "Ridge Point (FLOPs/Byte)", "Max GEMM Efficiency"]
    for col_idx, h in enumerate(spec_headers, start=1):
        c = ws5.cell(row=4, column=col_idx, value=h)
        c.font = regular_font(size=10, bold=True, color="FFFFFF")
        c.fill = fill("1E293B")
        c.alignment = center_align()
        c.border = thin_border()

    gpu_specs = [
        ("NVIDIA H100 (Hopper)", "67 TFLOPs", "989 TFLOPs", "3,350 GB/s (HBM3)", "=67000/3350", "95% (Tiled Tensor Cores)"),
        ("NVIDIA A100 (Ampere)", "19.5 TFLOPs", "312 TFLOPs", "2,039 GB/s (HBM2e)", "=19500/2039", "92% (Tiled Tensor Cores)"),
        ("NVIDIA RTX 4090 (Ada)", "82.6 TFLOPs", "330 TFLOPs", "1,008 GB/s (GDDR6X)", "=82600/1008", "88% (Tiled Shared Mem)"),
        ("NVIDIA V100 (Volta)", "15.7 TFLOPs", "125 TFLOPs", "900 GB/s (HBM2)", "=15700/900", "85% (Tiled Shared Mem)")
    ]

    for r_idx, row_data in enumerate(gpu_specs, start=5):
        for c_idx, val in enumerate(row_data, start=1):
            c = ws5.cell(row=r_idx, column=c_idx, value=val)
            c.font = regular_font(size=9.5)
            c.border = thin_border()
            c.alignment = center_align()
            if c_idx == 5:
                c.number_format = "0.0"
                c.font = regular_font(size=10, bold=True, color="0369A1")
            if r_idx % 2 == 1:
                c.fill = fill(LIGHT_BG)

    # Roofline explanation
    ws5.merge_cells("A11:K16")
    roofline_text = (
        "📈 UNDERSTANDING THE ROOFLINE MODEL FOR MATRIX MULTIPLICATION:\n\n"
        "• Performance Limit = Min( Peak Compute (TFLOPs),  Arithmetic Intensity x Memory Bandwidth )\n"
        "• Ridge Point = Peak FLOPs / Memory Bandwidth (e.g. ~20 FLOPs/Byte on H100 FP32).\n"
        "• If Arithmetic Intensity < Ridge Point ➡ MEMORY BOUND (GPU cores sit idle waiting for DRAM).\n"
        "• If Arithmetic Intensity > Ridge Point ➡ COMPUTE BOUND (GPU cores saturated at max FLOPs!).\n\n"
        "🏆 Tiled Matrix Multiplication increases Arithmetic Intensity from 1.0 (Naive) to TILE_SIZE (16 - 128),\n"
        "pushing the kernel past the Ridge Point into the maximum throughput Compute-Bound zone!"
    )
    ws5["A11"].value = roofline_text
    ws5["A11"].font = regular_font(size=10, bold=True, color="1E293B")
    ws5["A11"].fill = fill("FEF3C7")
    ws5["A11"].border = medium_border(AMBER_ACCENT)
    ws5["A11"].alignment = left_align(wrap=True)

    # Auto-fit column widths across all sheets
    for sheet in wb.worksheets:
        for col in sheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or '')
                if '\n' in val_str:
                    lines = val_str.split('\n')
                    max_len = max(max_len, max(len(l) for l in lines))
                else:
                    max_len = max(max_len, len(val_str))
            sheet.column_dimensions[col_letter].width = max(max_len + 3, 14)

    wb.save(filename)
    print(f"Successfully generated master GPU Excel Simulator: {filename}")

if __name__ == "__main__":
    create_gpu_simulator_workbook("GPU_Matrix_Multiplication_Simulator.xlsx")
