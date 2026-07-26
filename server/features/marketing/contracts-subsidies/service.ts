import type { ContractsSubsidiesQuery } from '../../../../shared/features/marketing/contracts-subsidies';
import { ContractsSubsidiesRepository } from './repository';

export class ContractsSubsidiesService {
  constructor(private readonly repository: ContractsSubsidiesRepository) {}

  overview() {
    return this.repository.overview();
  }

  contracts(query: ContractsSubsidiesQuery) {
    return this.repository.contracts(query);
  }

  subsidies(query: ContractsSubsidiesQuery) {
    return this.repository.subsidies(query);
  }

  absorption() {
    return this.repository.absorption();
  }

  activity() {
    return this.repository.activity();
  }

  history() {
    return this.repository.history();
  }
}
