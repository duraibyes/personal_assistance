---
name: finance-report
description: Generate a WealthGuard income & expense report for a month, year, or custom date range — as an Excel workbook (.xlsx), a published HTML report artifact, or both. Use when the user asks for an income/expense report, a monthly or yearly money statement, a spending or savings summary, an Excel/spreadsheet export of transactions, or a finance report page/artifact.
---

# Finance report (income & expense)

A three-step pipeline. Every output is built from one JSON export, so the Excel file and the artifact always agree.

```
export-data.mjs  ──►  reports/finance-<from>_to_<to>.json  ──┬─►  build_excel.py     ──►  .xlsx
  (Prisma, read-only)                                         └─►  build_artifact.mjs ──►  .html ──► Artifact
```

All commands run from the repo root.

## 1. Pin down the request

| Decide | How |
| --- | --- |
| **Period** | "September" / "last month" → `--month 2026-09` · "this year" / "2025" → `--year 2025` · "Q2", "last 90 days", "Apr 10–May 3" → `--from YYYY-MM-DD --to YYYY-MM-DD` (inclusive). No period given → current month; say which month you used. |
| **Output** | "excel", "xlsx", "spreadsheet", "download" → Excel · "report", "artifact", "page", "dashboard", "share" → artifact · "both" → both. If it's genuinely unclear, ask once with AskUserQuestion (Excel / Report page / Both). |
| **Whose data** | Leave `--user` off: the script picks the only user. If it exits with **code 2** it prints the user emails. Ask which one, or use `--all` for everyone combined. Never guess. |
| **Loan EMIs** | Included by default as a separate outflow. Add `--no-emi` if the user wants only recorded income and expense entries. |

## 2. Export the data

```bash
node .claude/skills/finance-report/scripts/export-data.mjs --month 2026-09
```

- Writes `reports/finance-<from>_to_<to>.json` by default (`reports/` is gitignored because it holds personal data). Use `--out <path>` to write elsewhere.
- Prints `{ file, meta, summary }` to stdout. Use those totals in your reply; don't re-read the whole JSON.
- It needs network access to Neon. If sandboxed Bash fails with `Can't reach database server`, rerun with the sandbox disabled. If it still fails, the database is offline or suspended. Tell the user; **never substitute made-up numbers.**
- `--sample` writes deterministic demo data (no database), flagged `meta.sample: true`. The artifact then shows a "Sample data" badge. Use it only for previews or template work, and never present it as the user's figures.

JSON shape (both builders depend on it — keep it stable): `meta {from, to, scope, includesEmi, sample, generatedAt}`, `summary {totalIncome, totalExpenses, totalEmi, totalOutflow, net, savingsRate, counts}`, `monthly[]`, `expenseByCategory[]`, `incomeBySource[]`, `expenseByPaymentMethod[]`, `emiByLoan[]` (each `{name, total, count, share}`), and row arrays `incomes[]`, `expenses[]`, `emis[]`.

## 3a. Excel workbook

```bash
python .claude/skills/finance-report/scripts/build_excel.py reports/finance-2026-09-01_to_2026-09-30.json reports/finance-2026-09-01_to_2026-09-30.xlsx
```

Sheets: **Summary** (totals, savings rate, month-by-month table with a Net formula and a clustered bar chart) · **Breakdown** (by category, source, payment method, loan, with a pie chart) · **Income** · **Expenses** · **Loan EMIs** (filterable, frozen header, SUM totals). Amounts use the `₹` format. Needs `openpyxl` (`pip install openpyxl` if missing).

## 3b. Report artifact

1. Render the page into the scratchpad:
   ```bash
   node .claude/skills/finance-report/scripts/build_artifact.mjs reports/finance-2026-09-01_to_2026-09-30.json <scratchpad>/finance-2026-09-01_to_2026-09-30.html
   ```
   It prints the `title` and `description` to publish with.
2. Load the `artifact-design` skill (the Artifact tool requires it). The template [assets/report-template.html](assets/report-template.html) already carries the design: WealthGuard tokens, light and dark themes, and a chart palette validated for colour-blind viewers. Don't rewrite the page per report. Change the template only when the user asks for a design change.
3. Publish with the Artifact tool: `file_path` = the rendered HTML, `favicon` = `📒`, `description` from step 1. To regenerate the same period in the same session, reuse the same HTML path so it redeploys to the same URL.
4. The page is personal financial data. Artifacts start private; don't pin it or suggest sharing it unless the user asks.

What the page shows: a statement masthead; the equation **Income − Expenses − Loan EMIs = Net** with savings rate; a monthly bar chart (multi-month periods) or running-total lines (single month) with hover tooltips and a table view; bar breakdowns by category, source, payment method and loan; and a searchable ledger that filters by type.

## 4. Report back

Give the period, total income, expenses, EMIs, net and savings rate (from the export's stdout). Include the file path and/or artifact link. Flag anything notable: zero entries, a foreclosure in the period, a shortfall month.

## Data rules (implemented in export-data.mjs)

- **Income**: `Income` rows by `date`. Grouped by `source`; the category column is `categoryRef.name`.
- **Expenses**: `Expense` rows by `date`. Category is `categoryRef.name`, falling back to the legacy `category` string.
- **Loan EMIs**: `LoanPayment` rows with status `PAID`/`PARTIAL`, counted on `paymentDate` at `paidAmount`, excluding soft-deleted loans. Paying an EMI never creates an `Expense` row, so nothing is counted twice.
- **Foreclosure**: bulk-pay marks every remaining installment `PAID` at its full due amount on the foreclosure date. Those installments collapse into one row at `Loan.foreclosureAmount`.
- **Not included**: `Purchase`, `VehicleService`, `FuelEntry`, `Insurance`, and `RecurringExpense` schedules. Only actual `Expense` rows count as spending.
- Dates bucket in local time, like `apps/api/src/routes/dashboard.routes.ts`. `--all` merges every user, as the admin dashboard does.

If `packages/database/prisma/schema.prisma` changes these models, update `export-data.mjs` and keep the JSON shape above stable.
