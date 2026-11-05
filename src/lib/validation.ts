import { z } from 'zod'

/** Shared building blocks */
const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))

const password = z
  .string()
  .min(8, 'Must be at least 8 characters')
  .max(128, 'Must be 128 characters or fewer')
  .refine((v) => /[a-zA-Z]/.test(v), 'Must include a letter')
  .refine((v) => /[0-9]/.test(v), 'Must include a number')

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, 'You must accept the Terms and Privacy Policy'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(true),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .max(128, 'Must be 128 characters or fewer')
      .refine((v) => /[a-zA-Z]/.test(v), 'Must include a letter')
      .refine((v) => /[0-9]/.test(v), 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const folderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Folder name is required')
    .max(40, 'Keep folder names under 40 characters'),
})

export const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tag name is required')
    .max(24, 'Keep tags under 24 characters'),
})

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
})

/** A note needs a meaningful title or body before it can be created/saved. */
export const noteContentSchema = z
  .object({
    title: z.string().max(120, 'Titles can be up to 120 characters'),
    content: z.string().max(100_000, 'Note body is too large'),
  })
  .refine((d) => d.title.trim().length > 0 || d.content.trim().length > 0, {
    message: 'Add a title or some content before saving',
    path: ['title'],
  })

export const feedbackSchema = z.object({
  category: z.enum(['bug', 'idea', 'question', 'other'], 'Choose a category'),
  subject: z.string().trim().min(3, 'Add a short subject').max(120, 'Subject is too long'),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(4000, 'Message is too long'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>

/** Converts a ZodError into a flat field -> message map. */
export function fieldErrors(error: z.ZodError, pick?: string[]): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (pick && !pick.includes(key)) continue
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/** 0–4 password strength score with a label used by the sign-up form. */
export function passwordStrength(value: string): { score: number; label: string; ok: boolean } {
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
  if (/[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value)) score++
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)], ok: value.length >= 8 && /[a-zA-Z]/.test(value) && /[0-9]/.test(value) }
}
