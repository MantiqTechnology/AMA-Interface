import type Database from 'better-sqlite3';
import { createFinanceGovernanceService } from '../../features/finance/governance';
import { createBankReconciliationService } from '../../features/finance/reconciliation';
import { createFinanceReportingService } from '../../features/finance/reporting';
import type { DemoSeedContext } from './context';

const reviewerId = 'USR-FINANCE-REVIEWER';

function monthEnd(anchorDate: string) {
  const [year, month] = anchorDate.split('-').map(Number);
  return new Date(Date.UTC(year!, month!, 0)).toISOString().slice(0, 10);
}

export function seedFinanceGovernanceScenario(sqlite: Database.Database, context: DemoSeedContext) {
  const periodCode = context.anchorDate.slice(0, 7);
  const statementNumber = `BPD-STM-${periodCode.replace('-', '')}`;
  const receipt = sqlite
    .prepare('SELECT id, amount_minor FROM customer_receipts WHERE reference = ?')
    .get(`BPD-AR-${context.compactDate(-9)}-001`) as
    { id: string; amount_minor: number } | undefined;

  if (
    receipt &&
    !sqlite.prepare('SELECT 1 FROM bank_statements WHERE statement_number = ?').get(statementNumber)
  ) {
    const reconciliation = createBankReconciliationService(sqlite, () => context.now);
    const statement = reconciliation.createStatement({
      cashBankAccountId: 'cash-bank-main',
      statementNumber,
      periodStart: `${periodCode}-01`,
      periodEnd: monthEnd(context.anchorDate),
      openingBalanceMinor: 0,
      closingBalanceMinor: receipt.amount_minor,
      importedBy: reviewerId,
      lines: [
        {
          bookingDate: context.date(-9),
          valueDate: context.date(-9),
          reference: receipt.id,
          description: 'Customer receipt settlement',
          amountMinor: receipt.amount_minor,
          balanceMinor: receipt.amount_minor
        }
      ]
    });
    reconciliation.autoMatch(statement.id, reviewerId);
  }

  const existingExport = sqlite
    .prepare(
      `SELECT 1 FROM financial_exports
    WHERE report_type='GENERAL_LEDGER' AND period_code=? AND requested_by=?`
    )
    .get(periodCode, reviewerId);
  if (!existingExport) {
    const reporting = createFinanceReportingService(sqlite, () => context.now);
    createFinanceGovernanceService(sqlite, reporting, () => context.now).exportReport(
      'GENERAL_LEDGER',
      { period: periodCode },
      { actorId: reviewerId, actorRole: 'Finance Reviewer' }
    );
  }
}
