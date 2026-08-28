import type { ContractsSubsidiesQuery } from '../../../../shared/features/marketing/contracts-subsidies';
import { ContractsSubsidiesRepository } from './repository';

export class ContractsSubsidiesService {
  constructor(private readonly repository: ContractsSubsidiesRepository) {}

  overview(query: Partial<ContractsSubsidiesQuery>) {
    return this.repository.overview(query);
  }

  contracts(query: Partial<ContractsSubsidiesQuery>) {
    return this.repository.contracts(query);
  }

  subsidies(query: Partial<ContractsSubsidiesQuery>) {
    return this.repository.subsidies(query);
  }

  absorption(query: Partial<ContractsSubsidiesQuery>) {
    return this.repository.absorption(query);
  }

  activity(query: Partial<ContractsSubsidiesQuery>) {
    return this.repository.activity(query);
  }

  history(query: Partial<ContractsSubsidiesQuery>) {
    return this.repository.history(query);
  }

  renewals(query: Partial<ContractsSubsidiesQuery>) {
    return this.repository.renewals(query);
  }
}
