'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  loadCustomCategories,
  saveCustomCategories,
} from '@/lib/categories';
import { signOutUser } from '@/lib/firebase/auth';
import {
  deleteUserProfile,
  deleteUserProfilePhoto,
  setUserProfile,
  updateUserProfile,
  uploadUserProfilePhoto,
} from '@/lib/firebase/users';
import React from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [signingOut, setSigningOut] = React.useState(false);
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user?.uid);
  const [displayName, setDisplayName] = React.useState('');
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState('');
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [deletingProfile, setDeletingProfile] = React.useState(false);
  const [profileSaveError, setProfileSaveError] = React.useState<string | null>(null);

  const [expenseCustom, setExpenseCustom] = React.useState<string[]>([]);
  const [incomeCustom, setIncomeCustom] = React.useState<string[]>([]);
  const [expenseDraft, setExpenseDraft] = React.useState('');
  const [incomeDraft, setIncomeDraft] = React.useState('');

  const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);

  React.useEffect(() => {
    setExpenseCustom(loadCustomCategories('expense'));
    setIncomeCustom(loadCustomCategories('income'));
  }, []);

  React.useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
    setPhotoFile(null);
    setPhotoPreview(profile?.photoURL ?? '');
    setProfileSaveError(null);
  }, [profile]);

  React.useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setSigningOut(false);
    }
  }

  function commitCategories(type: 'expense' | 'income', next: string[]) {
    saveCustomCategories(type, next);
    const refreshed = loadCustomCategories(type);
    if (type === 'expense') setExpenseCustom(refreshed);
    else setIncomeCustom(refreshed);
  }

  function addCategory(type: 'expense' | 'income') {
    const draft = type === 'expense' ? expenseDraft : incomeDraft;
    const name = draft.trim();
    if (!name) return;
    const existing = type === 'expense' ? expenseCustom : incomeCustom;
    commitCategories(type, [name, ...existing]);
    if (type === 'expense') setExpenseDraft('');
    else setIncomeDraft('');
    toast.success('Category saved.');
  }

  function removeCategory(type: 'expense' | 'income', name: string) {
    const existing = type === 'expense' ? expenseCustom : incomeCustom;
    commitCategories(
      type,
      existing.filter((c) => c !== name),
    );
    toast.success('Category removed.');
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const name = displayName.trim();
    if (!name) {
      setProfileSaveError('Display name is required.');
      return;
    }

    setSavingProfile(true);
    setProfileSaveError(null);
    try {
      let nextPhotoURL = profile?.photoURL ?? null;
      if (photoFile) {
        nextPhotoURL = await uploadUserProfilePhoto(user.uid, photoFile);
      }

      await setUserProfile(user.uid, {
        displayName: name,
        photoURL: nextPhotoURL,
      });
      toast.success('Profile saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile.';
      setProfileSaveError(message);
      toast.danger(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onRemovePhoto() {
    if (!user) return;
    if (!profile?.photoURL) return;
    setSavingProfile(true);
    setProfileSaveError(null);
    try {
      try {
        await deleteUserProfilePhoto(user.uid);
      } catch (err) {
        if (err instanceof Error && err.message.includes('object-not-found')) {
          // Ignore missing objects when clearing profile photo.
        } else {
          throw err;
        }
      }
      await updateUserProfile(user.uid, { photoURL: null });
      setPhotoFile(null);
      setPhotoPreview('');
      toast.success('Profile photo removed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove photo.';
      setProfileSaveError(message);
      toast.danger(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onDeleteProfile() {
    if (!user) return;
    setDeletingProfile(true);
    try {
      if (profile?.photoURL) {
        try {
          await deleteUserProfilePhoto(user.uid);
        } catch (err) {
          if (err instanceof Error && err.message.includes('object-not-found')) {
            // Ignore missing objects when removing profile.
          } else {
            throw err;
          }
        }
      }
      await deleteUserProfile(user.uid);
      toast.success('Profile removed.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to remove profile.');
    } finally {
      setDeletingProfile(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[13px] text-zinc-400 sm:text-sm">Workspace & Preferences</div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="text-sm font-semibold">Profile</div>
          <div className="mt-2 text-sm text-zinc-300">
            Email: <span className="font-semibold">{user?.email ?? '—'}</span>
          </div>
          <form onSubmit={onSaveProfile} className="mt-4 flex flex-col gap-3">
            <Input
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
            />
            <Input
              label="Profile image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  setProfileSaveError('Image must be 2MB or smaller.');
                  return;
                }
                if (photoPreview && photoPreview.startsWith('blob:')) {
                  URL.revokeObjectURL(photoPreview);
                }
                setProfileSaveError(null);
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
              }}
              hint="PNG or JPG, up to 2MB"
            />
            {profileSaveError ? (
              <div className="text-xs text-amber-300">{profileSaveError}</div>
            ) : null}
            {profileError ? (
              <div className="text-xs text-amber-300">{profileError}</div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={savingProfile || profileLoading}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onDeleteProfile}
                disabled={deletingProfile || profileLoading}>
                {deletingProfile ? 'Removing…' : 'Remove profile'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onRemovePhoto}
                disabled={savingProfile || profileLoading || !profile?.photoURL}>
                Remove photo
              </Button>
            </div>
          </form>
          {photoPreview ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              <img
                src={photoPreview}
                alt="Profile"
                className="h-12 w-12 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Preview
                </div>
                <div className="truncate text-sm font-semibold text-zinc-100">
                  {displayName || '—'}
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Product
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">Productivity Space</div>
            <div className="mt-1 text-sm text-zinc-400">
              Personal workspace for tasks, notes, planner, focus, and finance.
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/tasks"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] font-semibold text-zinc-100 hover:bg-zinc-900 sm:text-sm">
              Open tasks
            </Link>
            <Link
              href="/app/planner"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] font-semibold text-zinc-100 hover:bg-zinc-900 sm:text-sm">
              Open planner
            </Link>
            <Link
              href="/app/finance"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] font-semibold text-zinc-100 hover:bg-zinc-900 sm:text-sm">
              Open finance
            </Link>
          </div>
          <div className="mt-4">
            <Button variant="danger" onClick={onSignOut} disabled={signingOut} className="w-full">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Analytics: {analyticsEnabled ? 'Enabled' : 'Disabled'} • Firestore realtime data
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">Custom finance categories (optional)</div>
            <div className="text-xs text-zinc-500">
              Default categories stay. Custom categories are saved in the browser (localStorage).
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-zinc-400">Expense</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  label="Add category"
                  value={expenseDraft}
                  onChange={(e) => setExpenseDraft(e.target.value)}
                  placeholder="Example: Coffee"/>
                <Button
                  size="sm"
                  onClick={() => addCategory('expense')}
                  disabled={!expenseDraft.trim()}
                  className="h-10">
                  Add
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {expenseCustom.length === 0 ? (
                  <div className="text-sm text-zinc-500">No custom categories yet.</div>
                ) : (
                  expenseCustom.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-200">
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCategory('expense', c)}
                        className="rounded-full px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                        aria-label={`Remove category ${c}`}>
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-zinc-500 sm:text-xs">
                  Default: {EXPENSE_CATEGORIES.join(', ')}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => commitCategories('expense', [])}
                  disabled={expenseCustom.length === 0}>
                  Reset
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-400">Income</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  label="Add category"
                  value={incomeDraft}
                  onChange={(e) => setIncomeDraft(e.target.value)}
                  placeholder="Example: Bonus"/>
                <Button
                  size="sm"
                  onClick={() => addCategory('income')}
                  disabled={!incomeDraft.trim()}
                  className="h-10">
                  Add
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {incomeCustom.length === 0 ? (
                  <div className="text-sm text-zinc-500">No custom categories yet.</div>
                ) : (
                  incomeCustom.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-200">
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCategory('income', c)}
                        className="rounded-full px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                        aria-label={`Remove category ${c}`}>
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-zinc-500 sm:text-xs">Default: {INCOME_CATEGORIES.join(', ')}</div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => commitCategories('income', [])}
                  disabled={incomeCustom.length === 0}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">Shortcut</div>
          <div className="mt-2 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-3">
              <span>Quick capture</span>
              <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-200">
                Q
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Quick add task</span>
              <Link
                href="/app/tasks?compose=task"
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-900">
                Open
              </Link>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Tip: use quick capture to add tasks, notes, planner blocks, goals, or transactions from any page.
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold">Data architecture</div>
          <div className="mt-2 text-sm text-zinc-300">
            Core modules are split into <span className="font-semibold">tasks</span>,{' '}
            <span className="font-semibold">notes</span>,{' '}
            <span className="font-semibold">plannerBlocks</span>,{' '}
            <span className="font-semibold">goals</span>,{' '}
            <span className="font-semibold">focusSessions</span>, plus the existing finance module.
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Public registration stays disabled. For extra safety, restrict access in{' '}
            <span className="font-semibold">firestore.rules</span> and deploy the latest rules to Firebase.
          </div>
        </Card>
      </div>
    </div>
  );
}
