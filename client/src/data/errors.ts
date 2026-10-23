import type { z } from 'zod';

/** An error whose message is safe and useful to show to the user. */
export class AppError extends Error {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    throw new AppError(issues[0]?.message ?? 'Invalid input', issues);
  }
  return result.data;
}
