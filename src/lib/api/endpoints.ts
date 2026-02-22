/**
 * API path constants (prefix /api/v1 where applicable)
 */

const P = "/api/v1";

export const endpoints = {
  health: "/health",
  auth: {
    signup: `${P}/auth/signup`,
    signin: `${P}/auth/signin`,
    me: `${P}/auth/me`,
  },
  categories: `${P}/categories`,
  category: (id: string) => `${P}/categories/${id}`,
  expenses: `${P}/expenses`,
  expense: (id: string) => `${P}/expenses/${id}`,
  expenseRestore: (id: string) => `${P}/expenses/${id}/restore`,
  expenseBulk: `${P}/expenses/bulk`,
  expenseSummary: `${P}/expenses/summary`,
  expenseSummaryByCategory: `${P}/expenses/summary/by-category`,
  expenseExport: `${P}/expenses/export`,
  budgets: `${P}/budgets`,
  budget: (id: string) => `${P}/budgets/${id}`,
  budgetCompare: (id: string) => `${P}/budgets/${id}/compare`,
  recurring: `${P}/recurring`,
  recurringId: (id: string) => `${P}/recurring/${id}`,
  recurringRun: `${P}/recurring/run`,
} as const;
