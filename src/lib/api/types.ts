/**
 * API types aligned with API-FRONTEND.md
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Category {
  id: string;
  name: string;
  userId: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description?: string | null;
  userId: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category?: string | null;
  year: number;
  month?: number | null;
  limit: number;
}

export interface Recurring {
  id: string;
  userId: string;
  category: string;
  amount: number;
  description?: string | null;
  frequency: "day" | "week" | "month";
  startDate: string;
  nextRunAt: string;
  lastRunAt?: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiAuthSuccess {
  success: true;
  user: User;
  token: string;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface ExpenseSummary {
  total: number;
  count: number;
  byPeriod?: Array<{ period: string; total: number; count: number }>;
}

export interface ExpenseSummaryByCategory {
  total: number;
  count: number;
  byCategory: Array<{ category: string; total: number; count: number }>;
}

export interface BudgetCompare {
  budget: Budget;
  spending: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  expenseCount: number;
}

export interface RecurringRunResult {
  processed: number;
  created: Array<{ id: string; date: string; amount: number; category: string }>;
}
