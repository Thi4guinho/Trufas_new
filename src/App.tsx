import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
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
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  History,
  User as UserIcon,
  ShieldCheck,
  Search,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  displayName: string;
}

interface Truffle {
  id: string;
  name: string;
  price: number;
  stock: number;
  ownerId: string;
}

interface Sale {
  id: string;
  truffleId: string;
  truffleName?: string;
  quantity: number;
  totalPrice: number;
  discount: number;
  isCredit: boolean;
  customerName: string;
  date: Timestamp;
  ownerId: string;
  status: 'paid' | 'pending';
}

interface PricingRule {
  minQty: number;
  price: number;
}

interface UserSettings {
  ownerId: string;
  progressivePricing: PricingRule[];
}

// --- Components ---

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      try {
        const parsed = JSON.parse(event.message);
        if (parsed.error) {
          setError(`Firestore Error: ${parsed.error} (Op: ${parsed.operationType})`);
        } else {
          setError(event.message);
        }
      } catch {
        setError(event.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle size={32} />
            <h2 className="text-xl font-bold">Algo deu errado</h2>
          </div>
          <p className="text-gray-600 mb-6 text-sm break-all">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Recarregar Aplicativo
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Login: React.FC = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          role: 'user',
          displayName: user.displayName || 'Usuário'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 rounded-[2rem] shadow-2xl border border-[#141414]/10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#141414] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Package className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-[#141414] tracking-tighter mb-2 italic">TruffleTech</h1>
          <p className="text-[#141414]/60 font-medium">Gestão Profissional de Trufas</p>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#141414]/90 transition-all active:scale-[0.98] shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 invert" alt="Google" />
          Entrar com Google
        </button>

        <div className="mt-10 pt-8 border-t border-[#141414]/5 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#141414]/40">Protegido por Firebase Enterprise</p>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard: React.FC<{ sales: Sale[], truffles: Truffle[], onTabChange: (tab: any) => void }> = ({ sales, truffles, onTabChange }) => {
  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalPrice, 0);
    const pendingRevenue = sales.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.totalPrice, 0);
    const totalSales = sales.length;
    const lowStock = truffles.filter(t => t.stock < 10).length;

    return { totalRevenue, pendingRevenue, totalSales, lowStock };
  }, [sales, truffles]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: 'sales', label: 'Receita Total', value: `R$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { id: 'pending', label: 'Pendente (Fiado)', value: `R$${stats.pendingRevenue.toFixed(2)}`, icon: AlertCircle, color: 'bg-orange-50 text-orange-600' },
          { id: 'sales', label: 'Total de Vendas', value: stats.totalSales, icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
          { id: 'inventory', label: 'Estoque Baixo', value: stats.lowStock, icon: Package, color: 'bg-red-50 text-red-600' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onTabChange(stat.id)}
            className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.color)}>
              <stat.icon size={24} />
            </div>
            <p className="text-xs font-bold text-[#141414]/40 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-[#141414] tracking-tight">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black tracking-tight italic">Vendas Recentes</h3>
            <History size={20} className="text-[#141414]/20" />
          </div>
          <div className="space-y-4">
            {sales.slice(0, 5).map((sale, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#F5F5F4] rounded-2xl">
                <div>
                  <p className="font-bold text-sm">{sale.truffleName || 'Trufa Desconhecida'}</p>
                  <p className="text-[10px] text-[#141414]/40 font-bold uppercase tracking-wider">
                    {format(sale.date.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR })} • {sale.quantity} unidades
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">R${sale.totalPrice.toFixed(2)}</p>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-1 rounded-full",
                    sale.status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {sale.status === 'paid' ? 'pago' : 'pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black tracking-tight italic">Status do Estoque</h3>
            <Package size={20} className="text-[#141414]/20" />
          </div>
          <div className="space-y-4">
            {truffles.slice(0, 5).map((truffle, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>{truffle.name}</span>
                  <span className={cn(truffle.stock < 10 ? "text-red-600" : "text-[#141414]/40")}>
                    {truffle.stock} restantes
                  </span>
                </div>
                <div className="h-2 bg-[#F5F5F4] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((truffle.stock / 50) * 100, 100)}%` }}
                    className={cn(
                      "h-full rounded-full",
                      truffle.stock < 10 ? "bg-red-500" : "bg-[#141414]"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SalesManager: React.FC<{ truffles: Truffle[], settings: UserSettings | null }> = ({ truffles, settings }) => {
  const [selectedTruffleId, setSelectedTruffleId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedTruffle = truffles.find(t => t.id === selectedTruffleId);

  const calculatedPrice = useMemo(() => {
    if (!selectedTruffle) return 0;
    
    let unitPrice = selectedTruffle.price;
    if (settings?.progressivePricing) {
      const sortedRules = [...settings.progressivePricing].sort((a, b) => b.minQty - a.minQty);
      const rule = sortedRules.find(r => quantity >= r.minQty);
      if (rule) unitPrice = rule.price;
    }

    return (unitPrice * quantity) - manualDiscount;
  }, [selectedTruffle, quantity, manualDiscount, settings]);

  const handleSale = async () => {
    if (!selectedTruffle || quantity <= 0) return;
    if (selectedTruffle.stock < quantity) {
      alert('Estoque insuficiente!');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        truffleId: selectedTruffle.id,
        truffleName: selectedTruffle.name,
        quantity,
        totalPrice: calculatedPrice,
        discount: manualDiscount,
        isCredit,
        customerName: isCredit ? customerName : '',
        date: Timestamp.now(),
        ownerId: auth.currentUser!.uid,
        status: isCredit ? 'pending' : 'paid'
      };

      await addDoc(collection(db, 'sales'), saleData);
      await updateDoc(doc(db, 'truffles', selectedTruffle.id), {
        stock: selectedTruffle.stock - quantity
      });

      // Reset
      setSelectedTruffleId('');
      setQuantity(1);
      setManualDiscount(0);
      setIsCredit(false);
      setCustomerName('');
      alert('Venda registrada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-[#141414]/5 shadow-xl">
      <h2 className="text-2xl md:text-3xl font-black tracking-tighter italic mb-6 md:mb-8">Nova Venda</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Selecionar Trufa</label>
          <select 
            value={selectedTruffleId}
            onChange={(e) => setSelectedTruffleId(e.target.value)}
            className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
          >
            <option value="">Escolha uma trufa...</option>
            {truffles.map(t => (
              <option key={t.id} value={t.id}>{t.name} (R${t.price.toFixed(2)}) - {t.stock} em estoque</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Quantidade</label>
            <input 
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Desconto Manual (R$)</label>
            <input 
              type="number"
              value={manualDiscount}
              onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
            />
          </div>
        </div>

        <div className="p-6 bg-[#141414] rounded-3xl text-white">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Valor Total</span>
            <span className="text-3xl font-black tracking-tighter">R${calculatedPrice.toFixed(2)}</span>
          </div>
          {selectedTruffle && (
            <p className="text-[10px] font-medium opacity-40">
              Preço unitário: R${(calculatedPrice / quantity).toFixed(2)} (incluindo descontos)
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 p-4 bg-[#F5F5F4] rounded-2xl">
          <input 
            type="checkbox"
            checked={isCredit}
            onChange={(e) => setIsCredit(e.target.checked)}
            className="w-6 h-6 rounded-lg text-[#141414] focus:ring-0"
          />
          <span className="font-bold text-sm">Registrar como "Fiado"</span>
        </div>

        <AnimatePresence>
          {isCredit && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Nome do Cliente</label>
              <input 
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Quem está comprando?"
                className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleSale}
          disabled={loading || !selectedTruffle || quantity <= 0}
          className="w-full bg-[#141414] text-white py-5 rounded-3xl font-black text-lg tracking-tight hover:bg-[#141414]/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl"
        >
          {loading ? 'Processando...' : 'Finalizar Venda'}
        </button>
      </div>
    </div>
  );
};

const TruffleManager: React.FC<{ truffles: Truffle[] }> = ({ truffles }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name,
        price,
        stock,
        ownerId: auth.currentUser!.uid
      };

      if (editingId) {
        await updateDoc(doc(db, 'truffles', editingId), data);
      } else {
        await addDoc(collection(db, 'truffles'), data);
      }

      setName('');
      setPrice(0);
      setStock(0);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'truffles');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Apenas administradores podem excluir produtos.')) return;
    try {
      await deleteDoc(doc(db, 'truffles', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `truffles/${id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#141414]/5 shadow-lg lg:sticky lg:top-8">
          <h3 className="text-xl font-black tracking-tight italic mb-6">
            {editingId ? 'Editar Trufa' : 'Adicionar Nova Trufa'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Nome</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-[#F5F5F4] rounded-xl font-bold border-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Preço</label>
                <input 
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="w-full p-3 bg-[#F5F5F4] rounded-xl font-bold border-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Estoque</label>
                <input 
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(parseInt(e.target.value))}
                  className="w-full p-3 bg-[#F5F5F4] rounded-xl font-bold border-none"
                  required
                />
              </div>
            </div>
            <button className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-[#141414]/90 transition-all">
              {editingId ? 'Atualizar' : 'Salvar Trufa'}
            </button>
            {editingId && (
              <button 
                type="button"
                onClick={() => setEditingId(null)}
                className="w-full bg-transparent text-[#141414]/40 py-2 font-bold text-sm"
              >
                Cancelar Edição
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {truffles.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-3xl border border-[#141414]/5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F5F5F4] rounded-2xl flex items-center justify-center">
                <Package size={24} className="text-[#141414]/40" />
              </div>
              <div>
                <h4 className="font-black text-lg tracking-tight">{t.name}</h4>
                <p className="text-xs font-bold text-[#141414]/40 uppercase tracking-wider">
                  R${t.price.toFixed(2)} • {t.stock} em estoque
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingId(t.id);
                  setName(t.name);
                  setPrice(t.price);
                  setStock(t.stock);
                }}
                className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDelete(t.id)}
                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Settings: React.FC<{ settings: UserSettings | null }> = ({ settings }) => {
  const [rules, setRules] = useState<PricingRule[]>(settings?.progressivePricing || []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', auth.currentUser!.uid), {
        ownerId: auth.currentUser!.uid,
        progressivePricing: rules
      });
      alert('Configurações salvas!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-[#141414]/5 shadow-xl">
      <h2 className="text-2xl md:text-3xl font-black tracking-tighter italic mb-6 md:mb-8">Preço Progressivo</h2>
      <p className="text-[#141414]/60 mb-8 text-sm leading-relaxed">
        Defina preços especiais baseados na quantidade. Por exemplo, se um cliente comprar 10 ou mais, o preço cai.
      </p>

      <div className="space-y-4 mb-8">
        {rules.map((rule, i) => (
          <div key={i} className="flex gap-4 items-end p-4 bg-[#F5F5F4] rounded-2xl">
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Qtd. Mínima</label>
              <input 
                type="number"
                value={rule.minQty}
                onChange={(e) => {
                  const newRules = [...rules];
                  newRules[i].minQty = parseInt(e.target.value);
                  setRules(newRules);
                }}
                className="w-full p-3 bg-white rounded-xl font-bold border-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Preço Unitário (R$)</label>
              <input 
                type="number"
                step="0.01"
                value={rule.price}
                onChange={(e) => {
                  const newRules = [...rules];
                  newRules[i].price = parseFloat(e.target.value);
                  setRules(newRules);
                }}
                className="w-full p-3 bg-white rounded-xl font-bold border-none"
              />
            </div>
            <button 
              onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
              className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setRules([...rules, { minQty: 1, price: 0 }])}
          className="flex-1 bg-[#F5F5F4] text-[#141414] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#141414]/5"
        >
          <Plus size={20} /> Adicionar Regra
        </button>
        <button 
          onClick={handleSave}
          className="flex-1 bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

const AdminHistory: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  const handleDelete = async (id: string) => {
    if (!confirm('AÇÃO ADMIN: Excluir este registro de venda permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'sales', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${id}`);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    try {
      await updateDoc(doc(db, 'sales', id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${id}`);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-[#141414]/5 shadow-xl overflow-hidden">
      <div className="p-6 md:p-8 border-b border-[#141414]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter italic">Histórico Administrativo</h2>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full self-start">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Acesso Admin</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F5F5F4]">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Data</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Produto</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Cliente</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Valor</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]/5">
            {sales.map(sale => (
              <tr key={sale.id} className="hover:bg-[#F5F5F4]/50 transition-colors">
                <td className="p-6 text-sm font-bold">{format(sale.date.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                <td className="p-6 text-sm font-bold">{sale.truffleName}</td>
                <td className="p-6 text-sm font-bold">{sale.customerName || '-'}</td>
                <td className="p-6 text-sm font-black">R${sale.totalPrice.toFixed(2)}</td>
                <td className="p-6">
                  <button 
                    onClick={() => handleUpdateStatus(sale.id, sale.status)}
                    className={cn(
                      "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                      sale.status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}
                  >
                    {sale.status === 'paid' ? 'pago' : 'pendente'}
                  </button>
                </td>
                <td className="p-6">
                  <button 
                    onClick={() => handleDelete(sale.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PendingPayments: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const pendingSalesByCustomer = useMemo(() => {
    const pending = sales.filter(s => s.status === 'pending');
    const grouped: { [key: string]: Sale[] } = {};
    
    pending.forEach(sale => {
      const name = sale.customerName || 'Sem Nome';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(sale);
    });

    return Object.entries(grouped)
      .map(([name, customerSales]) => ({
        name,
        sales: customerSales,
        total: customerSales.reduce((acc, s) => acc + s.totalPrice, 0)
      }))
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [sales, searchTerm]);

  const totalPending = useMemo(() => 
    sales.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.totalPrice, 0), 
  [sales]);

  const handleMarkAsPaid = async (saleIds: string[]) => {
    if (!confirm(`Confirmar pagamento de ${saleIds.length} registro(s)?`)) return;
    try {
      await Promise.all(saleIds.map(id => 
        updateDoc(doc(db, 'sales', id), { status: 'paid' })
      ));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/multiple`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="bg-[#141414] p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Total a Receber</p>
          <h3 className="text-5xl font-black tracking-tighter italic">R${totalPending.toFixed(2)}</h3>
        </div>
        <div className="relative z-10 flex items-center gap-3 bg-white/10 px-6 py-4 rounded-2xl backdrop-blur-md border border-white/10">
          <Users className="text-white/60" size={24} />
          <p className="font-bold text-sm">{pendingSalesByCustomer.length} clientes com débito</p>
        </div>
        {/* Decorative background element */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/20" size={20} />
        <input 
          type="text"
          placeholder="Buscar cliente por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-[#141414]/5 font-bold text-sm focus:ring-2 focus:ring-[#141414]/10 transition-all shadow-sm"
        />
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 gap-6">
        {pendingSalesByCustomer.map(customer => (
          <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={customer.name} 
            className="bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-sm overflow-hidden"
          >
            <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#F5F5F4]/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#141414] rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <UserIcon size={28} />
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight">{customer.name}</h4>
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
                    {customer.sales.length} {customer.sales.length === 1 ? 'item pendente' : 'itens pendentes'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
                <p className="text-3xl font-black text-orange-600 tracking-tighter">R${customer.total.toFixed(2)}</p>
                <button 
                  onClick={() => handleMarkAsPaid(customer.sales.map(s => s.id))}
                  className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95"
                >
                  <CheckCircle2 size={18} />
                  Quitar Tudo
                </button>
              </div>
            </div>

            <div className="p-8 pt-0">
              <div className="divide-y divide-[#141414]/5">
                {customer.sales.map(sale => (
                  <div key={sale.id} className="py-4 flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#141414]/40 group-hover:bg-[#141414] group-hover:text-white transition-colors">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{sale.quantity}x {sale.truffleName}</p>
                        <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
                          {format(sale.date.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="font-black text-sm">R${sale.totalPrice.toFixed(2)}</p>
                      <button 
                        onClick={() => handleMarkAsPaid([sale.id])}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Marcar apenas este como pago"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}

        {pendingSalesByCustomer.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black tracking-tight italic mb-2">Tudo em dia!</h3>
            <p className="text-[#141414]/40 font-bold">Não há pagamentos pendentes {searchTerm ? 'para esta busca' : 'no momento'}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'inventory' | 'settings' | 'admin' | 'pending'>('dashboard');
  
  const [truffles, setTruffles] = useState<Truffle[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const tabLabels = {
    dashboard: 'Painel',
    sales: 'Nova Venda',
    inventory: 'Estoque',
    settings: 'Regras de Preço',
    pending: 'Contas a Receber',
    admin: 'Histórico Admin'
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const pDoc = await getDoc(doc(db, 'users', u.uid));
        setProfile(pDoc.data() as UserProfile);
      } else {
        setProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const qTruffles = query(collection(db, 'truffles'), where('ownerId', '==', user.uid));
    const unsubscribeTruffles = onSnapshot(qTruffles, (snapshot) => {
      setTruffles(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Truffle)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'truffles'));

    const qSales = query(collection(db, 'sales'), where('ownerId', '==', user.uid), orderBy('date', 'desc'));
    const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
      setSales(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', user.uid), (d) => {
      if (d.exists()) setSettings(d.data() as UserSettings);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings'));

    return () => {
      unsubscribeTruffles();
      unsubscribeSales();
      unsubscribeSettings();
    };
  }, [user, isAuthReady]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 bg-[#141414] rounded-2xl"
        />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#E4E3E0] flex font-sans">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-[#141414]/5 p-8 flex flex-col hidden lg:flex">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center shadow-lg">
              <Package className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter italic">TruffleTech</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
              { id: 'sales', label: 'Nova Venda', icon: ShoppingCart },
              { id: 'pending', label: 'Contas a Receber', icon: DollarSign },
              { id: 'inventory', label: 'Estoque', icon: Package },
              { id: 'settings', label: 'Regras de Preço', icon: SettingsIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-[#141414] text-white shadow-lg" 
                    : "text-[#141414]/40 hover:bg-[#F5F5F4] hover:text-[#141414]"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}

            {profile?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all mt-8",
                  activeTab === 'admin' 
                    ? "bg-red-600 text-white shadow-lg" 
                    : "text-red-600/40 hover:bg-red-50 hover:text-red-600"
                )}
              >
                <ShieldCheck size={20} />
                Histórico Admin
              </button>
            )}
          </nav>

          <div className="pt-8 border-t border-[#141414]/5">
            <div className="flex items-center gap-3 mb-6 p-2">
              <div className="w-10 h-10 bg-[#F5F5F4] rounded-full flex items-center justify-center">
                <UserIcon size={20} className="text-[#141414]/40" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-sm truncate">{profile?.displayName}</p>
                <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-wider">{profile?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              Sair
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 lg:pb-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <header className="flex items-center justify-between mb-8 lg:mb-12">
              <div>
                <h2 className="text-2xl md:text-4xl font-black tracking-tighter italic capitalize">{tabLabels[activeTab]}</h2>
                <p className="text-[#141414]/40 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px] mt-1">
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative hidden md:block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/20" size={18} />
                  <input 
                    placeholder="Pesquisar registros..."
                    className="pl-12 pr-6 py-3 bg-white rounded-2xl border border-[#141414]/5 font-bold text-sm focus:ring-2 focus:ring-[#141414]/10 transition-all w-64"
                  />
                </div>
                {/* Mobile User Info */}
                <div className="lg:hidden flex items-center gap-2">
                  <button 
                    onClick={() => signOut(auth)}
                    className="p-2 text-red-600 bg-red-50 rounded-xl"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </header>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'dashboard' && <Dashboard sales={sales} truffles={truffles} onTabChange={setActiveTab} />}
                {activeTab === 'sales' && <SalesManager truffles={truffles} settings={settings} />}
                {activeTab === 'pending' && <PendingPayments sales={sales} />}
                {activeTab === 'inventory' && <TruffleManager truffles={truffles} />}
                {activeTab === 'settings' && <Settings settings={settings} />}
                {activeTab === 'admin' && profile?.role === 'admin' && <AdminHistory sales={sales} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Nav */}
        <nav className="lg:hidden fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-[#141414]/5 p-2 flex justify-around items-center z-50 rounded-[2rem] shadow-2xl">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
            { id: 'sales', icon: ShoppingCart, label: 'Venda' },
            { id: 'pending', icon: DollarSign, label: 'Fiados' },
            { id: 'inventory', icon: Package, label: 'Estoque' },
            { id: 'settings', icon: SettingsIcon, label: 'Preços' },
            ...(profile?.role === 'admin' ? [{ id: 'admin', icon: ShieldCheck, label: 'Admin' }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative",
                activeTab === item.id ? "text-[#141414]" : "text-[#141414]/30"
              )}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabMobile"
                  className="absolute inset-0 bg-[#141414]/5 rounded-2xl -z-10"
                />
              )}
              <item.icon size={20} />
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </ErrorBoundary>
  );
}
