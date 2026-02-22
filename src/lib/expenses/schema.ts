import { z } from "zod";

export const expenseFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  amount: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number().positive("Amount must be greater than 0")
  ),
  category: z.string().min(1, "Category is required").max(100),
  description: z.string().max(5000).optional().or(z.literal("")),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const bulkExpenseItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().max(5000).optional().or(z.literal("")),
});

export type BulkExpenseItem = z.infer<typeof bulkExpenseItemSchema>;

export const bulkExpensesSchema = z.object({
  expenses: z.array(bulkExpenseItemSchema).min(1, "Add at least one expense").max(100, "Maximum 100 expenses per import"),
});
