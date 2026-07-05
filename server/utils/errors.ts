export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function notFound(entity: string, id: string) {
  return new DomainError('NOT_FOUND', `${entity} ${id} was not found`, 404);
}
