import {
  type FocusMode,
  type Goal,
  type GoalStatus,
  type PlannerBlock,
  type PlannerBlockType,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/types';

export const TASK_STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export const TASK_PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const MAX_TAG_ITEMS = 12;

export const NOTE_TAG_SUGGESTIONS = [
  'General',
  'Ideas',
  'Meeting',
  'Journal',
  'Reference',
];

export const NOTE_CATEGORY_OPTIONS = NOTE_TAG_SUGGESTIONS;

export const GOAL_STATUS_OPTIONS: Array<{ value: GoalStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export const PLANNER_BLOCK_TYPES: Array<{ value: PlannerBlockType; label: string }> = [
  { value: 'deep_work', label: 'Deep Work' },
  { value: 'admin', label: 'Admin' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'personal', label: 'Personal' },
];

export const FOCUS_MODE_OPTIONS: Array<{ value: FocusMode; label: string }> = [
  { value: 'deep_work', label: 'Deep Work' },
  { value: 'admin', label: 'Admin' },
  { value: 'learning', label: 'Learning' },
];

const TASK_STATUS_ORDER: Record<TaskStatus, number> = {
  inbox: 0,
  today: 1,
  in_progress: 2,
  done: 3,
};

const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const GOAL_STATUS_ORDER: Record<GoalStatus, number> = {
  active: 0,
  paused: 1,
  completed: 2,
};

const PLANNER_TYPE_ORDER: Record<PlannerBlockType, number> = {
  deep_work: 0,
  meeting: 1,
  admin: 2,
  personal: 3,
};

export function parseTags(value: string) {
  const parts = value.split(',');

  return dedupeTags(parts);
}

export function normalizeTagLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function dedupeTags(values: string[], max = MAX_TAG_ITEMS) {
  const next: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const normalized = normalizeTagLabel(value);
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key) || next.length >= max) return;

    seen.add(key);
    next.push(normalized);
  });

  return next;
}

export function mergeTags(existing: string[], draft: string, max = MAX_TAG_ITEMS) {
  return dedupeTags([...existing, ...draft.split(',')], max);
}

export function tagsToInput(tags: string[]) {
  return tags.join(', ');
}

export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function goalProgress(goal: Goal) {
  if (goal.targetValue <= 0) return 0;
  return Math.max(0, Math.min(1, goal.currentValue / goal.targetValue));
}

export function sortTasks(tasks: Task[]) {
  return tasks.slice().sort((a, b) => {
    const statusDiff = TASK_STATUS_ORDER[a.status] - TASK_STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const priorityDiff = TASK_PRIORITY_ORDER[a.priority] - TASK_PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const dueA = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dueB = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (dueA !== dueB) return dueA - dueB;

    const updatedA = a.updatedAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
    const updatedB = b.updatedAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
    return updatedB - updatedA;
  });
}

export function sortPlannerBlocks(blocks: PlannerBlock[]) {
  return blocks.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    const typeDiff = PLANNER_TYPE_ORDER[a.type] - PLANNER_TYPE_ORDER[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.title.localeCompare(b.title);
  });
}

export function sortGoals(goals: Goal[]) {
  return goals.slice().sort((a, b) => {
    const statusDiff = GOAL_STATUS_ORDER[a.status] - GOAL_STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    const deadlineA = a.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const deadlineB = b.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return deadlineA - deadlineB;
  });
}

export function taskStatusTone(status: TaskStatus) {
  if (status === 'done') return 'text-emerald-200 border-emerald-900/60 bg-emerald-950/30';
  if (status === 'in_progress') return 'text-blue-200 border-blue-900/60 bg-blue-950/30';
  if (status === 'today') return 'text-amber-200 border-amber-900/60 bg-amber-950/30';
  return 'text-zinc-200 border-zinc-800 bg-zinc-950/50';
}

export function priorityTone(priority: TaskPriority) {
  if (priority === 'high') return 'text-red-200 border-red-900/60 bg-red-950/30';
  if (priority === 'medium') return 'text-amber-200 border-amber-900/60 bg-amber-950/30';
  return 'text-zinc-200 border-zinc-800 bg-zinc-950/50';
}

export function goalTone(status: GoalStatus) {
  if (status === 'completed') return 'text-emerald-200 border-emerald-900/60 bg-emerald-950/30';
  if (status === 'paused') return 'text-zinc-200 border-zinc-800 bg-zinc-950/50';
  return 'text-blue-200 border-blue-900/60 bg-blue-950/30';
}

export function plannerTone(type: PlannerBlockType) {
  if (type === 'deep_work') return 'text-blue-200 border-blue-900/60 bg-blue-950/30';
  if (type === 'meeting') return 'text-violet-200 border-violet-900/60 bg-violet-950/30';
  if (type === 'admin') return 'text-amber-200 border-amber-900/60 bg-amber-950/30';
  return 'text-emerald-200 border-emerald-900/60 bg-emerald-950/30';
}
