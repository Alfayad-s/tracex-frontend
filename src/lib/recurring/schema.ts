import { z } from "zod";

export const recurringFormSchema = z.object({
  category: z.string().min(1, "Category is required").max(100),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().max(5000).optional().or(z.literal("")),
  frequency: z.enum(["day", "week", "month"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export type RecurringFormValues = z.infer<typeof recurringFormSchema>;
