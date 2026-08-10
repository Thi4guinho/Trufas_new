import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings as SettingsIcon, 
  User as UserIcon,
  Search,
  DollarSign,
  History,
  TrendingDown,
  ShieldCheck,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OperationType, Truffle, Sale, Customer, UserSettings, UserProfile, CashflowRecord, AuditLog, Company, CompanyMember } from './types';
import { handleFirestoreError, cn } from './utils';
import { getOwnerPermissions, hasPermission } from './permissions';

// Modulariadade: Import perfect modular components
import { Dashboard } from './components/Dashboard';
import { SalesManager } from './components/SalesManager';
import { TruffleManager } from './components/TruffleManager';
import { CustomerManager } from './components/CustomerManager';
import { AdminHistory } from './components/AdminHistory';
import { PendingPayments } from './components/PendingPayments';
import { Settings } from './components/Settings';
import { SettingsHub } from './components/SettingsHub';
import { MaterialManager } from './components/MaterialManager';
import { ProductionManager } from './components/ProductionManager';
import { Material, ProductionBatch } from './types';
import { CashflowManager } from './components/CashflowManager';
import { AuditLogManager } from './components/AuditLogManager';
import { PasswordGate } from './components/PasswordGate';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [currentMember, setCurrentMember] = useState<CompanyMember | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'pending' | 'history' | 'cashflow' | 'audit_logs' | 'truffles' | 'customers' | 'settings' | 'materials' | 'production'>('dashboard');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [editingSaleRecord, setEditingSaleRecord] = useState<Sale | null>(null);
  
  // Real-time collections states
  const [truffles, setTruffles] = useState<Truffle[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashflow, setCashflow] = useState<CashflowRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const tabLabels = {
    dashboard: 'Painel',
    sales: 'Nova Venda',
    pending: 'Contas a Receber (Fiados)',
    history: 'Histórico de Vendas',
    cashflow: 'Fluxo de Caixa',
    audit_logs: 'Histórico de Ações (Auditoria)',
    truffles: 'Registro de Produtos',
    customers: 'Fidelização / Clientes',
    settings: 'Configurações do Sistema'
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email) {
        // 1. Fetch user profile
        const uDocRef = doc(db, 'users', u.uid);
        const pDoc = await getDoc(uDocRef);
        let profileData = pDoc.data() as UserProfile;
        
        if (!pDoc.exists()) {
          profileData = { uid: u.uid, email: u.email, role: 'user' };
        }
        
        // Ensure default administrator email is assigned correctly
        if (u.email === 'thiago07bassi@gmail.com') {
          profileData.role = 'admin';
        }
        
        setProfile(profileData);
        
        // 2. Fetch or Create Company
        let currentCompany: Company | null = null;
        try {
          // Attempt 1: Fast direct access via profile mapping
          if (profileData.companyId) {
             const compDoc = await getDoc(doc(db, 'companies', profileData.companyId));
             if (compDoc.exists()) {
               currentCompany = { id: compDoc.id, ...compDoc.data() } as Company;
             }
          }

          // Attempt 2: Secure list query (might fail if rules block list without document binding)
          if (!currentCompany) {
             try {
                const compQuery = query(collection(db, 'companies'), where('memberEmails', 'array-contains', u.email));
                const snap = await getDocs(compQuery);
                if (!snap.empty) {
                  currentCompany = { id: snap.docs[0].id, ...snap.docs[0].data() } as Company;
                }
             } catch (queryErr) {
                console.warn("Secure query blocked by rules, falling back to direct owner check:", queryErr);
                // Attempt 3: Direct owner lookup via UID
                const ownerDoc = await getDoc(doc(db, 'companies', u.uid));
                if (ownerDoc.exists()) {
                  currentCompany = { id: ownerDoc.id, ...ownerDoc.data() } as Company;
                }
             }
          }
          
          if (!currentCompany) {
            // Create a new company matching the owner's UID for deep backwards compatibility
            const newCompanyId = u.uid;
            const newCompanyData = {
              name: `Empresa de ${u.displayName || u.email.split('@')[0]}`,
              ownerId: u.uid,
              createdAt: serverTimestamp(),
              memberEmails: [u.email],
              members: {
                [u.email]: {
                  email: u.email,
                  uid: u.uid,
                  name: u.displayName || u.email.split('@')[0],
                  role: 'owner',
                  status: 'active',
                  joinedAt: new Date().toISOString(),
                  lastAccess: new Date().toISOString(),
                  permissions: getOwnerPermissions()
                }
              }
            };
            await setDoc(doc(db, 'companies', newCompanyId), newCompanyData);
            currentCompany = { id: newCompanyId, ...newCompanyData } as Company;
          }
          
          // 3. Update member status as active and record last access
          if (currentCompany) {
            let memberEmailKey = u.email;
            const emailParts = u.email.split('@');
            
            if (emailParts.length === 2) {
              const corruptedKey = emailParts[0] + '@' + emailParts[1].split('.')[0];
              if (currentCompany.members && currentCompany.members[corruptedKey] && !currentCompany.members[u.email]) {
                memberEmailKey = corruptedKey;
              }
            }

            if (currentCompany.members && currentCompany.members[memberEmailKey]) {
              const memberData = currentCompany.members[memberEmailKey];
              let needsUpdate = false;
              if (memberData.status === 'pending' || !memberData.uid || memberEmailKey !== u.email) {
                needsUpdate = true;
              }
              const newMembers = { ...currentCompany.members };
              
              if (memberEmailKey !== u.email) {
                delete newMembers[memberEmailKey];
              }

              newMembers[u.email] = {
                ...memberData,
                email: u.email,
                status: 'active',
                uid: u.uid,
                lastAccess: new Date().toISOString()
              };

              await updateDoc(doc(db, 'companies', currentCompany.id), {
                members: newMembers
              });
              
              // Sync local state
              currentCompany.members = newMembers;
              
              setCompany(currentCompany);
              setCurrentMember(currentCompany.members[u.email]);
              
              // Append companyId to profile and re-set
              profileData.companyId = currentCompany.id;
              setProfile(profileData);
              
              // Re-save profile so next time we bypass the list query
              if (profileData.uid) {
                 await setDoc(doc(db, 'users', profileData.uid), profileData, { merge: true });
              }
            }
          }
        } catch (error) {
          console.error("Error setting up company:", error);
        }
      } else {
        setProfile(null);
        setCompany(null);
        setCurrentMember(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Set up real-time listener for the company document to react to permission changes
  useEffect(() => {
    if (!user || !company?.id) return;
    const unsubscribeCompany = onSnapshot(doc(db, 'companies', company.id), (docSnap) => {
      if (docSnap.exists()) {
        const updatedCompany = { id: docSnap.id, ...docSnap.data() } as Company;
        setCompany(updatedCompany);
        if (user.email && updatedCompany.members && updatedCompany.members[user.email]) {
          setCurrentMember(updatedCompany.members[user.email]);
        }
      }
    });
    return () => unsubscribeCompany();
  }, [user, company?.id]);

  useEffect(() => {
    if (!user || !isAuthReady || !company) return;

    // Real-time collections subscriptions mapping to COMPANY ID!
    // company.id IS the tenant ID (identical to the old ownerId for created accounts)
    
    // We only fetch what the user has permission to view.
    // However, Firestore secure list query enforces 'ownerId == company.id'.
    // If they don't have permission to list, the listener will error out. We can optionally wrap these or just let Firestore reject.
    const companyId = company.id;

    // Helper to log errors but not crash the app UI loops
    const onErr = (op: string) => (err: any) => {
       console.warn(`Insufficient permissions for ${op}:`, err);
    };

    let unsubscribeTruffles = () => {};
    if (hasPermission(currentMember, 'truffles', 'view')) {
      const qTruffles = query(collection(db, 'truffles'), where('ownerId', '==', companyId));
      unsubscribeTruffles = onSnapshot(qTruffles, (snapshot) => {
        setTruffles(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Truffle)));
      }, onErr('truffles'));
    } else {
      setTruffles([]);
    }

    let unsubscribeSales = () => {};
    if (hasPermission(currentMember, 'sales', 'view')) {
      const qSales = query(collection(db, 'sales'), where('ownerId', '==', companyId), orderBy('date', 'desc'));
      unsubscribeSales = onSnapshot(qSales, (snapshot) => {
        setSales(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
      }, onErr('sales'));
    } else {
      setSales([]);
    }

    let unsubscribeCustomers = () => {};
    if (hasPermission(currentMember, 'customers', 'view')) {
      const qCustomers = query(collection(db, 'customers'), where('ownerId', '==', companyId), orderBy('name', 'asc'));
      unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
        setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      }, onErr('customers'));
    } else {
      setCustomers([]);
    }

    let unsubscribeCashflow = () => {};
    if (hasPermission(currentMember, 'finance', 'view')) {
      const qCashflow = query(collection(db, 'cashflow'), where('ownerId', '==', companyId), orderBy('date', 'desc'));
      unsubscribeCashflow = onSnapshot(qCashflow, (snapshot) => {
        setCashflow(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashflowRecord)));
      }, onErr('cashflow'));
    } else {
      setCashflow([]);
    }

    let unsubscribeLogs = () => {};
    if (hasPermission(currentMember, 'reports', 'view')) {
      const qLogs = query(collection(db, 'audit_logs'), where('ownerId', '==', companyId), orderBy('date', 'desc'));
      unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
        setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
      }, onErr('logs'));
    } else {
      setLogs([]);
    }

    let unsubscribeSettings = () => {};
    if (hasPermission(currentMember, 'settings', 'view') || currentMember?.role === 'owner') {
      unsubscribeSettings = onSnapshot(doc(db, 'settings', companyId), (d) => {
        if (d.exists()) setSettings(d.data() as UserSettings);
      }, onErr('settings'));
    }

    return () => {
      unsubscribeTruffles();
      unsubscribeSales();
      unsubscribeCustomers();
      unsubscribeCashflow();
      unsubscribeLogs();
      unsubscribeSettings();
    };
  }, [user, isAuthReady, company, currentMember]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0] dark:bg-zinc-950">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 bg-[#141414] dark:bg-zinc-100 rounded-2xl"
        />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <ErrorBoundary>
      <div className="h-screen bg-[#E4E3E0] dark:bg-zinc-950 flex font-sans overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-80 bg-white dark:bg-zinc-900 border-r border-[#141414]/5 dark:border-zinc-50/10 p-8 flex flex-col hidden lg:flex shrink-0">
          <div className="flex items-center gap-3 mb-10 shrink-0">
            <div className="w-10 h-10 bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-lg font-black italic text-lg tracking-tight">
              T
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter italic">TruffleTech</h1>
              <p className="text-[9px] font-bold text-[#141414]/40 dark:text-zinc-400 uppercase tracking-widest leading-none">Gestão de Vendas</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pr-2 -mr-2">
            {[
              { id: 'dashboard', label: 'Painel Principal', icon: LayoutDashboard, show: true },
              { id: 'sales', label: 'Registrar Venda', icon: ShoppingCart, show: hasPermission(currentMember, 'sales', 'create') },
              { id: 'pending', label: 'Contas a Receber', icon: DollarSign, show: hasPermission(currentMember, 'sales', 'view') || hasPermission(currentMember, 'finance', 'view') },
              { id: 'history', label: 'Registro de Vendas', icon: History, show: hasPermission(currentMember, 'sales', 'view') },
              { id: 'cashflow', label: 'Fluxo de Caixa', icon: TrendingDown, show: hasPermission(currentMember, 'finance', 'view') },
              { id: 'truffles', label: 'Produtos', icon: Package, show: hasPermission(currentMember, 'truffles', 'view') },
              { id: 'customers', label: 'Meus Clientes', icon: UserIcon, show: hasPermission(currentMember, 'customers', 'view') },
              { id: 'audit_logs', label: 'Ações / Auditoria', icon: ShieldCheck, show: hasPermission(currentMember, 'reports', 'view') },
              { id: 'settings', label: 'Configurações', icon: SettingsIcon, show: currentMember?.role === 'owner' || hasPermission(currentMember, 'settings', 'view') || hasPermission(currentMember, 'settings', 'members') },
            ].filter(i => i.show).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'sales') setEditingSaleRecord(null);
                  setActiveTab(item.id as any);
                }}
                className={cn(
                  "w-full flex items-center gap-4 py-3 px-4 rounded-xl font-bold transition-all text-sm",
                  activeTab === item.id 
                    ? "bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md" 
                    : "text-[#141414]/40 dark:text-zinc-400 hover:bg-[#F5F5F4] dark:bg-zinc-800 hover:text-[#141414] dark:hover:text-zinc-100"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-[#141414]/5 dark:border-zinc-50/10 mt-auto shrink-0 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 bg-[#F5F5F4] dark:bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                <UserIcon size={20} className="text-[#141414]/40 dark:text-zinc-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-sm truncate leading-tight">{profile?.displayName || user.email}</p>
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide leading-none mt-1">
                  {profile?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                setIsAdminAuthenticated(false);
                signOut(auth);
              }}
              className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-wider border border-red-100/30"
            >
              Sign Out / Sair
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 lg:pb-12 overflow-y-auto relative no-scrollbar">
          <div className="max-w-6xl mx-auto">
            {/* Top header navigation desk */}
            <header className="flex items-center justify-between mb-8 lg:mb-10">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter italic text-[#141414] dark:text-zinc-100 leading-tight">
                  {tabLabels[activeTab]}
                </h1>
                <p className="text-[#141414]/40 dark:text-zinc-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px] mt-1">
                  {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

                            <div className="flex items-center gap-3">
                <ThemeToggle />
                {/* Status Indicator */}
                <div className="hidden sm:flex items-center gap-2 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md px-4 py-2 rounded-full border border-[#141414]/5 dark:border-zinc-50/10">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  <span className="text-[9px] font-black text-[#141414] dark:text-zinc-100 uppercase tracking-wide">CAIXA ABERTO</span>
                </div>
              </div>
            </header>

            {/* Central Tabs switching desk with loading fallback */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    sales={sales} 
                    truffles={truffles} 
                    customersCount={customers.length}
                    onTabChange={(tab) => {
                      if (tab === 'sales') setEditingSaleRecord(null);
                      setActiveTab(tab as any);
                    }} 
                    settings={settings} 
                  />
                )}

                {activeTab === 'sales' && (
                  <SalesManager
                    sales={sales}
                    truffles={truffles}
                    customers={customers}
                    settings={settings} 
                    profile={profile}
                    editingSale={editingSaleRecord}
                    onCancelEdit={() => {
                      setEditingSaleRecord(null);
                      setActiveTab('history');
                    }}
                  />
                )}

                {activeTab === 'pending' && (
                  <PendingPayments 
                    sales={sales} 
                    profile={profile} 
                    settings={settings} 
                  />
                )}

                {activeTab === 'history' && (
                  <AdminHistory 
                    sales={sales} 
                    settings={settings} 
                    profile={profile}
                    onEditSale={(sale) => {
                      setEditingSaleRecord(sale);
                      setActiveTab('sales');
                    }}
                  />
                )}

                {activeTab === 'cashflow' && (
                  <CashflowManager 
                    sales={sales} 
                    cashflow={cashflow} 
                    truffles={truffles}
                    profile={profile} 
                  />
                )}

                {activeTab === 'truffles' && (
                  <TruffleManager 
                    truffles={truffles} 
                    profile={profile} 
                    lowStockLimit={settings?.lowStockAlert || 5}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomerManager 
                    customers={customers} 
                    sales={sales} 
                    profile={profile} 
                  />
                )}

                {activeTab === 'audit_logs' && (
                  <AuditLogManager 
                    logs={logs} 
                  />
                )}

                {activeTab === 'materials' && (
                  <MaterialManager materials={materials} />
                )}
                {activeTab === 'production' && (
                  <ProductionManager batches={productionBatches} products={truffles} profile={profile} />
                )}
                {activeTab === 'settings' && (
                  !isAdminAuthenticated ? (
                    <PasswordGate 
                      onAuthenticated={() => setIsAdminAuthenticated(true)} 
                      title="Área Administrativa"
                      description="Insira a senha de administrador para acessar as configurações do sistema, clientes e exportar relatórios."
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setIsAdminAuthenticated(false)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors"
                        >
                          Bloquear Acesso
                        </button>
                      </div>
                      <SettingsHub 
                        user={user}
                        profile={profile}
                        settings={settings}
                        sales={sales}
                        truffles={truffles}
                        customers={customers}
                        logs={logs}
                      />
                    </div>
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Navigation bar */}
        <nav className="lg:hidden fixed bottom-6 left-4 right-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-[#141414]/5 dark:border-zinc-50/10 p-2 flex justify-around items-center z-50 rounded-[2rem] shadow-2xl">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Início', show: true },
            { id: 'sales', icon: ShoppingCart, label: 'Venda', show: hasPermission(currentMember, 'sales', 'create') },
            { id: 'pending', icon: DollarSign, label: 'Fiados', show: hasPermission(currentMember, 'sales', 'view') },
            { id: 'cashflow', icon: TrendingDown, label: 'Caixa', show: hasPermission(currentMember, 'finance', 'view') },
            { id: 'settings', icon: SettingsIcon, label: 'Ajustes', show: currentMember?.role === 'owner' || hasPermission(currentMember, 'settings', 'view') || hasPermission(currentMember, 'settings', 'members') },
          ].filter(i => i.show).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'sales') setEditingSaleRecord(null);
                setActiveTab(item.id as any);
              }}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative",
                activeTab === item.id ? "text-[#141414] dark:text-zinc-100" : "text-[#141414]/30 dark:text-zinc-500"
              )}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabMobile"
                  className="absolute inset-0 bg-[#141414]/5 dark:bg-zinc-50/5 rounded-2xl -z-10"
                />
              )}
              <item.icon size={18} />
              <span className="text-[8px] font-black uppercase tracking-tighter leading-none">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </ErrorBoundary>
  );
}
