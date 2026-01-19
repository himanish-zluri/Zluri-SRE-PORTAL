import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Refresh token now comes from cookies, no body validation needed
export const refreshSchema = z.object({
  body: z.object({}).optional(),
});

// Logout token now comes from cookies, no body validation needed
export const logoutSchema = z.object({
  body: z.object({}).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshInput = z.infer<typeof refreshSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
