import type { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    throw new HttpError(400, fieldErrors[0]?.message ?? 'Invalid request', fieldErrors);
  }
  return result.data;
}
