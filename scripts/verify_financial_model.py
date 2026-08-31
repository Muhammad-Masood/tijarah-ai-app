"""Verify Financial Model sheet PKR/USD consistency."""
from openpyxl import load_workbook

PATH = r"C:\Users\dossani\tijarah-ai-app\docs\NIC-ACCELERATION-COHORT-4-Application-Deliverables-Tijarah-AI.xlsx"
FX = 280
AI_USD = 4.90
HOSTING_USD = 70
PLATFORM_M1_USD = 143

wb = load_workbook(PATH, data_only=True)
fm = wb["Financial Model"]
im = wb["Information Memorandum"]

print("=== Y1 Monthly verification ===")
print(f"{'Mo':<4} {'Signups':>7} {'Paid':>5} {'MRR PKR':>12} {'Exp COGS':>10} {'Calc GP':>12} {'Sheet GP':>12} {'Match':>5}")
y1_rev = 0
y1_gp_calc = 0
issues = []

for i in range(12):
    r = 5 + i
    signups = fm[f"C{r}"].value
    paid = fm[f"D{r}"].value
    mrr = fm[f"E{r}"].value
    sheet_gp = fm[f"O{r}"].value
    ai_pkr = fm[f"H{36+i}"].value or 0
    hosting = fm[f"L{36+i}"].value or 0
    legal = fm[f"K{36+i}"].value or 0
    cogs = ai_pkr + hosting + legal
    calc_gp = (mrr or 0) - cogs
    y1_rev += mrr or 0
    y1_gp_calc += calc_gp
    match = abs(calc_gp - (sheet_gp or 0)) < 2
    if not match:
        issues.append(f"Y1 M{i+1}: GP mismatch calc={calc_gp} sheet={sheet_gp}")
    print(f"{i+1:<4} {signups!s:>7} {paid!s:>5} {mrr!s:>12} {cogs!s:>10} {calc_gp!s:>12} {sheet_gp!s:>12} {'OK' if match else 'NO':>5}")

print(f"\nY1 sum MRR PKR: {y1_rev:,.0f} ({y1_rev/1e6:.4f} Mn)")
print(f"Y1 sum GP PKR (calc): {y1_gp_calc:,.0f} ({y1_gp_calc/1e6:.4f} Mn)")
print(f"Y1 sum GP USD: {y1_gp_calc/FX:,.0f}")

print("\n=== Y2 Monthly verification (first 3 + last) ===")
for i in list(range(3)) + [11]:
    r = 19 + i
    paid = fm[f"D{r}"].value
    mrr = fm[f"E{r}"].value
    sheet_gp = fm[f"O{r}"].value
    ai_pkr = fm[f"H{50+i}"].value or 0
    hosting = fm[f"L{50+i}"].value or 0
    cogs = ai_pkr + hosting
    calc_gp = (mrr or 0) - cogs
    expected_ai = int((paid or 0) * AI_USD * FX)
    match = abs(calc_gp - (sheet_gp or 0)) < 2
    ai_match = abs((ai_pkr or 0) - expected_ai) < 2
    print(f"M{13+i} paid={paid} mrr={mrr} ai_pkr={ai_pkr} (expect {expected_ai}) gp_calc={calc_gp} sheet_gp={sheet_gp} {'OK' if match else 'NO'}")
    if not ai_match:
        issues.append(f"Y2 M{13+i}: AI cost uses wrong paid count? ai={ai_pkr} expected={expected_ai} for paid={paid}")

print("\n=== Info Memo cross-check ===")
print(f"F66 Revenue Mn: {im['F66'].value}")
print(f"F67 Gross Profit Mn: {im['F67'].value}")
print(f"F57 Gross Margin %: {im['F57'].value}")

print("\n=== Formatting checks ===")
for r in [5, 6]:
    for col in ["C", "D", "E", "I", "O", "H", "L", "K"]:
        cell = fm[f"{col}{r}"]
        print(f"{col}{r} value={cell.value!r} number_format={cell.number_format}")

print("\n=== Issues ===")
for x in issues:
    print("-", x)
if not issues:
    print("(none from automated checks)")
