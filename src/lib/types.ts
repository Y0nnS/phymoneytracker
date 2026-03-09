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
  month: string; 
  amount: number;
  updatedAt?: Date;
};

export type TaskStatus = 'inbox' | 'today' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate: Date | null;
  estimateMinutes: number | null;
  tags: string[];
  completedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export type Note = {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type NoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;

export type GoalStatus = 'active' | 'paused' | 'completed';

export type Goal = {
  id: string;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: Date | null;
  status: GoalStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type GoalInput = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>;

export type PlannerBlockType = 'deep_work' | 'admin' | 'meeting' | 'personal';

export type PlannerBlock = {
  id: string;
  title: string;
  notes: string;
  type: PlannerBlockType;
  date: string;
  startTime: string;
  endTime: string;
  sortKey: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PlannerBlockInput = Omit<
  PlannerBlock,
  'id' | 'sortKey' | 'createdAt' | 'updatedAt'
>;

export type FocusMode = 'deep_work' | 'admin' | 'learning';

export type FocusSession = {
  id: string;
  label: string;
  mode: FocusMode;
  sessionDate: string;
  plannedMinutes: number;
  actualMinutes: number;
  startedAt: Date;
  completedAt: Date | null;
  createdAt?: Date;
};

export type FocusSessionInput = Omit<FocusSession, 'id' | 'createdAt'>;
