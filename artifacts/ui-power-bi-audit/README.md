# UI Power BI Audit - PT AMA Interface

Audit ini mengevaluasi UI/UX aplikasi PT AMA sebagai aviation ERP operasional dengan inspirasi pola konsumsi laporan Power BI. Audit dilakukan pada 2026-08-03 menggunakan repository saat ini, dev server lokal pada database salinan `/tmp/ama-ui-powerbi-audit.sqlite`, dan screenshot di `screenshots/`.

## Scope

- Source app tidak diubah.
- Database repo tidak di-reset, tidak di-seed, dan tidak dimigrasikan untuk audit visual. Server dijalankan terhadap salinan database di `/tmp`.
- Evidence berasal dari source code, route, API contract yang digunakan, dan screenshot.
- Worktree awal sudah dirty, terutama area maintenance/auth; audit mencatat kondisi repo yang ditemukan.

## File

- `executive-summary.md` - ringkasan eksekutif, skor, risiko, dan pilot.
- `route-inventory.md` - inventaris route, stack, layout, komponen, dan data contract.
- `power-bi-pattern-matrix.md` - matriks pola Power BI vs kondisi PT AMA.
- `page-by-page-findings.md` - temuan per halaman.
- `prioritized-backlog.md` - backlog prioritas dengan effort, dependency, backend impact, dan acceptance criteria.
- `design-system-recommendations.md` - rekomendasi visual system, warna, tabel, chart, state, dan aksesibilitas.
- `pilot-redesign-proposal.md` - proposal pilot redesign untuk satu page reporting/management dan satu operational workbench.
- `screenshots/` - screenshot visual audit.

## Screenshot Evidence

- `desktop-1440-dashboard.png`
- `desktop-1440-finance-dashboard.png`
- `desktop-1440-flight-following.png`
- `desktop-1440-maintenance-command-center.png`
- `desktop-1440-accounting-workbench.png`
- `desktop-1440-flight-detail.png`
- `desktop-1440-maintenance-work-package-detail.png`
- `desktop-1440-maintenance-create-dialog.png`
- `desktop-1440-station-verification.png`
- `desktop-1440-permission-redirect-station-admin-finance.png`
- `laptop-1280-flights-list.png`
- `mobile-390-dashboard.png`
- `mobile-390-flight-following.png`

## Reference Sources

Official Microsoft Learn references accessed 2026-08-03:

- [Power BI reports overview](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-overview)
- [Tips for designing a great Power BI dashboard](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips)
- [Filters and highlighting in Power BI reports](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-filters-and-highlighting)
- [Filter data in Power BI reports](https://learn.microsoft.com/en-us/power-bi/consumer/end-user-report-filter)
- [Overview of slicers in Power BI](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-slicers)
- [Drillthrough in Power BI reports](https://learn.microsoft.com/en-ca/power-bi/create-reports/desktop-drillthrough)
- [Use drill mode to explore visuals in Power BI service](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-drill)
- [Bookmarks in the Power BI service](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-bookmarks)
- [Format filters in Power BI reports](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-report-filter)
- [Design Power BI reports for accessibility](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)
