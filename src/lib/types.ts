export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: Date;
};

export type TransactionCreateInput = Omit<Transaction, 'id'>;

export type Budget = {
  month: string; // YYYY-MM
  amount: number;
  updatedAt?: Date;
};

