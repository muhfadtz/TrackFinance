



import React, { useState, useEffect, useMemo, FC, createContext, useContext } from 'react';
import { auth, db, googleProvider, firebase } from './services/firebase';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import type { User, Transaction, Goal, Wallet, Debt, NavItem, UserProfile, Theme, TransactionType, WalletType, DebtType } from './types';
import { 
    DashboardIcon, TransactionsIcon, GoalsIcon, DebtsIcon, ProfileIcon, PlusIcon, XIcon, GoogleIcon,
    CashIcon, BankIcon, EWalletIcon, SunIcon, MoonIcon, FoodIcon, TransportIcon, ShoppingIcon, BillsIcon, GenericCategoryIcon,
    CheckCircleIcon, WalletPlusIcon, TargetIcon, PencilIcon, EyeOpenIcon, EyeClosedIcon
} from './components/Icons';
import { TRANSACTION_CATEGORIES, CURRENCIES, AVATAR_OPTIONS } from './constants';

// =================================================================================
// Theme Context
// =================================================================================
interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

const ThemeProvider: FC<{ children: React.ReactNode; initialTheme: Theme; onThemeChange: (newTheme: Theme) => void }> = ({ children, initialTheme, onThemeChange }) => {
    const [theme, setTheme] = useState<Theme>(initialTheme);

    useEffect(() => {
        setTheme(initialTheme);
    }, [initialTheme]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        document.body.className = `${theme === 'light' ? 'bg-light-bg text-light-text-primary' : 'bg-dark-bg text-dark-text-primary'} font-sans`;
    }, [theme]);

    const toggleTheme = () => {
        setTheme(currentTheme => {
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            onThemeChange(newTheme);
            return newTheme;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};


// =================================================================================
// Helper Functions & Components
// =================================================================================

const formatCurrency = (amount: number, currency: string = 'USD') => {
    try {
        return new Intl.NumberFormat(undefined, { 
            style: 'currency', 
            currency,
            minimumFractionDigits: 2
        }).format(amount);
    } catch (e) { // Fallback for invalid currency code
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }
};
const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const Spinner: FC = () => (
    <div className="flex justify-center items-center h-full w-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
    </div>
);

const EmptyState: FC<{icon: React.ReactNode, title: string, description: string, children?: React.ReactNode}> = ({icon, title, description, children}) => (
    <div className="text-center flex flex-col items-center justify-center p-10 mt-8">
        <div className="w-16 h-16 mb-4 text-light-text-secondary dark:text-dark-text-secondary">{icon}</div>
        <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">{title}</h3>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2 mb-4 max-w-sm">{description}</p>
        {children}
    </div>
)

interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }
const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-light-surface dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-light-border dark:border-dark-border">
                    <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">{title}</h3>
                    <button onClick={onClose} className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
const Input: FC<InputProps> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">{label}</label>
        <input id={id} {...props} className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-sm py-2.5 px-4 text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label: string; }
const Select: FC<SelectProps> = ({label, id, children, ...props}) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">{label}</label>
        <select id={id} {...props} className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-sm py-2.5 px-4 text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-no-repeat bg-right pr-8" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
            {children}
        </select>
    </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'danger'; isLoading?: boolean; }
const Button: FC<ButtonProps> = ({ children, variant = 'primary', isLoading, ...props }) => {
    const baseClasses = "w-full flex justify-center items-center gap-2 font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-95";
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-focus focus:ring-primary focus:ring-offset-light-surface dark:focus:ring-offset-dark-surface',
        secondary: 'bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary hover:bg-light-bg dark:hover:bg-dark-bg focus:ring-primary focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg',
        danger: 'bg-danger text-white hover:bg-danger-focus focus:ring-danger focus:ring-offset-light-surface dark:focus:ring-offset-dark-surface',
    };
    return (
        <button {...props} disabled={isLoading || props.disabled} className={`${baseClasses} ${variantClasses[variant]}`}>
            {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> : children}
        </button>
    );
};

const ProgressBar: FC<{value: number, max: number}> = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="w-full bg-light-bg dark:bg-dark-bg rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
    )
}

// =================================================================================
// Page Views / Screens
// =================================================================================

const DashboardView: FC<{ transactions: Transaction[], goals: Goal[], wallets: Wallet[], currency: string }> = ({ transactions, goals, wallets, currency }) => {
    const { theme } = useTheme();
    const [isBalanceVisible, setIsBalanceVisible] = useState(true);

    const formatCensoredCurrency = (amount: number, currency: string) => {
        if (isBalanceVisible) {
            return formatCurrency(amount, currency);
        }
        return '••••••';
    };
    
    const summary = useMemo(() => {
        const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0,0,0,0);
        
        const monthlyIncomes = transactions.filter(t => t.type === 'income' && t.date.toDate() >= thisMonth);
        const totalIncome = monthlyIncomes.reduce((sum, t) => sum + t.amount, 0);
        const totalAllocated = monthlyIncomes.reduce((sum, t) => sum + (t.allocatedToGoal?.amount || 0), 0);
        const netIncome = totalIncome - totalAllocated;

        const monthlyExpense = transactions
            .filter(t => t.type === 'expense' && t.date.toDate() >= thisMonth)
            .reduce((sum, t) => sum + t.amount, 0);
            
        return { totalBalance, netIncome, monthlyExpense };
    }, [transactions, wallets]);

    const chartData = useMemo(() => {
        const dataByDay: { [key: string]: { name: string, income: number, expense: number } } = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        transactions.filter(t => t.date.toDate() > thirtyDaysAgo).forEach(t => {
            const day = t.date.toDate().toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
            if (!dataByDay[day]) dataByDay[day] = { name: day, income: 0, expense: 0 };
            if (t.type === 'income') dataByDay[day].income += t.amount;
            else dataByDay[day].expense += t.amount;
        });
        return Object.values(dataByDay).sort((a,b) => new Date(a.name + ' ' + new Date().getFullYear()).getTime() - new Date(b.name + ' ' + new Date().getFullYear()).getTime());
    }, [transactions]);
    
    const WalletCard: FC<{ wallet: Wallet }> = ({ wallet }) => {
        const icons: Record<WalletType, React.ReactNode> = {
            cash: <CashIcon className="w-6 h-6 text-primary"/>,
            bank: <BankIcon className="w-6 h-6 text-blue-400"/>,
            ewallet: <EWalletIcon className="w-6 h-6 text-purple-400"/>
        };
        return (
            <div className="flex-shrink-0 w-48 bg-light-surface dark:bg-dark-surface p-4 rounded-2xl shadow-sm mr-4 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{wallet.name}</span>
                    {icons[wallet.type]}
                </div>
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mt-2">{formatCensoredCurrency(wallet.balance, currency)}</p>
            </div>
        )
    };
    
    const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);
    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('food')) return <FoodIcon className="w-5 h-5"/>;
        if (cat.includes('transport')) return <TransportIcon className="w-5 h-5"/>;
        if (cat.includes('shopping')) return <ShoppingIcon className="w-5 h-5"/>;
        if (cat.includes('bills')) return <BillsIcon className="w-5 h-5"/>;
        return <GenericCategoryIcon className="w-5 h-5"/>;
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="flex justify-center items-center gap-2">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Total Balance</p>
                    <button onClick={() => setIsBalanceVisible(v => !v)} className="text-light-text-secondary dark:text-dark-text-secondary">
                        {isBalanceVisible ? <EyeClosedIcon className="w-5 h-5"/> : <EyeOpenIcon className="w-5 h-5"/>}
                    </button>
                </div>
                <h1 className="text-4xl font-extrabold text-light-text-primary dark:text-dark-text-primary tracking-tight">{formatCensoredCurrency(summary.totalBalance, currency)}</h1>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/10 dark:bg-green-500/20 p-4 rounded-2xl">
                    <h3 className="font-bold text-green-600 dark:text-green-400">Net Income</h3>
                    <p className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">{formatCensoredCurrency(summary.netIncome, currency)}</p>
                </div>
                <div className="bg-red-500/10 dark:bg-red-500/20 p-4 rounded-2xl">
                    <h3 className="font-bold text-red-600 dark:text-red-400">Expenses</h3>
                    <p className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">{formatCensoredCurrency(summary.monthlyExpense, currency)}</p>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-3 px-1">Wallets</h2>
                <div className="flex overflow-x-auto pb-4 -mx-4 px-4">
                    {wallets.length > 0 ? wallets.map(wallet => <WalletCard key={wallet.id} wallet={wallet} />) : <p className="text-light-text-secondary dark:text-dark-text-secondary text-center py-4 w-full">No wallets yet.</p>}
                </div>
            </div>
            
            {chartData.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-3 px-1">30-Day Activity</h2>
                    <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-2xl h-64 shadow-sm">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="currentColor" className="text-light-text-secondary dark:text-dark-text-secondary" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="currentColor" className="text-light-text-secondary dark:text-dark-text-secondary" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(Number(value)/1000).toFixed(0)}k`}/>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                                        border: `1px solid ${theme === 'dark' ? '#2d3748' : '#e2e8f0'}`,
                                        borderRadius: '0.75rem'
                                    }}
                                    itemStyle={{ color: theme === 'dark' ? '#e2e8f0' : '#1a202c' }}
                                    labelStyle={{ color: theme === 'dark' ? '#a0aec0' : '#718096' }}
                                    formatter={(value:number) => formatCensoredCurrency(value, currency)}
                                />
                                <Legend wrapperStyle={{fontSize: '14px'}}/>
                                <Line type="monotone" dataKey="income" stroke="#1db954" strokeWidth={2.5} dot={false} name="Income" />
                                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Expense"/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            <div>
                 <h2 className="text-xl font-bold mb-3 px-1">Recent Transactions</h2>
                 <div className="space-y-2">
                    {recentTransactions.length > 0 ? recentTransactions.map(tx => (
                        <div key={tx.id} className="bg-light-surface dark:bg-dark-surface p-3 rounded-2xl flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {getCategoryIcon(tx.category)}
                                </div>
                                <div>
                                    <p className="font-bold text-light-text-primary dark:text-dark-text-primary">{tx.category}</p>
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{tx.note || wallets.find(w => w.id === tx.walletId)?.name}</p>
                                </div>
                            </div>
                            <p className={`font-bold text-base ${tx.type === 'income' ? 'text-primary' : 'text-danger'}`}>
                                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, currency)}
                            </p>
                        </div>
                    )) : <p className="text-light-text-secondary dark:text-dark-text-secondary text-center py-4">No transactions yet.</p>}
                 </div>
            </div>

        </div>
    );
};

const TransactionsView: React.FC<{ transactions: Transaction[], wallets: Wallet[], currency: string }> = ({ transactions, wallets, currency }) => {
    const getWalletName = (walletId: string) => wallets.find(w => w.id === walletId)?.name || 'N/A';
    
    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: Transaction[] } = {};
        [...transactions].forEach(tx => {
            const dateStr = formatDate(tx.date.toDate());
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(tx);
        });
        return groups;
    }, [transactions]);
    
    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('food')) return <FoodIcon className="w-5 h-5"/>;
        if (cat.includes('transport')) return <TransportIcon className="w-5 h-5"/>;
        if (cat.includes('shopping')) return <ShoppingIcon className="w-5 h-5"/>;
        if (cat.includes('bills')) return <BillsIcon className="w-5 h-5"/>;
        return <GenericCategoryIcon className="w-5 h-5"/>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold my-4">Transaction History</h1>
             {transactions.length > 0 ? Object.entries(groupedTransactions).map(([date, txs]) => (
                <div key={date} className="mb-6">
                    <h2 className="text-lg font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-3">{date}</h2>
                    <div className="space-y-3">
                        {txs.map(tx => (
                            <div key={tx.id} className="bg-light-surface dark:bg-dark-surface p-3 rounded-2xl flex justify-between items-center shadow-sm">
                               <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {getCategoryIcon(tx.category)}
                                  </div>
                                  <div>
                                      <p className="font-bold text-light-text-primary dark:text-dark-text-primary">{tx.category}</p>
                                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{tx.note || getWalletName(tx.walletId)}</p>
                                  </div>
                               </div>
                                <p className={`font-bold text-lg ${tx.type === 'income' ? 'text-primary' : 'text-danger'}`}>
                                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, currency)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )) : (
                 <EmptyState 
                    icon={<TransactionsIcon className="w-16 h-16"/>}
                    title="No Transactions"
                    description="You haven't made any transactions yet. Press the '+' button to get started."
                />
            )}
        </div>
    );
};

const GoalsView: React.FC<{ goals: Goal[], onAddGoal: () => void, currency: string }> = ({ goals, onAddGoal, currency }) => {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold my-4">Savings Goals</h1>
            {goals.length > 0 ? goals.map(goal => (
                <div key={goal.id} className="bg-light-surface dark:bg-dark-surface p-4 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">{goal.title}</h3>
                        <p className="font-bold text-primary">{formatCurrency(goal.targetAmount, currency)}</p>
                    </div>
                    <ProgressBar value={goal.savedAmount} max={goal.targetAmount} />
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-light-text-secondary dark:text-dark-text-secondary">Saved</span>
                        <span>{formatCurrency(goal.savedAmount, currency)}</span>
                    </div>
                </div>
            )) : (
                <EmptyState
                    icon={<TargetIcon className="w-16 h-16"/>}
                    title="Create Your First Goal"
                    description="Set savings targets for the things you want. Press the '+' button to get started."
                >
                    <div className="w-48 mt-4"><Button onClick={onAddGoal}>Create Goal</Button></div>
                </EmptyState>
            )}
        </div>
    );
};

const DebtsView: React.FC<{ debts: Debt[], onAddDebt: () => void, currency: string }> = ({ debts, onAddDebt, currency }) => {
    const [activeTab, setActiveTab] = useState<DebtType>('i_owe');
    
    const iOwe = useMemo(() => debts.filter(d => d.type === 'i_owe'), [debts]);
    const owedToMe = useMemo(() => debts.filter(d => d.type === 'owed_to_me'), [debts]);
    const currentList = activeTab === 'i_owe' ? iOwe : owedToMe;

    const togglePaidStatus = async (debt: Debt) => {
        try {
            await db.collection('debts').doc(debt.id).update({ isPaid: !debt.isPaid });
        } catch(err) { console.error("Failed to update debt status:", err); }
    }

    const DebtCard: FC<{debt: Debt}> = ({ debt }) => (
        <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-2xl flex justify-between items-center shadow-sm">
            <div>
                <p className="font-bold text-lg text-light-text-primary dark:text-dark-text-primary">{debt.personName}</p>
                <p className="text-light-text-secondary dark:text-dark-text-secondary">{debt.description || `Due: ${debt.dueDate ? formatDate(debt.dueDate.toDate()) : 'N/A'}`}</p>
                {debt.isPaid && <span className="text-xs font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full mt-1 inline-block">PAID</span>}
            </div>
            <div className="text-right">
                <p className={`font-bold text-lg ${debt.type === 'i_owe' ? 'text-danger' : 'text-primary'}`}>{formatCurrency(debt.amount, currency)}</p>
                {!debt.isPaid && <button onClick={() => togglePaidStatus(debt)} className="text-sm text-blue-500 hover:underline">Mark as Paid</button>}
            </div>
        </div>
    );
    
    return (
        <div>
            <h1 className="text-3xl font-bold my-4">Debt Management</h1>
            <div className="flex p-1 bg-light-bg dark:bg-dark-bg rounded-xl mb-4">
                <button onClick={() => setActiveTab('i_owe')} className={`w-full p-2 rounded-lg transition ${activeTab === 'i_owe' ? 'bg-primary text-white font-bold' : ''}`}>I Owe</button>
                <button onClick={() => setActiveTab('owed_to_me')} className={`w-full p-2 rounded-lg transition ${activeTab === 'owed_to_me' ? 'bg-primary text-white font-bold' : ''}`}>Owed to Me</button>
            </div>
            <div className="space-y-3">
                {currentList.length > 0 ? currentList.map(d => <DebtCard key={d.id} debt={d}/>) : (
                     <EmptyState
                        icon={<DebtsIcon className="w-16 h-16"/>}
                        title="No Debt Records"
                        description={`You don't have any records in this category. Press the '+' button to add one.`}
                     >
                        <div className="w-48 mt-4"><Button onClick={onAddDebt}>Add Debt</Button></div>
                     </EmptyState>
                )}
            </div>
        </div>
    );
};

const ProfileView: React.FC<{ 
    user: User; 
    profile: UserProfile; 
    wallets: Wallet[]; 
    onLogout: () => void; 
    onAddWallet: () => void;
    onEditWallet: (wallet: Wallet) => void;
    onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>; 
    onUpdateUser: (updates: Partial<User>) => void; 
}> = ({ user, profile, wallets, onLogout, onAddWallet, onEditWallet, onUpdateProfile, onUpdateUser }) => {
    const { theme, toggleTheme } = useTheme();
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [isNameSaving, setIsNameSaving] = useState(false);
    
    const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);
    const [isAvatarSaving, setAvatarSaving] = useState(false);

    useEffect(() => {
        if (!isEditingName) {
            setDisplayName(user.displayName || '');
        }
    }, [user.displayName, isEditingName]);

    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await onUpdateProfile({ currency: newCurrency });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000); // Hide after 2 seconds
        } catch (error) {
            console.error("Failed to update currency:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleNameUpdate = async () => {
        const newName = displayName.trim();
        if (!newName || newName === user.displayName) {
            setIsEditingName(false);
            setDisplayName(user.displayName || '');
            return;
        }

        setIsNameSaving(true);
        try {
            await auth.currentUser?.updateProfile({ displayName: newName });
            onUpdateUser({ displayName: newName });
            setIsEditingName(false);
        } catch (error) {
            console.error("Failed to update name:", error);
        } finally {
            setIsNameSaving(false);
        }
    };

    const cancelNameEdit = () => {
        setIsEditingName(false);
        setDisplayName(user.displayName || '');
    };
    
    const handleAvatarSelect = async (newAvatarUrl: string) => {
        if (!auth.currentUser) return;
        setAvatarSaving(true);
        try {
            await auth.currentUser.updateProfile({ photoURL: newAvatarUrl });
            onUpdateUser({ photoURL: newAvatarUrl });
            setAvatarModalOpen(false);
        } catch (error) {
            console.error("Failed to update avatar:", error);
        } finally {
            setAvatarSaving(false);
        }
    };

    const walletIcons: Record<WalletType, React.ReactNode> = {
        cash: <CashIcon className="w-5 h-5"/>,
        bank: <BankIcon className="w-5 h-5"/>,
        ewallet: <EWalletIcon className="w-5 h-5"/>
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold my-4">Profile</h1>
            <div className="flex flex-col items-center space-y-4 bg-light-surface dark:bg-dark-surface p-6 rounded-2xl shadow-sm">
                <div className="relative group">
                    <button 
                        onClick={() => setAvatarModalOpen(true)} 
                        className="rounded-full focus:outline-none focus:ring-4 focus:ring-primary/50 transition"
                        aria-label="Change profile picture"
                    >
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="Profile" className="w-24 h-24 rounded-full border-4 border-primary" />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PencilIcon className="w-8 h-8 text-white"/>
                        </div>
                    </button>
                </div>
                <div>
                    {!isEditingName ? (
                        <div className="flex items-center gap-2 py-2">
                             <h2 className="text-xl text-center font-bold text-light-text-primary dark:text-dark-text-primary">{user.displayName || 'User'}</h2>
                             <button onClick={() => setIsEditingName(true)} className="text-light-text-secondary dark:text-dark-text-secondary hover:text-primary transition-colors">
                                <PencilIcon className="w-5 h-5"/>
                             </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-sm py-2 px-4 text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-center text-xl font-bold"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleNameUpdate(); if (e.key === 'Escape') cancelNameEdit(); }}
                            />
                            <div className="flex gap-2 mt-2">
                                <button onClick={handleNameUpdate} disabled={isNameSaving || !displayName.trim()} className="bg-primary text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                                    {isNameSaving && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>}
                                    Save
                                </button>
                                <button onClick={cancelNameEdit} className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary font-bold py-2 px-4 rounded-lg text-sm transition-colors hover:bg-light-bg dark:hover:bg-dark-bg">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-center">{user.email}</p>
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-light-text-primary dark:text-dark-text-primary">Wallets</h3>
                <div className="space-y-1">
                    {wallets.map(w => (
                         <div key={w.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg group transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="text-light-text-secondary dark:text-dark-text-secondary">{walletIcons[w.type]}</span>
                                <span>{w.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold">{formatCurrency(w.balance, profile.currency)}</span>
                                <button onClick={() => onEditWallet(w)} className="opacity-0 group-hover:opacity-100 text-light-text-secondary dark:text-dark-text-secondary hover:text-primary transition-opacity" aria-label={`Edit ${w.name} wallet`}>
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="mt-3"><Button variant="secondary" onClick={onAddWallet}>+ Add New Wallet</Button></div>
            </div>
            
             <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-light-text-primary dark:text-dark-text-primary">Settings</h3>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="theme" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">App Theme</label>
                        <div className="flex space-x-2 bg-light-bg dark:bg-dark-bg p-1 rounded-xl">
                             <button onClick={() => theme !== 'light' && toggleTheme()} className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 transition ${theme === 'light' ? 'bg-primary text-white font-bold' : 'hover:bg-white/50 dark:hover:bg-white/10'}`}>
                                <SunIcon className="w-5 h-5"/> Light
                             </button>
                            <button onClick={() => theme !== 'dark' && toggleTheme()} className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 transition ${theme === 'dark' ? 'bg-primary text-white font-bold' : 'hover:bg-white/50 dark:hover:bg-white/10'}`}>
                                <MoonIcon className="w-5 h-5"/> Dark
                            </button>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label htmlFor="currency" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Currency</label>
                             <div className="h-4 text-xs">
                                {isSaving && <span className="text-light-text-secondary dark:text-dark-text-secondary animate-pulse">Saving...</span>}
                                {!isSaving && saveSuccess && (
                                    <span className="text-primary flex items-center gap-1">
                                        <CheckCircleIcon className="w-4 h-4" /> Saved
                                    </span>
                                )}
                             </div>
                        </div>
                        <select 
                            id="currency" 
                            value={profile.currency} 
                            onChange={handleCurrencyChange} 
                            disabled={isSaving}
                            className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-sm py-2.5 px-4 text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-no-repeat bg-right pr-8"
                            style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                        >
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            <Button onClick={onLogout} variant="danger">
                Logout
            </Button>
            
            <AvatarSelectionModal 
                isOpen={isAvatarModalOpen} 
                onClose={() => setAvatarModalOpen(false)}
                onSelectAvatar={handleAvatarSelect}
                isSaving={isAvatarSaving}
            />
        </div>
    );
};
// =================================================================================
// Modals
// =================================================================================
const AvatarSelectionModal: FC<{isOpen: boolean; onClose: () => void; onSelectAvatar: (url: string) => void; isSaving: boolean;}> = ({isOpen, onClose, onSelectAvatar, isSaving}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Choose Your Avatar">
            <div className="relative">
                {isSaving && (
                    <div className="absolute inset-0 bg-light-surface/70 dark:bg-dark-surface/70 flex items-center justify-center z-10 rounded-xl">
                        <Spinner />
                    </div>
                )}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                    {AVATAR_OPTIONS.map(url => (
                        <button 
                            key={url}
                            onClick={() => onSelectAvatar(url)}
                            disabled={isSaving}
                            className="p-2 rounded-full hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-dark-surface transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50"
                        >
                            <img src={url} alt="Avatar option" className="w-full h-full rounded-full bg-light-bg dark:bg-dark-bg" />
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    )
}

const AddTransactionModal: React.FC<{ isOpen: boolean; onClose: () => void; userId: string; wallets: Wallet[]; goals: Goal[]; currency: string;}> = ({ isOpen, onClose, userId, wallets, goals, currency }) => {
    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [walletId, setWalletId] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Goal Allocation
    const [allocateToGoal, setAllocateToGoal] = useState(false);
    const [goalId, setGoalId] = useState('');
    const [allocationAmount, setAllocationAmount] = useState('');
    const availableGoals = useMemo(() => goals.filter(g => g.savedAmount < g.targetAmount), [goals]);

    useEffect(() => {
        if (isOpen) {
            if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id);
            if (availableGoals.length > 0 && !goalId) setGoalId(availableGoals[0].id);
            if (!category) setCategory(TRANSACTION_CATEGORIES[type][0]);
        } else {
            // Reset form on close
            setType('expense'); setAmount(''); setCategory(''); setNote(''); setDate(new Date().toISOString().split('T')[0]);
            setAllocateToGoal(false); setAllocationAmount(''); setError('');
        }
    }, [isOpen, wallets, availableGoals, type, walletId, goalId, category]);
    
    useEffect(() => { setCategory(TRANSACTION_CATEGORIES[type][0]); }, [type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!amount || !category || !walletId || !date) return setError('Please fill all required fields.');
        if (wallets.length === 0) return setError('You need to create a wallet first.');

        setIsLoading(true);
        const numAmount = parseFloat(amount);
        const numAllocationAmount = allocateToGoal ? parseFloat(allocationAmount) : 0;

        if (allocateToGoal && (!goalId || !allocationAmount || numAllocationAmount <= 0)) {
            setError('Select a goal and enter a valid allocation amount.');
            setIsLoading(false); return;
        }
        if (allocateToGoal && numAllocationAmount > numAmount) {
            setError('Allocation amount cannot be greater than the income amount.');
            setIsLoading(false); return;
        }
        
        try {
            const batch = db.batch();
            const transactionRef = db.collection('transactions').doc();
            let transactionData: any = {
                userId, amount: numAmount, type, category,
                date: firebase.firestore.Timestamp.fromDate(new Date(date)),
                note, walletId, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (type === 'income' && allocateToGoal && goalId && numAllocationAmount > 0) {
                transactionData.allocatedToGoal = { goalId, amount: numAllocationAmount };
                const goalRef = db.collection('goals').doc(goalId);
                batch.update(goalRef, { savedAmount: firebase.firestore.FieldValue.increment(numAllocationAmount) });
            }
            batch.set(transactionRef, transactionData);
            
            const walletRef = db.collection('wallets').doc(walletId);
            const newBalanceUpdate = type === 'income' ? numAmount : -numAmount;
            batch.update(walletRef, { balance: firebase.firestore.FieldValue.increment(newBalanceUpdate) });

            await batch.commit();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to save transaction.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex space-x-1 bg-light-bg dark:bg-dark-bg p-1 rounded-xl">
                    <button type="button" onClick={() => setType('expense')} className={`w-full py-2 rounded-lg transition ${type === 'expense' ? 'bg-danger text-white font-bold' : 'hover:bg-white/50 dark:hover:bg-white/10'}`}>Expense</button>
                    <button type="button" onClick={() => setType('income')} className={`w-full py-2 rounded-lg transition ${type === 'income' ? 'bg-primary text-white font-bold' : 'hover:bg-white/50 dark:hover:bg-white/10'}`}>Income</button>
                </div>
                <Input label="Amount" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" />
                <Select label="Category" id="category" value={category} onChange={e => setCategory(e.target.value)}>
                    {TRANSACTION_CATEGORIES[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
                <Select label="Wallet" id="wallet" value={walletId} onChange={e => setWalletId(e.target.value)} required>
                    {wallets.length > 0 ? wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance, currency)})</option>) : <option disabled>Create a wallet in your profile</option>}
                </Select>
                <Input label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <Input label="Note (Optional)" id="note" type="text" value={note} onChange={e => setNote(e.target.value)} />
                
                {type === 'income' && availableGoals.length > 0 && (
                    <div className="space-y-3 bg-primary/10 p-4 rounded-lg">
                        <div className="flex items-center">
                             <input type="checkbox" id="allocate" checked={allocateToGoal} onChange={e => setAllocateToGoal(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                             <label htmlFor="allocate" className="ml-3 block text-sm font-medium">Allocate to a Goal?</label>
                        </div>
                        {allocateToGoal && (
                           <div className="space-y-4">
                               <Select label="Select Goal" id="goalId" value={goalId} onChange={e => setGoalId(e.target.value)}>
                                   {availableGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                               </Select>
                               <Input label="Allocation Amount" id="allocationAmount" type="number" value={allocationAmount} onChange={e => setAllocationAmount(e.target.value)} step="0.01" />
                           </div>
                        )}
                    </div>
                )}
                
                {error && <p className="text-danger text-sm">{error}</p>}
                <div className="pt-2">
                    <Button type="submit" isLoading={isLoading} disabled={wallets.length === 0}>Save Transaction</Button>
                </div>
            </form>
        </Modal>
    );
};

const AddWalletModal: FC<{isOpen: boolean; onClose: () => void; userId: string;}> = ({isOpen, onClose, userId}) => {
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [type, setType] = useState<WalletType>('cash');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !balance) return setError('Name and Initial Balance are required.');
        setIsLoading(true); setError('');
        try {
            await db.collection('wallets').add({
                userId, name, balance: parseFloat(balance), type,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            onClose();
        } catch(err) { console.error(err); setError('Failed to save wallet.'); }
        finally { setIsLoading(false); }
    }

    useEffect(() => {
        if(!isOpen) { setName(''); setBalance(''); setType('cash'); setError(''); }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Wallet">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Wallet Name" id="wallet-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Cash, Primary Bank, E-Wallet" required/>
                <Input label="Initial Balance" id="wallet-balance" type="number" value={balance} onChange={e => setBalance(e.target.value)} required step="0.01"/>
                <Select label="Wallet Type" id="wallet-type" value={type} onChange={e => setType(e.target.value as WalletType)}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="ewallet">E-Wallet</option>
                </Select>
                {error && <p className="text-danger text-sm">{error}</p>}
                <div className="pt-2"><Button type="submit" isLoading={isLoading}>Save</Button></div>
            </form>
        </Modal>
    )
}

const EditWalletModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    wallet: Wallet | null;
    transactions: Transaction[];
}> = ({ isOpen, onClose, wallet, transactions }) => {
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [type, setType] = useState<WalletType>('cash');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (wallet) {
            setName(wallet.name);
            setBalance(String(wallet.balance));
            setType(wallet.type);
            setError('');
        }
    }, [wallet]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet || !name || balance === '') {
            setError('Name and Balance are required.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await db.collection('wallets').doc(wallet.id).update({
                name,
                balance: parseFloat(balance),
                type,
            });
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to update wallet.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const walletHasTransactions = useMemo(() => {
        if (!wallet) return false;
        return transactions.some(t => t.walletId === wallet.id);
    }, [wallet, transactions]);

    const handleDelete = async () => {
        if (!wallet) return;

        if (walletHasTransactions) {
            setError("You cannot delete a wallet that has transactions. Please re-assign or delete those transactions first.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete the wallet "${wallet.name}"? This action cannot be undone.`)) {
            setIsDeleting(true);
            setError('');
            try {
                await db.collection('wallets').doc(wallet.id).delete();
                onClose();
            } catch (err) {
                console.error(err);
                setError('Failed to delete wallet.');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    if (!wallet) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Wallet`}>
            <form onSubmit={handleUpdate} className="space-y-4">
                <Input label="Wallet Name" id="edit-wallet-name" value={name} onChange={e => setName(e.target.value)} required />
                <Input label="Current Balance" id="edit-wallet-balance" type="number" value={balance} onChange={e => setBalance(e.target.value)} required step="0.01" />
                <Select label="Wallet Type" id="edit-wallet-type" value={type} onChange={e => setType(e.target.value as WalletType)}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="ewallet">E-Wallet</option>
                </Select>
                {error && <p className="text-danger text-sm text-center">{error}</p>}
                <div className="pt-2 space-y-2">
                    <Button type="submit" isLoading={isLoading}>Save Changes</Button>
                    <Button type="button" variant="danger" onClick={handleDelete} isLoading={isDeleting} disabled={walletHasTransactions}>
                        Delete Wallet
                    </Button>
                </div>
            </form>
        </Modal>
    );
};


const AddGoalModal: FC<{isOpen: boolean; onClose: () => void; userId: string;}> = ({isOpen, onClose, userId}) => {
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!title || !targetAmount) return setError('Title and Target Amount are required.');
        setIsLoading(true); setError('');
        try {
            await db.collection('goals').add({
                userId, title, targetAmount: parseFloat(targetAmount), savedAmount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            onClose();
        } catch(err) { console.error(err); setError('Failed to save goal.'); }
        finally { setIsLoading(false); }
    }
    useEffect(() => { if(!isOpen) { setTitle(''); setTargetAmount(''); setError(''); } }, [isOpen]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Savings Goal">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Goal Title" id="goal-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Vacation to Bali" required/>
                <Input label="Target Amount" id="goal-target" type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required step="0.01"/>
                {error && <p className="text-danger text-sm">{error}</p>}
                <div className="pt-2"><Button type="submit" isLoading={isLoading}>Save Goal</Button></div>
            </form>
        </Modal>
    )
}

const AddDebtModal: FC<{isOpen: boolean; onClose: () => void; userId: string;}> = ({isOpen, onClose, userId}) => {
    const [personName, setPersonName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<DebtType>('i_owe');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!personName || !amount) return setError('Name and Amount are required.');
        setIsLoading(true); setError('');
        try {
            await db.collection('debts').add({
                userId, personName, amount: parseFloat(amount), type, description, isPaid: false,
                dueDate: dueDate ? firebase.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            onClose();
        } catch(err) { console.error(err); setError('Failed to save debt record.'); }
        finally { setIsLoading(false); }
    }
     useEffect(() => { if(!isOpen) { setPersonName(''); setAmount(''); setDescription(''); setDueDate(''); setType('i_owe'); setError(''); } }, [isOpen]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Debt Record">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select label="Debt Type" id="debt-type" value={type} onChange={e => setType(e.target.value as DebtType)}>
                    <option value="i_owe">I Owe</option>
                    <option value="owed_to_me">Owed To Me</option>
                </Select>
                <Input label="Person's Name" id="debt-person" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="e.g., John Doe" required/>
                <Input label="Amount" id="debt-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01"/>
                <Input label="Description (Optional)" id="debt-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Loan for lunch" />
                <Input label="Due Date (Optional)" id="debt-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                {error && <p className="text-danger text-sm">{error}</p>}
                <div className="pt-2"><Button type="submit" isLoading={isLoading}>Save</Button></div>
            </form>
        </Modal>
    )
}


// =================================================================================
// Authentication UI
// =================================================================================
const AuthPage: FC = () => {
    const [authType, setAuthType] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isGoogleLoading, setGoogleLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            if (authType === 'login') await auth.signInWithEmailAndPassword(email, password);
            else await auth.createUserWithEmailAndPassword(email, password);
        } catch (err: any) { setError(err.message); } 
        finally { setLoading(false); }
    };
    
    const handleGoogleSignIn = async () => {
        setGoogleLoading(true); setError('');
        try { await auth.signInWithPopup(googleProvider); } 
        catch (err: any) { setError(err.message); } 
        finally { setGoogleLoading(false); }
    };

    const isLogin = authType === 'login';

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4">
            <div className="max-w-md w-full space-y-6 bg-dark-surface p-8 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-primary tracking-wider">evvoFinance</h1>
                    <h2 className="mt-4 text-3xl font-extrabold text-dark-text-primary">{isLogin ? 'Welcome Back' : 'Create New Account'}</h2>
                    <p className="text-center text-dark-text-secondary mt-2">{isLogin ? 'Sign in to continue' : 'Start managing your finances'}</p>
                </div>
                <form className="space-y-6" onSubmit={handleAuthAction}>
                    <Input label="Email Address" id="email-address" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                    <Input label="Password" id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                    {error && <p className="text-danger text-sm text-center">{error}</p>}
                    <div>
                        <Button type="submit" isLoading={loading}>{isLogin ? 'Sign In' : 'Register'}</Button>
                    </div>
                </form>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-border"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-dark-surface text-dark-text-secondary">Or</span></div>
                </div>
                <div>
                    <Button onClick={handleGoogleSignIn} isLoading={isGoogleLoading} variant="secondary">
                        <GoogleIcon className="w-6 h-6"/>
                        Continue with Google
                    </Button>
                </div>
                <p className="text-center text-sm text-dark-text-secondary">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'} {' '}
                    <button onClick={() => setAuthType(isLogin ? 'register' : 'login')} className="font-medium text-primary hover:text-primary-focus">{isLogin ? 'Sign Up' : 'Sign In'}</button>
                </p>
            </div>
        </div>
    );
};

// =================================================================================
// Main Application Component
// =================================================================================

interface AppContentProps {
    user: User;
    profile: UserProfile;
    transactions: Transaction[];
    goals: Goal[];
    wallets: Wallet[];
    debts: Debt[];
    onLogout: () => void;
    onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    onUpdateUser: (updates: Partial<User>) => void;
    onEditWallet: (wallet: Wallet) => void;
}

const AppContent: FC<AppContentProps> = ({ user, profile, transactions, goals, wallets, debts, onLogout, onUpdateProfile, onUpdateUser, onEditWallet }) => {
    const [activeNav, setActiveNav] = useState<NavItem>('dashboard');
    
    // Modal states
    const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
    const [isWalletModalOpen, setWalletModalOpen] = useState(false);
    const [isGoalModalOpen, setGoalModalOpen] = useState(false);
    const [isDebtModalOpen, setDebtModalOpen] = useState(false);

    const renderContent = () => {
        const currency = profile.currency || 'USD';
        switch (activeNav) {
            case 'dashboard': return <DashboardView transactions={transactions} goals={goals} wallets={wallets} currency={currency} />;
            case 'transactions': return <TransactionsView transactions={transactions} wallets={wallets} currency={currency} />;
            case 'goals': return <GoalsView goals={goals} onAddGoal={() => setGoalModalOpen(true)} currency={currency}/>;
            case 'debts': return <DebtsView debts={debts} onAddDebt={() => setDebtModalOpen(true)} currency={currency}/>;
            case 'profile': return <ProfileView user={user} profile={profile} wallets={wallets} onLogout={onLogout} onAddWallet={() => setWalletModalOpen(true)} onEditWallet={onEditWallet} onUpdateProfile={onUpdateProfile} onUpdateUser={onUpdateUser} />;
            default: return <DashboardView transactions={transactions} goals={goals} wallets={wallets} currency={currency} />;
        }
    };

    const NavButton: FC<{ item: NavItem; label: string; icon: React.ReactNode }> = ({ item, label, icon }) => (
        <button onClick={() => setActiveNav(item)} className="flex flex-col items-center justify-center w-full transition-colors duration-200 group">
            <div className={`relative w-14 h-8 flex items-center justify-center`}>
                <div className={`absolute transition-all duration-300 w-16 h-8 rounded-full ${activeNav === item ? 'bg-primary scale-100' : 'scale-0 group-hover:scale-100 group-hover:bg-primary/20'}`}></div>
                <div className={`relative w-6 h-6 transition-colors duration-200 ${activeNav === item ? 'text-white' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>{icon}</div>
            </div>
            <span className={`text-xs mt-0.5 transition-colors duration-200 ${activeNav === item ? 'text-light-text-primary dark:text-dark-text-primary font-bold' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>{label}</span>
        </button>
    );
    
    const openModalForPage = () => {
        switch(activeNav) {
            case 'dashboard':
            case 'transactions':
                setTransactionModalOpen(true);
                break;
            case 'goals':
                setGoalModalOpen(true);
                break;
            case 'debts':
                setDebtModalOpen(true);
                break;
            default:
                setTransactionModalOpen(true);
        }
    };

    return (
        <div className="min-h-screen w-full mx-auto max-w-lg bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary flex flex-col">
             <header className="px-4 pt-6 flex justify-between items-center">
                <h1 className="text-xl font-bold text-primary tracking-wide">{activeNav === 'dashboard' ? 'evvoFinance' : ''}</h1>
            </header>
            <main className="flex-1 pb-24 overflow-y-auto p-4 pt-2">
                {renderContent()}
            </main>
            
            {activeNav !== 'profile' && (
              <button onClick={openModalForPage} className="fixed z-40 bottom-24 right-5 bg-primary hover:bg-primary-focus text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transform transition-transform active:scale-90">
                  <PlusIcon className="w-8 h-8" />
              </button>
            )}

            <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm border-t border-light-border dark:border-dark-border shadow-t-lg">
                <div className="flex justify-around items-center h-20">
                    <NavButton item="dashboard" label="Home" icon={<DashboardIcon />} />
                    <NavButton item="transactions" label="History" icon={<TransactionsIcon />} />
                    <NavButton item="goals" label="Goals" icon={<GoalsIcon />} />
                    <NavButton item="debts" label="Debts" icon={<DebtsIcon />} />
                    <NavButton item="profile" label="Profile" icon={<ProfileIcon />} />
                </div>
            </footer>
            
            <AddTransactionModal isOpen={isTransactionModalOpen} onClose={() => setTransactionModalOpen(false)} userId={user.uid} wallets={wallets} goals={goals} currency={profile.currency} />
            <AddWalletModal isOpen={isWalletModalOpen} onClose={() => setWalletModalOpen(false)} userId={user.uid} />
            <AddGoalModal isOpen={isGoalModalOpen} onClose={() => setGoalModalOpen(false)} userId={user.uid} />
            <AddDebtModal isOpen={isDebtModalOpen} onClose={() => setDebtModalOpen(false)} userId={user.uid} />
        </div>
    );
};


const App: FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                const { uid, email, displayName, photoURL } = firebaseUser;
                setUser({ uid, email, displayName, photoURL });
            } else {
                setUser(null);
                setProfile(null);
                setTransactions([]); setGoals([]); setWallets([]); setDebts([]);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const createListener = (collectionName: string, setter: React.Dispatch<any>, orderField: string = 'createdAt') => 
            db.collection(collectionName).where('userId', '==', user.uid).orderBy(orderField, 'desc')
              .onSnapshot(
                (snapshot) => setter(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[]),
                (error) => console.error(`Error fetching ${collectionName}:`, error)
              );

        const profileRef = db.collection('users').doc(user.uid);
        const unsubProfile = profileRef.onSnapshot((doc) => {
            if (doc.exists) {
                setProfile(doc.data() as UserProfile);
            } else {
                profileRef.set({ theme: 'dark', currency: 'USD' });
            }
            setLoading(false);
        });

        const unsubscribers = [
            unsubProfile,
            createListener('transactions', setTransactions),
            createListener('goals', setGoals),
            createListener('wallets', setWallets),
            createListener('debts', setDebts),
        ];

        return () => unsubscribers.forEach(unsub => unsub());
    }, [user]);

    const handleUpdateUser = (updates: Partial<User>) => {
        setUser(currentUser => {
            if (currentUser) {
                return { ...currentUser, ...updates };
            }
            return null;
        });
    };

    const handleUpdateProfile = (updates: Partial<UserProfile>): Promise<void> => {
        if (user) {
            return db.collection('users').doc(user.uid).update(updates).catch(error => {
                console.error("Error updating profile:", error);
                throw error;
            });
        }
        return Promise.reject(new Error("User not authenticated"));
    };
    
    const handleLogout = () => auth.signOut();

    if (loading) {
         return <div className="min-h-screen bg-dark-bg flex items-center justify-center"><Spinner /></div>;
    }

    return (
        <ThemeProvider initialTheme={profile?.theme || 'dark'} onThemeChange={(newTheme) => handleUpdateProfile({ theme: newTheme })}>
            {!user ? (
                <AuthPage />
            ) : profile ? (
                <>
                    <AppContent 
                        user={user}
                        profile={profile}
                        transactions={transactions}
                        goals={goals}
                        wallets={wallets}
                        debts={debts}
                        onLogout={handleLogout}
                        onUpdateProfile={handleUpdateProfile}
                        onUpdateUser={handleUpdateUser}
                        onEditWallet={(wallet) => setEditingWallet(wallet)}
                    />
                    <EditWalletModal
                        isOpen={!!editingWallet}
                        onClose={() => setEditingWallet(null)}
                        wallet={editingWallet}
                        transactions={transactions}
                    />
                </>
            ) : (
                <div className="min-h-screen bg-dark-bg flex items-center justify-center"><Spinner /></div>
            )}
        </ThemeProvider>
    )
}


export default App;
