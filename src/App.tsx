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
  Users,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const generateReceiptHTML = (sale: Sale, settings: UserSettings | null) => {
  const date = format(sale.date.toDate(), 'dd/MM/yyyy HH:mm');
  const businessName = settings?.businessName || 'TruffleTech';
  const businessPhone = settings?.businessPhone || '';
  
  return `
    <html>
      <head>
        <title>Recibo - ${businessName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            padding: 40px; 
            color: #1a1a1a;
            line-height: 1.6;
            max-width: 500px;
            margin: 0 auto;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 30px;
          }
          
          .brand { 
            font-size: 28px; 
            font-weight: 900; 
            letter-spacing: -1px; 
            font-style: italic;
            margin: 0;
            text-transform: uppercase;
          }
          
          .receipt-type {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #999;
            margin-top: 5px;
            display: block;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            font-size: 12px;
          }
          
          .info-label {
            color: #999;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
            display: block;
          }
          
          .info-value {
            font-weight: 700;
            color: #1a1a1a;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          
          .items-table th {
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #999;
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 10px;
          }
          
          .items-table td {
            padding: 15px 0;
            font-size: 14px;
            font-weight: 700;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .total-section {
            background: #f9f9f9;
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 40px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .total-label {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .total-value {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -1px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 50px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 10px;
            ${sale.status === 'paid' ? 'background: #e6fcf5; color: #0ca678;' : 'background: #fff4e6; color: #f76707;'}
          }
          
          .footer {
            text-align: center;
            font-size: 11px;
            color: #999;
            border-top: 1px dashed #eee;
            padding-top: 30px;
          }
          
          .footer p { margin: 5px 0; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="brand">${businessName}</h1>
          <span class="receipt-type">Comprovante de Transação</span>
        </div>
        
        <div class="info-grid">
          <div>
            <span class="info-label">Data e Hora</span>
            <span class="info-value">${date}</span>
          </div>
          <div>
            <span class="info-label">ID Transação</span>
            <span class="info-value">#${sale.id.slice(-8).toUpperCase()}</span>
          </div>
          <div style="grid-column: span 2;">
            <span class="info-label">Cliente</span>
            <span class="info-value">${sale.customerName || 'Consumidor Final'}</span>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Descrição do Item</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style="font-weight: 900;">${sale.truffleName}</div>
                <div style="font-size: 11px; color: #999; font-weight: 400;">Qtd: ${sale.quantity} un.</div>
              </td>
              <td style="text-align: right;">R$ ${sale.totalPrice.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-row">
            <span class="total-label">Valor Total</span>
            <span class="total-value">R$ ${sale.totalPrice.toFixed(2)}</span>
          </div>
          <div class="status-badge">
            ${sale.status === 'paid' ? 'Pagamento Confirmado' : 'Pagamento Pendente'}
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${businessName}</strong></p>
          ${businessPhone ? `<p>WhatsApp: ${businessPhone}</p>` : ''}
          <p style="margin-top: 15px;">Obrigado pela preferência!</p>
          <p style="font-size: 9px; margin-top: 20px; opacity: 0.5;">Documento gerado eletronicamente via TruffleTech</p>
        </div>
        
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
    </html>
  `;
};

const printReceipt = (sale: Sale, settings: UserSettings | null) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(generateReceiptHTML(sale, settings));
  printWindow.document.close();
};

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
  businessName?: string;
  businessPhone?: string;
  lowStockAlert?: number;
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
        // O email thiago07bassi@gmail.com será o administrador padrão
        const isAdmin = user.email === 'thiago07bassi@gmail.com';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          role: isAdmin ? 'admin' : 'user',
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

const Dashboard: React.FC<{ sales: Sale[], truffles: Truffle[], onTabChange: (tab: any) => void, settings: UserSettings | null }> = ({ sales, truffles, onTabChange, settings }) => {
  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalPrice, 0);
    const pendingRevenue = sales.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.totalPrice, 0);
    const totalSales = sales.length;
    const threshold = settings?.lowStockAlert || 10;
    const lowStock = truffles.filter(t => t.stock < threshold).length;

    return { totalRevenue, pendingRevenue, totalSales, lowStock };
  }, [sales, truffles, settings]);

  return (
    <div className="space-y-8">
      {settings?.businessName && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-2"
        >
          <h1 className="text-5xl font-black tracking-tighter italic text-[#141414]">{settings.businessName}</h1>
        </motion.div>
      )}
      
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight italic">Vendas Recentes</h3>
              <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">Últimas 5 transações</p>
            </div>
            <button 
              onClick={() => onTabChange('admin')}
              className="flex items-center justify-center w-10 h-10 bg-[#F5F5F4] hover:bg-[#141414] hover:text-white rounded-xl transition-all group"
              title="Ver Todas as Vendas"
            >
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-3">
            {sales.slice(0, 5).map((sale, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i} 
                className="flex items-center justify-between p-4 bg-[#F5F5F4]/50 hover:bg-[#F5F5F4] rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <History size={18} className="text-[#141414]/40" />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{sale.truffleName || 'Trufa Desconhecida'}</p>
                    <p className="text-[9px] text-[#141414]/40 font-bold uppercase tracking-wider mt-0.5">
                      {format(sale.date.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">R${sale.totalPrice.toFixed(2)}</p>
                  <span className={cn(
                    "text-[7px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest",
                    sale.status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {sale.status === 'paid' ? 'pago' : 'pendente'}
                  </span>
                </div>
              </motion.div>
            ))}
            {sales.length === 0 && (
              <div className="py-10 text-center opacity-20">
                <History size={40} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma venda registrada</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight italic">Status do Estoque</h3>
              <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">Níveis de disponibilidade</p>
            </div>
            <button 
              onClick={() => onTabChange('inventory')}
              className="flex items-center justify-center w-10 h-10 bg-[#F5F5F4] hover:bg-[#141414] hover:text-white rounded-xl transition-all group"
              title="Ver Estoque Completo"
            >
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-6">
            {truffles.slice(0, 5).map((truffle, i) => {
              const threshold = settings?.lowStockAlert || 10;
              const isLow = truffle.stock < threshold;
              const percentage = Math.min((truffle.stock / 50) * 100, 100);
              return (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className="space-y-2"
                >
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-black tracking-tight">{truffle.name}</p>
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        isLow ? "text-red-500" : "text-[#141414]/40"
                      )}>
                        {isLow ? 'Estoque Crítico' : 'Estoque Estável'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-lg font-black leading-none",
                        isLow ? "text-red-600" : "text-[#141414]"
                      )}>
                        {truffle.stock}
                      </span>
                      <span className="text-[10px] font-bold text-[#141414]/20 ml-1 uppercase">unid</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#F5F5F4] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={cn(
                        "h-full rounded-full transition-colors duration-500",
                        isLow ? "bg-red-500" : "bg-[#141414]"
                      )}
                    />
                  </div>
                </motion.div>
              );
            })}
            {truffles.length === 0 && (
              <div className="py-10 text-center opacity-20">
                <Package size={40} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum produto cadastrado</p>
              </div>
            )}
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

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
      const saleData: Omit<Sale, 'id'> = {
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

      const docRef = await addDoc(collection(db, 'sales'), saleData);
      await updateDoc(doc(db, 'truffles', selectedTruffle.id), {
        stock: selectedTruffle.stock - quantity
      });

      setLastSale({ id: docRef.id, ...saleData } as Sale);
      setShowSuccessModal(true);

      // Reset
      setSelectedTruffleId('');
      setQuantity(1);
      setManualDiscount(0);
      setIsCredit(false);
      setCustomerName('');
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

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && lastSale && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl text-center relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              
              <h3 className="text-3xl font-black tracking-tighter italic mb-2">Venda Finalizada!</h3>
              <p className="text-[#141414]/40 font-bold text-sm mb-8">Deseja gerar o comprovante para o cliente?</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    printReceipt(lastSale, settings);
                    setShowSuccessModal(false);
                  }}
                  className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all flex items-center justify-center gap-3"
                >
                  <FileText size={20} />
                  Imprimir Comprovante
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 rounded-2xl font-bold text-[#141414]/40 hover:text-[#141414] transition-all"
                >
                  Continuar sem Recibo
                </button>
              </div>

              {/* Decorative background */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-green-50 rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TruffleManager: React.FC<{ truffles: Truffle[] }> = ({ truffles }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTruffles = useMemo(() => {
    return truffles.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [truffles, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Form Section */}
      <div className="xl:col-span-4">
        <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-xl xl:sticky xl:top-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
              editingId ? "bg-blue-50 text-blue-600" : "bg-[#141414] text-white"
            )}>
              {editingId ? <Edit2 size={24} /> : <Plus size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter italic">
                {editingId ? 'Editar Trufa' : 'Nova Trufa'}
              </h3>
              <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
                {editingId ? 'Atualize os dados do produto' : 'Cadastre um novo sabor'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Nome do Sabor</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ninho com Nutella"
                className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Preço (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Estoque Inicial</label>
                <input 
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(parseInt(e.target.value))}
                  className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                  required
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button 
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-lg tracking-tight transition-all active:scale-95 shadow-lg disabled:opacity-50",
                  editingId ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#141414] text-white hover:bg-[#141414]/90"
                )}
              >
                {isSubmitting ? 'Processando...' : editingId ? 'Atualizar Trufa' : 'Cadastrar Trufa'}
              </button>
              
              {editingId && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setName('');
                    setPrice(0);
                    setStock(0);
                  }}
                  className="w-full py-2 font-bold text-sm text-[#141414]/40 hover:text-[#141414] transition-colors"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="xl:col-span-8 space-y-6">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#141414]/20 group-focus-within:text-[#141414] transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Buscar no estoque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm focus:ring-2 focus:ring-[#141414]/10 font-bold transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTruffles.map((t, i) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                key={t.id} 
                className="bg-white p-6 rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-[#F5F5F4] rounded-2xl flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition-colors">
                    <Package size={28} />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingId(t.id);
                        setName(t.name);
                        setPrice(t.price);
                        setStock(t.stock);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <h4 className="text-xl font-black tracking-tighter italic">{t.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#141414]">R$ {t.price.toFixed(2)}</span>
                    <span className="text-[#141414]/20">•</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                      t.stock <= 5 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                    )}>
                      {t.stock} em estoque
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#141414]/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Status do Produto</span>
                  {t.stock <= 0 ? (
                    <span className="flex items-center gap-1 text-red-600 font-bold text-[10px] uppercase tracking-widest">
                      <AlertCircle size={12} /> Esgotado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase tracking-widest">
                      <CheckCircle2 size={12} /> Disponível
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredTruffles.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-[#141414]/10">
            <div className="w-20 h-20 bg-[#F5F5F4] text-[#141414]/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Package size={40} />
            </div>
            <h3 className="text-xl font-black tracking-tighter italic mb-2">Nenhum produto encontrado</h3>
            <p className="text-[#141414]/40 font-bold text-sm">
              {searchTerm ? 'Tente buscar por outro termo.' : 'Comece cadastrando sua primeira trufa no formulário ao lado.'}
            </p>
          </div>
        )}
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

const AdminHistory: React.FC<{ sales: Sale[], settings: UserSettings | null }> = ({ sales, settings }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Senha administrativa fixa para este exemplo
  const ADMIN_PASSWORD = "admin"; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha incorreta. Acesso negado.');
      setPassword('');
    }
  };

  const handleDelete = async () => {
    if (!deletingSale) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'sales', deletingSale.id));
      setDeletingSale(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${deletingSale.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    try {
      const { id, ...data } = editingSale;
      await updateDoc(doc(db, 'sales', id), data);
      setEditingSale(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${editingSale.id}`);
    }
  };

  const printReceipt = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const date = format(sale.date.toDate(), 'dd/MM/yyyy HH:mm');
    const businessName = settings?.businessName || 'TruffleTech';
    const businessPhone = settings?.businessPhone || '';
    
    printWindow.document.write(generateReceiptHTML(sale, settings));
    printWindow.document.close();
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-2xl text-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} />
        </div>
        <h2 className="text-2xl font-black tracking-tighter italic mb-2">Área Restrita</h2>
        <p className="text-[#141414]/40 font-bold mb-8 text-sm">Insira a senha administrativa para acessar o histórico e gerenciar registros.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="password"
            placeholder="Senha Admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold text-center focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
            autoFocus
          />
          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all active:scale-95"
          >
            Acessar Histórico
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-[#141414]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter italic">Histórico Administrativo</h2>
            <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">Gerenciamento total de registros</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full self-start">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Acesso Liberado</span>
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
                  <td className="p-6 text-sm font-bold">{format(sale.date.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR })}</td>
                  <td className="p-6 text-sm font-bold">{sale.truffleName}</td>
                  <td className="p-6 text-sm font-bold">{sale.customerName || '-'}</td>
                  <td className="p-6 text-sm font-black">R${sale.totalPrice.toFixed(2)}</td>
                  <td className="p-6">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                      sale.status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {sale.status === 'paid' ? 'pago' : 'pendente'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => printReceipt(sale)}
                        className="p-2 text-[#141414]/40 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Imprimir Recibo"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => setEditingSale(sale)}
                        className="p-2 text-[#141414]/40 hover:text-[#141414] hover:bg-[#F5F5F4] rounded-lg transition-all"
                        title="Editar Registro"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setDeletingSale(sale)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir Registro"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deletingSale && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Excluir Registro?</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">
                Tem certeza que deseja excluir a venda de <span className="text-[#141414]">{deletingSale.truffleName}</span>? Esta ação é permanente.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingSale(null)}
                  disabled={isDeleting}
                  className="flex-1 py-4 font-bold text-[#141414]/40 hover:text-[#141414] transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Excluir'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingSale && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingSale(null)}
                className="absolute right-6 top-6 p-2 hover:bg-[#F5F5F4] rounded-full transition-colors"
              >
                <Plus className="rotate-45 text-[#141414]/40" size={24} />
              </button>

              <h3 className="text-2xl font-black tracking-tighter italic mb-8">Editar Registro de Venda</h3>

              <form onSubmit={handleUpdateSale} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Cliente</label>
                  <input 
                    type="text"
                    value={editingSale.customerName}
                    onChange={(e) => setEditingSale({ ...editingSale, customerName: e.target.value })}
                    className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#141414]/5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Valor Total (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingSale.totalPrice}
                      onChange={(e) => setEditingSale({ ...editingSale, totalPrice: parseFloat(e.target.value) })}
                      className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#141414]/5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Status</label>
                    <select 
                      value={editingSale.status}
                      onChange={(e) => setEditingSale({ ...editingSale, status: e.target.value as 'paid' | 'pending' })}
                      className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#141414]/5 appearance-none"
                    >
                      <option value="paid">Pago</option>
                      <option value="pending">Pendente (Fiado)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingSale(null)}
                    className="flex-1 py-4 font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all active:scale-95"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PendingPayments: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
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

  const handleMarkAsPaid = async (saleIds: string[], customerName?: string) => {
    const processingId = customerName || saleIds[0];
    setIsProcessing(processingId);
    try {
      await Promise.all(saleIds.map(id => 
        updateDoc(doc(db, 'sales', id), { status: 'paid' })
      ));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/multiple`);
    } finally {
      setIsProcessing(null);
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
        <AnimatePresence mode="popLayout">
          {pendingSalesByCustomer.map(customer => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
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
                    onClick={() => handleMarkAsPaid(customer.sales.map(s => s.id), customer.name)}
                    disabled={isProcessing === customer.name}
                    className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing === customer.name ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    {isProcessing === customer.name ? 'Processando...' : 'Quitar Tudo'}
                  </button>
                </div>
              </div>

              <div className="p-8 pt-0">
                <div className="divide-y divide-[#141414]/5">
                  <AnimatePresence mode="popLayout">
                    {customer.sales.map(sale => (
                      <motion.div 
                        layout
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        key={sale.id} 
                        className="py-4 flex justify-between items-center group"
                      >
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
                            disabled={isProcessing === sale.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Marcar apenas este como pago"
                          >
                            {isProcessing === sale.id ? (
                              <div className="w-5 h-5 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
                            ) : (
                              <CheckCircle2 size={20} />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {pendingSalesByCustomer.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black tracking-tight italic mb-2">Tudo em dia!</h3>
            <p className="text-[#141414]/40 font-bold">Não há pagamentos pendentes {searchTerm ? 'para esta busca' : 'no momento'}.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const SettingsHub: React.FC<{ 
  settings: UserSettings | null, 
  truffles: Truffle[], 
  sales: Sale[],
  profile: UserProfile | null,
  activeSubTab: 'pricing' | 'inventory' | 'admin' | 'business' | 'account',
  onSubTabChange: (tab: any) => void
}> = ({ settings, truffles, sales, profile, activeSubTab, onSubTabChange }) => {
  
  const exportToPDF = () => {
    const doc = new jsPDF();
    const businessName = settings?.businessName || 'TruffleTech';
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(20, 20, 20);
    doc.text(businessName, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Relatório de Vendas - Gerado em: ${dateStr}`, 14, 30);
    
    // Stats Summary
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalSales = sales.length;
    const pendingSales = sales.filter(s => s.status === 'pending').length;

    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text('Resumo Geral:', 14, 45);
    doc.setFontSize(10);
    doc.text(`Total de Vendas: ${totalSales}`, 14, 52);
    doc.text(`Receita Total: R$ ${totalRevenue.toFixed(2)}`, 14, 58);
    doc.text(`Vendas Pendentes: ${pendingSales}`, 14, 64);

    // Table
    const tableColumn = ["Data", "Produto", "Qtd", "Total", "Cliente", "Status"];
    const tableRows = sales.map(s => [
      format(s.date.toDate(), 'dd/MM/yy HH:mm'),
      s.truffleName,
      s.quantity,
      `R$ ${s.totalPrice.toFixed(2)}`,
      s.customerName || '-',
      s.status === 'paid' ? 'PAGO' : 'PENDENTE'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 244] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        3: { fontStyle: 'bold' },
        5: { fontStyle: 'bold' }
      }
    });

    doc.save(`relatorio_vendas_${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

  const BusinessSettings = () => {
    const [name, setName] = useState(settings?.businessName || '');
    const [phone, setPhone] = useState(settings?.businessPhone || '');
    const [alert, setAlert] = useState(settings?.lowStockAlert || 10);
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await setDoc(doc(db, 'settings', auth.currentUser!.uid), {
          ...settings,
          businessName: name,
          businessPhone: phone,
          lowStockAlert: alert
        }, { merge: true });
        alert('Configurações salvas!');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'settings');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-sm">
        <h3 className="text-xl font-black tracking-tighter italic mb-6">Perfil do Negócio</h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Nome da Loja/Marca</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
              placeholder="Ex: Trufas da Maria"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">WhatsApp de Contato</label>
            <input 
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Alerta de Estoque Baixo (unidades)</label>
            <input 
              type="number"
              value={alert}
              onChange={(e) => setAlert(parseInt(e.target.value) || 0)}
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
            />
          </div>
          <button 
            type="submit"
            disabled={saving}
            className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </form>
      </div>
    );
  };

  const menuItems = [
    { id: 'business', label: 'Negócio', icon: UserIcon },
    { id: 'pricing', label: 'Preços', icon: DollarSign },
    { id: 'inventory', label: 'Estoque', icon: Package },
    ...(profile?.role === 'admin' ? [{ id: 'admin', label: 'Histórico Admin', icon: ShieldCheck }] : []),
    { id: 'account', label: 'Conta & Dados', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-8">
      {/* Sub-navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSubTabChange(item.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all",
              activeSubTab === item.id 
                ? "bg-[#141414] text-white shadow-md" 
                : "bg-white text-[#141414]/40 border border-[#141414]/5 hover:bg-[#F5F5F4]"
            )}
          >
            <item.icon size={16} />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeSubTab === 'business' && <BusinessSettings />}
        {activeSubTab === 'pricing' && <Settings settings={settings} />}
        {activeSubTab === 'inventory' && <TruffleManager truffles={truffles} />}
        {activeSubTab === 'admin' && profile?.role === 'admin' && <AdminHistory sales={sales} settings={settings} />}
        {activeSubTab === 'account' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-sm">
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Exportar Dados</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-6">Baixe todo o seu histórico de vendas em um relatório PDF organizado e profissional.</p>
              <button 
                onClick={exportToPDF}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
              >
                <FileText size={20} />
                Exportar Relatório (.PDF)
              </button>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-sm">
              <h3 className="text-xl font-black tracking-tighter italic mb-2 text-red-600">Sair do Aplicativo</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-6">Encerra sua sessão atual de forma segura.</p>
              <button 
                onClick={() => signOut(auth)}
                className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-3 border border-red-100"
              >
                <LogOut size={20} />
                Encerrar Sessão
              </button>
            </div>
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'settings' | 'pending'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'pricing' | 'inventory' | 'admin' | 'business' | 'account'>('pricing');
  
  const [truffles, setTruffles] = useState<Truffle[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const tabLabels = {
    dashboard: 'Painel',
    sales: 'Nova Venda',
    pending: 'Contas a Receber',
    settings: 'Configurações'
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const pDoc = await getDoc(doc(db, 'users', u.uid));
        const profileData = pDoc.data() as UserProfile;
        
        // Garante que o dono do sistema sempre tenha acesso admin
        if (u.email === 'thiago07bassi@gmail.com' && profileData?.role !== 'admin') {
          await updateDoc(doc(db, 'users', u.uid), { role: 'admin' });
          profileData.role = 'admin';
        }
        
        setProfile(profileData);
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
      <div className="h-screen bg-[#E4E3E0] flex font-sans overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-[#141414]/5 p-8 flex flex-col hidden lg:flex shrink-0">
          <div className="flex items-center gap-3 mb-12 shrink-0">
            <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center shadow-lg">
              <Package className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter italic">TruffleTech</h1>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar pr-2 -mr-2">
            {[
              { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
              { id: 'sales', label: 'Nova Venda', icon: ShoppingCart },
              { id: 'pending', label: 'Contas a Receber', icon: DollarSign },
              { id: 'settings', label: 'Configurações', icon: SettingsIcon },
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
          </nav>

          <div className="pt-8 border-t border-[#141414]/5 mt-auto shrink-0">
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 bg-[#F5F5F4] rounded-full flex items-center justify-center">
                <UserIcon size={20} className="text-[#141414]/40" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-sm truncate">{profile?.displayName}</p>
                <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-wider">{profile?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
            </div>
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
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    sales={sales} 
                    truffles={truffles} 
                    onTabChange={(tab) => {
                      if (['pricing', 'inventory', 'admin', 'business', 'account'].includes(tab)) {
                        setActiveTab('settings');
                        setSettingsTab(tab as any);
                      } else {
                        setActiveTab(tab as any);
                      }
                    }} 
                    settings={settings} 
                  />
                )}
                {activeTab === 'sales' && <SalesManager truffles={truffles} settings={settings} />}
                {activeTab === 'pending' && <PendingPayments sales={sales} />}
                {activeTab === 'settings' && (
                  <SettingsHub 
                    settings={settings} 
                    truffles={truffles} 
                    sales={sales} 
                    profile={profile} 
                    activeSubTab={settingsTab}
                    onSubTabChange={setSettingsTab}
                  />
                )}
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
            { id: 'settings', icon: SettingsIcon, label: 'Config' },
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
