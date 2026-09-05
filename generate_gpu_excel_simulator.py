"""
GPU & Matrix Multiplication (GEMM) Interactive Excel Simulator Generator
Generates a multi-sheet, richly formatted, formula-driven Excel workbook
explaining GPU Architecture, Naive vs Tiled Matrix Multiplication, Block GEMM,
Partial Products, Register Reduction, Warps, Memory Coalescing, and the Roofline Model.
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
    # SHEET 1: 0_GPU_Architecture
    # -------------------------------------------------------------
    ws0 = wb.create_sheet(title="0_GPU_Architecture")
    ws0.views.sheetView[0].showGridLines = True

    ws0.merge_cells("A1:N2")
    ws0["A1"].value = "  GPU ARCHITECTURE & HARDWARE HIERARCHY SIMULATOR"
    ws0["A1"].font = header_font(size=16, bold=True, color="FFFFFF")
    ws0["A1"].fill = fill(NAVY_HEADER)
    ws0["A1"].alignment = left_align()

    ws0.merge_cells("A3:N3")
    ws0["A3"].value = "Why GPUs excel at Matrix Multiplication: Massive Parallelism + Hierarchical Memory Model"
    ws0["A3"].font = regular_font(size=11, italic=True, color="475569")
    ws0["A3"].alignment = left_align()

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

    # -------------------------------------------------------------
    # SHEET 2: 1_Naive_GEMM
    # -------------------------------------------------------------
    ws1 = wb.create_sheet(title="1_Naive_GEMM")
    ws1.views.sheetView[0].showGridLines = True

    ws1.merge_cells("A1:L2")
    ws1["A1"].value = "  NAIVE GPU MATRIX MULTIPLICATION (1 Thread = 1 Output Element)"
    ws1["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws1["A1"].fill = fill("DC2626")
    ws1["A1"].alignment = left_align()

    matA_data = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 1, 2, 3],
        [4, 5, 6, 7]
    ]

    matB_data = [
        [2, 0, 1, 3],
        [1, 2, 0, 1],
        [3, 1, 2, 0],
        [0, 3, 1, 2]
    ]

    ws1.merge_cells("B5:E5")
    ws1["B5"].value = "Matrix A (Global Memory)"
    ws1["B5"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws1["B5"].fill = fill(CYAN_ACCENT)
    ws1["B5"].alignment = center_align()

    for r in range(4):
        for c in range(4):
            cell = ws1.cell(row=6+r, column=2+c, value=matA_data[r][c])
            cell.font = regular_font(size=11, bold=True)
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("E0F2FE")

    ws1.merge_cells("G5:J5")
    ws1["G5"].value = "Matrix B (Global Memory)"
    ws1["G5"].font = header_font(size=11, bold=True, color="FFFFFF")
    ws1["G5"].fill = fill(PURPLE_ACCENT)
    ws1["G5"].alignment = center_align()

    for r in range(4):
        for c in range(4):
            cell = ws1.cell(row=6+r, column=7+c, value=matB_data[r][c])
            cell.font = regular_font(size=11, bold=True)
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("F3E8FF")

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

    # -------------------------------------------------------------
    # SHEET 3: 2_Block_GEMM_Reduction (NEW DEEP-DIVE SHEET)
    # -------------------------------------------------------------
    ws2_red = wb.create_sheet(title="2_Block_GEMM_Reduction")
    ws2_red.views.sheetView[0].showGridLines = True

    ws2_red.merge_cells("A1:P2")
    ws2_red["A1"].value = "  BLOCK GEMM: PARTIAL PRODUCTS & REGISTER REDUCTION"
    ws2_red["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws2_red["A1"].fill = fill(EMERALD_ACCENT)
    ws2_red["A1"].alignment = left_align()

    ws2_red.merge_cells("A3:P3")
    ws2_red["A3"].value = "How Reduction Works: Matrix C is formed by summing Sub-Matrix Partial Products: C = Partial_Tile_0 + Partial_Tile_1"
    ws2_red["A3"].font = regular_font(size=10.5, italic=True, color="475569")

    # Partial Product 0 (Tile m=0: k=0..1)
    ws2_red.merge_cells("A5:D5")
    ws2_red["A5"].value = "Partial Product Matrix P^(0) (k=0..1)"
    ws2_red["A5"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2_red["A5"].fill = fill(CYAN_ACCENT)
    ws2_red["A5"].alignment = center_align()

    # P0 formulas: A[r, 0]*B[0, c] + A[r, 1]*B[1, c]
    for r in range(4):
        for c in range(4):
            # A from 1_Naive_GEMM!B6:C9, B from 1_Naive_GEMM!G6:J7
            formula = f"='1_Naive_GEMM'!B{6+r}*'1_Naive_GEMM'!{get_column_letter(7+c)}$6 + '1_Naive_GEMM'!C{6+r}*'1_Naive_GEMM'!{get_column_letter(7+c)}$7"
            cell = ws2_red.cell(row=6+r, column=1+c, value=formula)
            cell.font = regular_font(size=10.5, bold=True, color="0369A1")
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("E0F2FE")

    # Plus Operator
    ws2_red["E7"].value = "➕"
    ws2_red["E7"].font = header_font(size=16, bold=True, color="1E293B")
    ws2_red["E7"].alignment = center_align()

    # Partial Product 1 (Tile m=1: k=2..3)
    ws2_red.merge_cells("F5:I5")
    ws2_red["F5"].value = "Partial Product Matrix P^(1) (k=2..3)"
    ws2_red["F5"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2_red["F5"].fill = fill(PURPLE_ACCENT)
    ws2_red["F5"].alignment = center_align()

    # P1 formulas: A[r, 2]*B[2, c] + A[r, 3]*B[3, c]
    for r in range(4):
        for c in range(4):
            formula = f"='1_Naive_GEMM'!D{6+r}*'1_Naive_GEMM'!{get_column_letter(7+c)}$8 + '1_Naive_GEMM'!E{6+r}*'1_Naive_GEMM'!{get_column_letter(7+c)}$9"
            cell = ws2_red.cell(row=6+r, column=6+c, value=formula)
            cell.font = regular_font(size=10.5, bold=True, color="6D28D9")
            cell.alignment = center_align()
            cell.border = thin_border()
            cell.fill = fill("F3E8FF")

    # Equals Operator
    ws2_red["J7"].value = "🟰"
    ws2_red["J7"].font = header_font(size=16, bold=True, color="1E293B")
    ws2_red["J7"].alignment = center_align()

    # Final Matrix C Sum (P0 + P1)
    ws2_red.merge_cells("K5:N5")
    ws2_red["K5"].value = "Final Reduced Matrix C = P^(0) + P^(1)"
    ws2_red["K5"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2_red["K5"].fill = fill(EMERALD_ACCENT)
    ws2_red["K5"].alignment = center_align()

    for r in range(4):
        for c in range(4):
            col_p0 = get_column_letter(1 + c)
            col_p1 = get_column_letter(6 + c)
            formula = f"={col_p0}{6+r} + {col_p1}{6+r}"
            cell = ws2_red.cell(row=6+r, column=11+c, value=formula)
            cell.font = header_font(size=11, bold=True, color="065F46")
            cell.alignment = center_align()
            cell.border = medium_border(EMERALD_ACCENT)
            cell.fill = fill("D1FAE5")

    # Explanation Box for Reduction
    ws2_red.merge_cells("A12:N18")
    red_expl = (
        "🔬 HOW REDUCTION & PARTIAL PRODUCTS WORK IN HARDWARE:\n\n"
        "1. Thread Registers as Accumulators: Each CUDA thread initializes float Pvalue = 0.0f.\n"
        "2. Sub-Matrix Tiling: The global K-dimension (4) is divided into tiles of size TILE_WIDTH (2).\n"
        "3. Loop m=0: All 4 Thread Blocks compute Partial Product P^(0) from Shared Memory SRAM and add into Pvalue.\n"
        "4. Loop m=1: All 4 Thread Blocks compute Partial Product P^(1) from Shared Memory SRAM and add into Pvalue.\n"
        "5. Final Commit: The register reduction is complete (Pvalue = P^(0) + P^(1)). Each thread issues a coalesced write to C.\n"
        "💡 Result: 0 memory stalls, maximum arithmetic intensity, and seamless scalability to any matrix size!"
    )
    ws2_red["A12"].value = red_expl
    ws2_red["A12"].font = regular_font(size=10, bold=True, color="1E293B")
    ws2_red["A12"].fill = fill("FEF3C7")
    ws2_red["A12"].border = medium_border(AMBER_ACCENT)
    ws2_red["A12"].alignment = left_align(wrap=True)

    # -------------------------------------------------------------
    # SHEET 4: 3_Tiled_Shared_Memory_GEMM
    # -------------------------------------------------------------
    ws2 = wb.create_sheet(title="3_Tiled_Shared_Memory_GEMM")
    ws2.views.sheetView[0].showGridLines = True

    ws2.merge_cells("A1:P2")
    ws2["A1"].value = "  TILED MATRIX MULTIPLICATION IN SHARED MEMORY"
    ws2["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws2["A1"].fill = fill(CYAN_ACCENT)
    ws2["A1"].alignment = left_align()

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

    # Matrices
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

    # Shared Memory Buffers
    ws2.merge_cells("K6:L6")
    ws2["K6"].value = "As (SMEM SRAM)"
    ws2["K6"].font = header_font(size=10.5, bold=True, color="FFFFFF")
    ws2["K6"].fill = fill(CYAN_ACCENT)
    ws2["K6"].alignment = center_align()

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

    # -------------------------------------------------------------
    # SHEET 5: 4_Roofline_Model
    # -------------------------------------------------------------
    ws5 = wb.create_sheet(title="4_Roofline_Model")
    ws5.views.sheetView[0].showGridLines = True

    ws5.merge_cells("A1:K2")
    ws5["A1"].value = "  ROOFLINE PERFORMANCE MODEL & GPU SPEC COMPARISON"
    ws5["A1"].font = header_font(size=14, bold=True, color="FFFFFF")
    ws5["A1"].fill = fill(AMBER_ACCENT)
    ws5["A1"].alignment = left_align()

    spec_headers = ["GPU Architecture", "FP32 TFLOPs", "Tensor TFLOPs", "Memory Bandwidth", "Ridge Point (FLOPs/Byte)", "Max GEMM Efficiency"]
    for col_idx, h in enumerate(spec_headers, start=1):
        c = ws5.cell(row=4, column=col_idx, value=h)
        c.font = regular_font(size=10, bold=True, color="FFFFFF")
        c.fill = fill("1E293B")
        c.alignment = center_align()
        c.border = thin_border()

    gpu_specs = [
        ("NVIDIA H100 (Hopper)", "67 TFLOPs", "989 TFLOPs", "3,350 GB/s (HBM3)", "=67000/3350", "95% (Tensor Cores)"),
        ("NVIDIA A100 (Ampere)", "19.5 TFLOPs", "312 TFLOPs", "2,039 GB/s (HBM2e)", "=19500/2039", "92% (Tensor Cores)"),
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
