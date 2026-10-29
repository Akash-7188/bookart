import { z } from "zod";

/**
 * Auth schemas shared by the Server Actions and the client forms.
 *
 * These live outside app/actions/* because a "use server" module may only
 * export async functions — importing a zod object from there breaks the client
 * resolver at runtime.
 */

export const signUpSchema = z.object({
  name: z.string().min(2, "Enter your full name or organisation name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  phone: z
    .string()
    .min(10, "Enter a 10-digit mobile number")
    .max(15)
    .regex(/^[0-9+\-\s]+$/, "Digits only"),
  occupation: z.enum(["Student", "Teacher", "Reader", "Shop Owner"]),
  age: z.coerce.number().int().min(13, "Must be 13 or older").max(99, "Enter a valid age"),
  gender: z.enum(["Female", "Male", "Non-binary", "Prefer not to say"]),
  address: z.string().min(4, "Add a delivery address"),
  pincode: z.string().regex(/^\d{6}$/, "6-digit pincode"),
  sellerKind: z.enum(["individual", "bookstore", "library"]),
  gstin: z.string().optional(),
  registrationId: z.string().optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const becomeSellerSchema = z.object({
  userId: z.string().min(1),
  sellerKind: z.enum(["individual", "bookstore", "library"]),
  gstin: z.string().optional(),
  registrationId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
});

export const profileSchema = z.object({
  userId: z.string(),
  name: z.string().min(2, "Add your name"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
