import type { FinanceAccount } from '@/lib/types';

export const DEFAULT_FINANCE_ACCOUNT: FinanceAccount = 'cash';
export const LEGACY_FINANCE_ACCOUNT: FinanceAccount = DEFAULT_FINANCE_ACCOUNT;

export const FINANCE_ACCOUNT_OPTIONS: Array<{
  value: FinanceAccount;
  label: string;
}> = [
  {
    value: 'cash',
    label: 'Pocket',
  },
  {
    value: 'bank',
    label: 'Bank',
  },
  {
    value: 'ewallet',
    label: 'E-Wallet',
  },
  {
    value: 'personal',
    label: 'Personal',
  },
];

const FINANCE_ACCOUNT_LABELS = new Map(
  FINANCE_ACCOUNT_OPTIONS.map((option) => [option.value, option.label] as const),
);


export function isFinanceAccount(value: unknown): value is FinanceAccount {
  return FINANCE_ACCOUNT_OPTIONS.some((option) => option.value === value);
}

export function normalizeFinanceAccount(
  value: unknown,
  fallback: FinanceAccount = LEGACY_FINANCE_ACCOUNT,
): FinanceAccount {
  return isFinanceAccount(value) ? value : fallback;
}

export function normalizeOptionalFinanceAccount(value: unknown) {
  return isFinanceAccount(value) ? value : undefined;
}

export function financeAccountLabel(account: FinanceAccount) {
  return FINANCE_ACCOUNT_LABELS.get(account) ?? 'Pocket';
}
