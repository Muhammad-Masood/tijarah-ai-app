"""List merged cells in key sheets."""
from openpyxl import load_workbook

PATH = r"c:\Users\dossani\Downloads\Acceleration Cohort 4- Application Deliverables - Tijarah AI_filled.xlsx"
wb = load_workbook(PATH)
for name in ["Information Memorandum", "Financial Model"]:
    ws = wb[name]
    print(f"\n{name} merged ranges:")
    for r in ws.merged_cells.ranges:
        print(f"  {r}")
