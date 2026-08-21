import { z } from "zod";

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  websiteUrl: z
    .string()
    .trim()
    .url("Enter a valid website URL")
    .optional()
    .or(z.literal("")),
  logoUrl: z
    .string()
    .trim()
    .url("Enter a valid logo URL")
    .optional()
    .or(z.literal("")),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
