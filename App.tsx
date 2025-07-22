import React, { useState, useEffect } from 'react';
import { auth, db } from './services/firebase';
import { User, Transaction, Goal, Wallet, Debt, NavItem, Theme, UserProfile } from './types';
import { 
  DashboardIcon, 
  TransactionsIcon, 
  GoalsIcon, 
  DebtsIcon, 
  ProfileIcon,
  PlusIcon,
  XIcon,
  GoogleIcon,
  CashIcon,
  BankIcon,
  EWalletIcon,
  WalletPlusIcon,
  FoodIcon,
  TransportIcon,
  ShoppingIcon,
  BillsIcon,
  GenericCategoryIcon,
  TargetIcon,
  SunIcon,
  MoonIcon,
  PencilIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  CheckCircleIcon
} from './components/Icons';
import { TRANSACTION_CATEGORIES, CURRENCIES, AVATAR_OPTIONS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ theme: 'dark', currency: 'IDR' });
  
  // Modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showEditWalletModal, setShowEditWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  // Form states
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    note: '',
    walletId: '',
    allocatedToGoal: { goalId: '', amount: 0 }
  });

  const [goalForm, setGoalForm] = useState({
    title: '',
    targetAmount: '',
    deadline: ''
  });

  const [walletForm, setWalletForm] = useState({
    name: '',
    balance: '',
    type: 'cash' as 'cash' | 'bank' | 'ewallet'
  });

  const [debtForm, setDebtForm] = useState({
    personName: '',
    amount: '',
    type: 'i_owe' as 'owed_to_me' | 'i_owe',
    dueDate: '',
    description: ''
  });

  const [profileForm, setProfileForm] = useState({
    displayName: '',
    photoURL: '',
    theme: 'dark' as Theme,
    currency: 'IDR'
  });

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Auth effect
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
        loadUserProfile(user.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Realtime data listeners
  useEffect(() => {
    if (!user) return;

    // Transactions listener
    const unsubscribeTransactions = db.collection('transactions')
      .where('userId', '==', user.uid)
      .orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        setTransactions(transactionsData);
      });

    // Goals listener
    const unsubscribeGoals = db.collection('goals')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const goalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Goal[];
        setGoals(goalsData);
      });

    // Wallets listener
    const unsubscribeWallets = db.collection('wallets')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const walletsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Wallet[];
        setWallets(walletsData);
      });

    // Debts listener
    const unsubscribeDebts = db.collection('debts')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const debtsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Debt[];
        setDebts(debtsData);
      });

    return () => {
      unsubscribeTransactions();
      unsubscribeGoals();
      unsubscribeWallets();
      unsubscribeDebts();
    };
  }, [user]);

  const loadUserProfile = async (userId: string) => {
    try {
      const doc = await db.collection('userProfiles').doc(userId).get();
      if (doc.exists) {
        const profile = doc.data() as UserProfile;
        setUserProfile(profile);
        setProfileForm({
          displayName: user?.displayName || '',
          photoURL: user?.photoURL || '',
          theme: profile.theme,
          currency: profile.currency
        });
        
        // Apply theme
        if (profile.theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await auth.signInWithPopup(new auth.GoogleAuthProvider());
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const addTransaction = async () => {
    if (!user || !transactionForm.amount || !transactionForm.category || !transactionForm.walletId) return;

    try {
      const amount = parseFloat(transactionForm.amount);
      const selectedWallet = wallets.find(w => w.id === transactionForm.walletId);
      if (!selectedWallet) return;

      // Update wallet balance
      const newBalance = transactionForm.type === 'income' 
        ? selectedWallet.balance + amount 
        : selectedWallet.balance - amount;

      await db.collection('wallets').doc(transactionForm.walletId).update({
        balance: newBalance
      });

      // Add transaction
      const transactionData = {
        userId: user.uid,
        amount,
        type: transactionForm.type,
        category: transactionForm.category,
        date: new Date(),
        note: transactionForm.note,
        walletId: transactionForm.walletId,
        ...(transactionForm.allocatedToGoal.goalId && transactionForm.allocatedToGoal.amount > 0 && {
          allocatedToGoal: transactionForm.allocatedToGoal
        })
      };

      await db.collection('transactions').add(transactionData);

      // Update goal if allocated
      if (transactionForm.allocatedToGoal.goalId && transactionForm.allocatedToGoal.amount > 0) {
        const goal = goals.find(g => g.id === transactionForm.allocatedToGoal.goalId);
        if (goal) {
          await db.collection('goals').doc(transactionForm.allocatedToGoal.goalId).update({
            savedAmount: goal.savedAmount + transactionForm.allocatedToGoal.amount
          });
        }
      }

      setTransactionForm({
        amount: '',
        type: 'expense',
        category: '',
        note: '',
        walletId: '',
        allocatedToGoal: { goalId: '', amount: 0 }
      });
      setShowTransactionModal(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const addGoal = async () => {
    if (!user || !goalForm.title || !goalForm.targetAmount) return;

    try {
      const goalData = {
        userId: user.uid,
        title: goalForm.title,
        targetAmount: parseFloat(goalForm.targetAmount),
        savedAmount: 0,
        createdAt: new Date(),
        ...(goalForm.deadline && { deadline: new Date(goalForm.deadline) })
      };

      await db.collection('goals').add(goalData);
      setGoalForm({ title: '', targetAmount: '', deadline: '' });
      setShowGoalModal(false);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const addWallet = async () => {
    if (!user || !walletForm.name || !walletForm.balance) return;

    try {
      const walletData = {
        userId: user.uid,
        name: walletForm.name,
        balance: parseFloat(walletForm.balance),
        type: walletForm.type,
        createdAt: new Date()
      };

      await db.collection('wallets').add(walletData);
      setWalletForm({ name: '', balance: '', type: 'cash' });
      setShowWalletModal(false);
    } catch (error) {
      console.error('Error adding wallet:', error);
    }
  };

  const updateWallet = async () => {
    if (!editingWallet || !walletForm.name || !walletForm.balance) return;

    try {
      await db.collection('wallets').doc(editingWallet.id).update({
        name: walletForm.name,
        balance: parseFloat(walletForm.balance),
        type: walletForm.type
      });

      setWalletForm({ name: '', balance: '', type: 'cash' });
      setShowEditWalletModal(false);
      setEditingWallet(null);
    } catch (error) {
      console.error('Error updating wallet:', error);
    }
  };

  const deleteWallet = async (walletId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus wallet ini?')) return;

    try {
      await db.collection('wallets').doc(walletId).delete();
    } catch (error) {
      console.error('Error deleting wallet:', error);
    }
  };

  const addDebt = async () => {
    if (!user || !debtForm.personName || !debtForm.amount) return;

    try {
      const debtData = {
        userId: user.uid,
        personName: debtForm.personName,
        amount: parseFloat(debtForm.amount),
        type: debtForm.type,
        description: debtForm.description,
        isPaid: false,
        createdAt: new Date(),
        ...(debtForm.dueDate && { dueDate: new Date(debtForm.dueDate) })
      };

      await db.collection('debts').add(debtData);
      setDebtForm({ personName: '', amount: '', type: 'i_owe', dueDate: '', description: '' });
      setShowDebtModal(false);
    } catch (error) {
      console.error('Error adding debt:', error);
    }
  };

  const toggleDebtPaid = async (debtId: string, isPaid: boolean) => {
    try {
      await db.collection('debts').doc(debtId).update({ isPaid: !isPaid });
    } catch (error) {
      console.error('Error updating debt:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      // Update Firebase Auth profile
      await user.updateProfile({
        displayName: profileForm.displayName,
        photoURL: profileForm.photoURL
      });

      // Update user profile in Firestore
      await db.collection('userProfiles').doc(user.uid).set({
        theme: profileForm.theme,
        currency: profileForm.currency
      }, { merge: true });

      // Apply theme immediately
      if (profileForm.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }

      setUserProfile({ theme: profileForm.theme, currency: profileForm.currency });
      
      // Update local user state
      setUser({
        ...user,
        displayName: profileForm.displayName,
        photoURL: profileForm.photoURL
      });

      alert('Profile berhasil diperbarui!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Gagal memperbarui profile.');
    }
  };

  const changePassword = async () => {
    if (!user || !passwordForm.currentPassword || !passwordForm.newPassword) return;
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Password baru dan konfirmasi password tidak cocok!');
      return;
    }

    try {
      // Re-authenticate user
      const credential = auth.EmailAuthProvider.credential(
        user.email!,
        passwordForm.currentPassword
      );
      await user.reauthenticateWithCredential(credential);
      
      // Update password
      await user.updatePassword(passwordForm.newPassword);
      
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordFields(false);
      alert('Password berhasil diubah!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Gagal mengubah password. Pastikan password lama benar.');
    }
  };

  const openEditWallet = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setWalletForm({
      name: wallet.name,
      balance: wallet.balance.toString(),
      type: wallet.type
    });
    setShowEditWalletModal(true);
  };

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: userProfile.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food': return <FoodIcon className="w-5 h-5" />;
      case 'transport': return <TransportIcon className="w-5 h-5" />;
      case 'shopping': return <ShoppingIcon className="w-5 h-5" />;
      case 'bills': return <BillsIcon className="w-5 h-5" />;
      default: return <GenericCategoryIcon className="w-5 h-5" />;
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'cash': return <CashIcon className="w-5 h-5" />;
      case 'bank': return <BankIcon className="w-5 h-5" />;
      case 'ewallet': return <EWalletIcon className="w-5 h-5" />;
      default: return <CashIcon className="w-5 h-5" />;
    }
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalDebt = debts.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-dark-text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="bg-dark-surface p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark-text-primary mb-2">Savvi</h1>
            <p className="text-dark-text-secondary">Personal Finance Tracker</p>
          </div>
          
          <button
            onClick={signInWithGoogle}
            className="w-full bg-white text-gray-800 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <GoogleIcon className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${userProfile.theme === 'dark' ? 'dark bg-dark-bg' : 'bg-light-bg'}`}>
      {/* Navigation */}
      <nav className={`${userProfile.theme === 'dark' ? 'bg-dark-surface border-dark-border' : 'bg-light-surface border-light-border'} border-b px-4 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className={`text-xl font-bold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
            Savvi
          </h1>
          
          <div className="flex items-center gap-6">
            {[
              { id: 'dashboard', icon: DashboardIcon, label: 'Dashboard' },
              { id: 'transactions', icon: TransactionsIcon, label: 'Transactions' },
              { id: 'goals', icon: GoalsIcon, label: 'Goals' },
              { id: 'debts', icon: DebtsIcon, label: 'Debts' },
              { id: 'profile', icon: ProfileIcon, label: 'Profile' }
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveNav(id as NavItem)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  activeNav === id
                    ? 'bg-primary text-white'
                    : userProfile.theme === 'dark'
                    ? 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-border'
                    : 'text-light-text-secondary hover:text-light-text-primary hover:bg-light-border'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <img
              src={user.photoURL || AVATAR_OPTIONS[0]}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
            <button
              onClick={signOut}
              className={`px-3 py-1 rounded text-sm ${
                userProfile.theme === 'dark'
                  ? 'text-dark-text-secondary hover:text-dark-text-primary'
                  : 'text-light-text-secondary hover:text-light-text-primary'
              }`}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {activeNav === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
                <h3 className={`text-sm font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Total Balance
                </h3>
                <p className={`text-2xl font-bold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              
              <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
                <h3 className={`text-sm font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Total Income
                </h3>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              
              <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
                <h3 className={`text-sm font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Total Expense
                </h3>
                <p className="text-2xl font-bold text-red-500">
                  {formatCurrency(totalExpense)}
                </p>
              </div>
              
              <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
                <h3 className={`text-sm font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Total Debt
                </h3>
                <p className="text-2xl font-bold text-orange-500">
                  {formatCurrency(totalDebt)}
                </p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                  Recent Transactions
                </h2>
                <button
                  onClick={() => setShowTransactionModal(true)}
                  className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-focus transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Transaction
                </button>
              </div>
              
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => {
                  const wallet = wallets.find(w => w.id === transaction.walletId);
                  return (
                    <div key={transaction.id} className={`flex items-center justify-between p-3 rounded-lg ${userProfile.theme === 'dark' ? 'bg-dark-bg' : 'bg-light-bg'}`}>
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(transaction.category)}
                        <div>
                          <p className={`font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                            {transaction.category}
                          </p>
                          <p className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                            {wallet?.name} • {transaction.date.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeNav === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className={`text-2xl font-bold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Transactions
              </h1>
              <button
                onClick={() => setShowTransactionModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-focus transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Transaction
              </button>
            </div>

            <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} rounded-lg shadow-sm overflow-hidden`}>
              <div className="space-y-0">
                {transactions.map((transaction) => {
                  const wallet = wallets.find(w => w.id === transaction.walletId);
                  return (
                    <div key={transaction.id} className={`flex items-center justify-between p-4 border-b ${userProfile.theme === 'dark' ? 'border-dark-border' : 'border-light-border'} last:border-b-0`}>
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(transaction.category)}
                        <div>
                          <p className={`font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                            {transaction.category}
                          </p>
                          <p className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                            {wallet?.name} • {transaction.date.toDate().toLocaleDateString()}
                          </p>
                          {transaction.note && (
                            <p className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                              {transaction.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeNav === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className={`text-2xl font-bold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Savings Goals
              </h1>
              <button
                onClick={() => setShowGoalModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-focus transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Goal
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => {
                const progress = (goal.savedAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
                    <div className="flex items-center gap-3 mb-4">
                      <TargetIcon className="w-6 h-6 text-primary" />
                      <h3 className={`font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                        {goal.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className={userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}>
                          Progress
                        </span>
                        <span className={userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}>
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className={`w-full ${userProfile.theme === 'dark' ? 'bg-dark-border' : 'bg-light-border'} rounded-full h-2`}>
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between">
                        <span className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                          {formatCurrency(goal.savedAmount)}
                        </span>
                        <span className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      
                      {goal.deadline && (
                        <p className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                          Deadline: {goal.deadline.toDate().toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeNav === 'debts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className={`text-2xl font-bold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Debts
              </h1>
              <button
                onClick={() => setShowDebtModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-focus transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Debt
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {debts.map((debt) => (
                <div key={debt.id} className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${debt.type === 'owed_to_me' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <h3 className={`font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                        {debt.personName}
                      </h3>
                    </div>
                    <button
                      onClick={() => toggleDebtPaid(debt.id, debt.isPaid)}
                      className={`p-1 rounded ${debt.isPaid ? 'text-green-500' : userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className={`text-lg font-semibold ${debt.type === 'owed_to_me' ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(debt.amount)}
                    </p>
                    <p className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                      {debt.type === 'owed_to_me' ? 'Owes me' : 'I owe'}
                    </p>
                    {debt.description && (
                      <p className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                        {debt.description}
                      </p>
                    )}
                    {debt.dueDate && (
                      <p className={`text-sm ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                        Due: {debt.dueDate.toDate().toLocaleDateString()}
                      </p>
                    )}
                    <p className={`text-sm ${debt.isPaid ? 'text-green-500' : 'text-orange-500'}`}>
                      {debt.isPaid ? 'Paid' : 'Unpaid'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeNav === 'profile' && (
          <div className="space-y-6">
            <h1 className={`text-2xl font-bold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
              Profile
            </h1>

            {/* Profile Settings */}
            <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
              <h2 className={`text-lg font-semibold mb-4 ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Profile Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      userProfile.theme === 'dark'
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                        : 'bg-light-bg border-light-border text-light-text-primary'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                    Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={profileForm.photoURL || AVATAR_OPTIONS[0]}
                      alt="Current avatar"
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="grid grid-cols-5 gap-2">
                      {AVATAR_OPTIONS.map((avatar, index) => (
                        <button
                          key={index}
                          onClick={() => setProfileForm({ ...profileForm, photoURL: avatar })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            profileForm.photoURL === avatar ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full rounded-full" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                      Theme
                    </label>
                    <select
                      value={profileForm.theme}
                      onChange={(e) => setProfileForm({ ...profileForm, theme: e.target.value as Theme })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        userProfile.theme === 'dark'
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                          : 'bg-light-bg border-light-border text-light-text-primary'
                      }`}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                      Currency
                    </label>
                    <select
                      value={profileForm.currency}
                      onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        userProfile.theme === 'dark'
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                          : 'bg-light-bg border-light-border text-light-text-primary'
                      }`}
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={updateProfile}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors"
                >
                  Update Profile
                </button>
              </div>
            </div>

            {/* Wallets Management */}
            <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                  My Wallets
                </h2>
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-focus transition-colors"
                >
                  <WalletPlusIcon className="w-4 h-4" />
                  Add Wallet
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className={`p-4 rounded-lg border ${userProfile.theme === 'dark' ? 'bg-dark-bg border-dark-border' : 'bg-light-bg border-light-border'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getWalletIcon(wallet.type)}
                        <div>
                          <h3 className={`font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                            {wallet.name}
                          </h3>
                          <p className={`text-sm capitalize ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                            {wallet.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditWallet(wallet)}
                          className={`p-1 rounded hover:bg-opacity-20 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary hover:bg-dark-text-secondary' : 'text-light-text-secondary hover:bg-light-text-secondary'}`}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteWallet(wallet.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-500 hover:bg-opacity-20"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                      {formatCurrency(wallet.balance)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Password Change */}
            {user.email && (
              <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                    Change Password
                  </h2>
                  <button
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    className="text-primary hover:text-primary-focus"
                  >
                    {showPasswordFields ? 'Cancel' : 'Change Password'}
                  </button>
                </div>

                {showPasswordFields && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                          userProfile.theme === 'dark'
                            ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                            : 'bg-light-bg border-light-border text-light-text-primary'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                          userProfile.theme === 'dark'
                            ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                            : 'bg-light-bg border-light-border text-light-text-primary'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                          userProfile.theme === 'dark'
                            ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                            : 'bg-light-bg border-light-border text-light-text-primary'
                        }`}
                      />
                    </div>

                    <button
                      onClick={changePassword}
                      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-lg max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Add Transaction
              </h2>
              <button
                onClick={() => setShowTransactionModal(false)}
                className={userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTransactionForm({ ...transactionForm, type: 'income' })}
                  className={`py-2 px-4 rounded-lg font-medium ${
                    transactionForm.type === 'income'
                      ? 'bg-green-500 text-white'
                      : userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Income
                </button>
                <button
                  onClick={() => setTransactionForm({ ...transactionForm, type: 'expense' })}
                  className={`py-2 px-4 rounded-lg font-medium ${
                    transactionForm.type === 'expense'
                      ? 'bg-red-500 text-white'
                      : userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Expense
                </button>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Amount
                </label>
                <input
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Category
                </label>
                <select
                  value={transactionForm.category}
                  onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                >
                  <option value="">Select category</option>
                  {TRANSACTION_CATEGORIES[transactionForm.type].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Wallet
                </label>
                <select
                  value={transactionForm.walletId}
                  onChange={(e) => setTransactionForm({ ...transactionForm, walletId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                >
                  <option value="">Select wallet</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({formatCurrency(wallet.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={transactionForm.note}
                  onChange={(e) => setTransactionForm({ ...transactionForm, note: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="Add a note..."
                />
              </div>

              {transactionForm.type === 'income' && goals.length > 0 && (
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                    Allocate to Goal (Optional)
                  </label>
                  <select
                    value={transactionForm.allocatedToGoal.goalId}
                    onChange={(e) => setTransactionForm({
                      ...transactionForm,
                      allocatedToGoal: { ...transactionForm.allocatedToGoal, goalId: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      userProfile.theme === 'dark'
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                        : 'bg-light-bg border-light-border text-light-text-primary'
                    }`}
                  >
                    <option value="">No goal allocation</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                  {transactionForm.allocatedToGoal.goalId && (
                    <input
                      type="number"
                      value={transactionForm.allocatedToGoal.amount}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        allocatedToGoal: { ...transactionForm.allocatedToGoal, amount: parseFloat(e.target.value) || 0 }
                      })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        userProfile.theme === 'dark'
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                          : 'bg-light-bg border-light-border text-light-text-primary'
                      }`}
                      placeholder="Amount to allocate"
                      max={transactionForm.amount}
                    />
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={addTransaction}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-focus transition-colors"
                >
                  Add Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-lg max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Add Savings Goal
              </h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className={userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Goal Title
                </label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="e.g., Emergency Fund"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Target Amount
                </label>
                <input
                  type="number"
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowGoalModal(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={addGoal}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-focus transition-colors"
                >
                  Add Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-lg max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Add Wallet
              </h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className={userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={walletForm.name}
                  onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="e.g., Main Wallet"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Initial Balance
                </label>
                <input
                  type="number"
                  value={walletForm.balance}
                  onChange={(e) => setWalletForm({ ...walletForm, balance: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Wallet Type
                </label>
                <select
                  value={walletForm.type}
                  onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value as 'cash' | 'bank' | 'ewallet' })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Account</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowWalletModal(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={addWallet}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-focus transition-colors"
                >
                  Add Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Wallet Modal */}
      {showEditWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-lg max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Edit Wallet
              </h2>
              <button
                onClick={() => setShowEditWalletModal(false)}
                className={userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={walletForm.name}
                  onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="e.g., Main Wallet"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Balance
                </label>
                <input
                  type="number"
                  value={walletForm.balance}
                  onChange={(e) => setWalletForm({ ...walletForm, balance: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Wallet Type
                </label>
                <select
                  value={walletForm.type}
                  onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value as 'cash' | 'bank' | 'ewallet' })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Account</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditWalletModal(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={updateWallet}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-focus transition-colors"
                >
                  Update Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt Modal */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${userProfile.theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'} p-6 rounded-lg shadow-lg max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${userProfile.theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                Add Debt
              </h2>
              <button
                onClick={() => setShowDebtModal(false)}
                className={userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDebtForm({ ...debtForm, type: 'owed_to_me' })}
                  className={`py-2 px-4 rounded-lg font-medium ${
                    debtForm.type === 'owed_to_me'
                      ? 'bg-green-500 text-white'
                      : userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Owed to Me
                </button>
                <button
                  onClick={() => setDebtForm({ ...debtForm, type: 'i_owe' })}
                  className={`py-2 px-4 rounded-lg font-medium ${
                    debtForm.type === 'i_owe'
                      ? 'bg-red-500 text-white'
                      : userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  I Owe
                </button>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Person Name
                </label>
                <input
                  type="text"
                  value={debtForm.personName}
                  onChange={(e) => setDebtForm({ ...debtForm, personName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Amount
                </label>
                <input
                  type="number"
                  value={debtForm.amount}
                  onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={debtForm.dueDate}
                  onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${userProfile.theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={debtForm.description}
                  onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-bg border-dark-border text-dark-text-primary'
                      : 'bg-light-bg border-light-border text-light-text-primary'
                  }`}
                  placeholder="Add a description..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDebtModal(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                    userProfile.theme === 'dark'
                      ? 'bg-dark-border text-dark-text-secondary'
                      : 'bg-light-border text-light-text-secondary'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={addDebt}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-focus transition-colors"
                >
                  Add Debt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
