import { getTicketingFinanceService } from '../../features/ticketing/finance';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(() => getTicketingFinanceService().ledger());
