"""Fix Financial Model formatting and Y2 M13 gross profit."""
from openpyxl import load_workbook

PATHS = [
    r"C:\Users\dossani\tijarah-ai-app\docs\NIC-ACCELERATION-COHORT-4-Application-Deliverables-Tijarah-AI.xlsx",
    r"c:\Users\dossani\Downloads\Acceleration Cohort 4- Application Deliverables - Tijarah AI_filled.xlsx",
]

PKR_NUM = "#,##0"
PKR_DEC = "#,##0.00"
PCT = "0.00%"
PLAIN = "0"


def fix(path: str) -> None:
    wb = load_workbook(path)
    fm = wb["Financial Model"]

    for r in range(5, 31):
        for col in ["C", "D"]:
            cell = fm[f"{col}{r}"]
            if isinstance(cell.value, (int, float)):
                cell.number_format = PLAIN
        for col in ["E", "I", "O", "P"]:
            cell = fm[f"{col}{r}"]
            if isinstance(cell.value, (int, float)):
                cell.number_format = PKR_DEC if col in ("O", "P") else PKR_NUM
        cell = fm[f"B{r}"]
        if isinstance(cell.value, (int, float)) and cell.value < 1:
            cell.number_format = PCT

    for r in range(36, 62):
        for col in ["E", "F", "H", "I", "J", "K", "L", "M", "N"]:
            cell = fm[f"{col}{r}"]
            if isinstance(cell.value, (int, float)):
                cell.number_format = PKR_DEC

    mrr = fm["E19"].value
    ai = fm["H50"].value or 0
    hosting = fm["L50"].value or 0
    gp = mrr - ai - hosting
    fm["O19"] = gp
    fm["P19"] = gp

    wb.save(path)
    print(f"Fixed {path} — O19 GP = {gp}")


if __name__ == "__main__":
    for p in PATHS:
        try:
            fix(p)
        except FileNotFoundError:
            print(f"Skip missing: {p}")
