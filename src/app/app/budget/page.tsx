import { redirect } from 'next/navigation';

export default function BudgetRedirectPage() {
  redirect('/app/finance');
}
