import { z } from "zod"

// Login Schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// Register Schema
// NOTE: FARMER role excluded - farmers register via mobile app only
export const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
  role: z.enum(["ADMIN", "COOPERATIVE"]), // Only COOPERATIVE and ADMIN can register via web
  cooperativeName: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Require cooperativeName if role is COOPERATIVE
  if (data.role === "COOPERATIVE" && !data.cooperativeName) {
    return false
  }
  return true
}, {
  message: "Cooperative name is required",
  path: ["cooperativeName"],
})

export type RegisterFormValues = z.infer<typeof registerSchema>

// Reset Password Schema
export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

// New Password Schema
export const newPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  token: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>

// Login defaults
export const loginDefaults: LoginFormValues = {
  email: "",
  password: "",
  remember: false,
}

// Register defaults
// Default to COOPERATIVE since FARMER role is not allowed on web
export const registerDefaults: RegisterFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  role: "COOPERATIVE",
  acceptTerms: false,
}

// Reset password defaults
export const resetPasswordDefaults: ResetPasswordFormValues = {
  email: "",
}
