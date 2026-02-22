import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  color: z.string().max(20).optional().or(z.literal("")),
  icon: z.string().max(50).optional().or(z.literal("")),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
