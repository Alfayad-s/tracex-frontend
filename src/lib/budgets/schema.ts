import { z } from "zod";

export const budgetFormSchema = z.object({
  category: z.string().max(100).optional().or(z.literal("")),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(0).max(12),
  limit: z.coerce.number().positive("Limit must be greater than 0"),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;
