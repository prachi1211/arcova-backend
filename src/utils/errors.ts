export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  notFound: (resource: string) => new AppError(404, `${resource} not found`, 'NOT_FOUND'),
  unauthorized: () => new AppError(401, 'Authentication required', 'UNAUTHORIZED'),
  forbidden: () => new AppError(403, 'Insufficient permissions', 'FORBIDDEN'),
  badRequest: (msg: string) => new AppError(400, msg, 'BAD_REQUEST'),
  conflict: (msg: string) => new AppError(409, msg, 'CONFLICT'),
  internal: (msg: string) => new AppError(500, msg, 'INTERNAL_ERROR'),
};
