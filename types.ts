
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export type Timestamp = firebase.firestore.Timestamp;

export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export type TransactionType = 'income' | 'expense';

export interface AllocatedToGoal {
  goalId: string;
  amount: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: Timestamp;
  note?: string;
  walletId: string;
  allocatedToGoal?: AllocatedToGoal;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: Timestamp;
  createdAt: Timestamp;
}

export type WalletType = 'cash' | 'bank' | 'ewallet';

export interface Wallet {
  id:string;
  userId: string;
  name: string;
  balance: number;
  type: WalletType;
  createdAt: Timestamp;
}

export type DebtType = 'owed_to_me' | 'i_owe';

export interface Debt {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  type: DebtType;
  dueDate?: Timestamp;
  description?: string;
  isPaid: boolean;
  createdAt: Timestamp;
}

export type Theme = 'dark' | 'light';

export interface UserProfile {
  theme: Theme;
  currency: string;
}

export type NavItem = 'dashboard' | 'transactions' | 'goals' | 'debts' | 'profile';