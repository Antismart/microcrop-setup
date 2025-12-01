import { z } from "zod"

// Farmer Form Validation Schema
export const farmerFormSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  nationalId: z.string().min(5, "National ID is required").max(20),
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    return age >= 18 && age <= 100
  }, "Farmer must be between 18 and 100 years old"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),

  // Contact Information
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format"),
  alternatePhone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  
  // Address Information
  address: z.string().min(10, "Address must be at least 10 characters").max(200),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),

  // Farmer Group
  farmerGroup: z.string().optional(),

  // Additional Information
  kycStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "INCOMPLETE"]),
})

export type FarmerFormValues = z.infer<typeof farmerFormSchema>

// Default values for the form
export const farmerFormDefaults: FarmerFormValues = {
  firstName: "",
  lastName: "",
  nationalId: "",
  dateOfBirth: "",
  gender: "MALE",
  phoneNumber: "",
  alternatePhone: "",
  email: "",
  address: "",
  farmerGroup: "",
  kycStatus: "PENDING",
}
