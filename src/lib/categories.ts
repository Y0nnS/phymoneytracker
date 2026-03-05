import type { TransactionType } from '@/lib/types';
import { readLocalStorageJson, writeLocalStorageJson } from '@/lib/storage';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
];

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Other'];

const STORAGE_KEYS: Record<TransactionType, string> = {
  expense: 'moneytracker:categories:expense',
  income: 'moneytracker:categories:income',
};

function normalizeCategories(input: string[]) {
  const cleaned = input
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .slice(0, 50);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of cleaned) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }
  return unique;
}

export function loadCustomCategories(type: TransactionType) {
  const raw = readLocalStorageJson<unknown>(STORAGE_KEYS[type], []);
  if (!Array.isArray(raw)) return [];
  const strings = raw.filter((v): v is string => typeof v === 'string');
  return normalizeCategories(strings);
}

export function saveCustomCategories(type: TransactionType, categories: string[]) {
  writeLocalStorageJson(STORAGE_KEYS[type], normalizeCategories(categories));
}

export function categoriesForType(type: TransactionType) {
  const base = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const custom = loadCustomCategories(type);
  return normalizeCategories([...custom, ...base]);
}
