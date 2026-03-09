import { redirect } from 'next/navigation';

export default function TransactionsRedirectPage() {
  redirect('/app/finance');
}
