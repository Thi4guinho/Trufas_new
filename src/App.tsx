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

const normalizeName = (name: string) => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const downloadReceiptPDF = (sale: Sale, settings: UserSettings | null) => {
  const doc = new jsPDF();
  const businessName = settings?.businessName || 'TruffleTech';
  const businessPhone = settings?.businessPhone || '';
  const date = format(sale.date.toDate(), 'dd/MM/yyyy HH:mm');
  const transactionId = sale.id.slice(-8).toUpperCase();

  const subtotal = sale.totalPrice + sale.discount;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(businessName, 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('COMPROVANTE DE VENDA', 105, 28, { align: 'center' });

  // Info Grid
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);

  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA/HORA:', 20, 45);
  doc.text('ID TRANS.:', 105, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.text(date, 45, 45);
  doc.text(`#${transactionId}`, 125, 45);

  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName || 'Consumidor Final', 45, 52);

  // Items Table
  const tableBody: any[][] = sale.items && sale.items.length > 0 
    ? sale.items.map(item => [
        { 
          content: `${item.truffleName}\n${item.quantity} un. x R$ ${item.pricePerUnit.toFixed(2)}`,
          styles: { fontStyle: 'bold' } 
        },
        `R$ ${(item.quantity * item.pricePerUnit).toFixed(2)}`
      ])
    : [[
        { 
          content: `${sale.truffleName || 'Trufa'}\n${sale.quantity} un. x R$ ${(subtotal / sale.quantity).toFixed(2)}`,
          styles: { fontStyle: 'bold' } 
        },
        `R$ ${subtotal.toFixed(2)}`
      ]];

  if (sale.discount > 0) {
    tableBody.push([
      { 
        content: `   DESCONTO APLICADO`,
        styles: { fontStyle: 'italic', textColor: [100, 100, 100] } 
      },
      `(- R$ ${sale.discount.toFixed(2)})`
    ]);
  }

  autoTable(doc, {
    startY: 65,
    head: [['ITEM / DESCRIÇÃO', 'VALOR']],
    body: tableBody,
    theme: 'plain',
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0], 
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary Section
  doc.setDrawColor(200);
  doc.line(120, finalY, 190, finalY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SUBTOTAL:', 120, finalY + 10);
  doc.text(`R$ ${subtotal.toFixed(2)}`, 190, finalY + 10, { align: 'right' });

  if (sale.discount > 0) {
    doc.text('DESCONTO:', 120, finalY + 16);
    doc.text(`- R$ ${sale.discount.toFixed(2)}`, 190, finalY + 16, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL:', 120, finalY + 26);
  doc.text(`R$ ${sale.totalPrice.toFixed(2)}`, 190, finalY + 26, { align: 'right' });

  if (sale.paidAmount > 0 && sale.status === 'paid') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('PAGAMENTO TOTAL REALIZADO', 120, finalY + 34);
  } else if (sale.paidAmount > 0 && sale.status === 'pending') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('VALOR PAGO ATÉ O MOMENTO:', 120, finalY + 34);
    doc.text(`R$ ${sale.paidAmount.toFixed(2)}`, 190, finalY + 34, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('SALDO DEVEDOR:', 120, finalY + 40);
    doc.text(`R$ ${(sale.totalPrice - sale.paidAmount).toFixed(2)}`, 190, finalY + 40, { align: 'right' });
  }

  // Status Badge
  const statusText = sale.status === 'paid' ? 'PAGAMENTO CONFIRMADO' : 'PAGAMENTO PENDENTE';
  doc.setFontSize(8);
  if (sale.status === 'paid') {
    doc.setTextColor(12, 166, 120);
  } else {
    doc.setTextColor(247, 103, 7);
  }
  doc.text(statusText, 20, finalY + 10);

  // Footer
  doc.setTextColor(150);
  doc.setFontSize(9);
  doc.text('Obrigado pela preferência!', 105, finalY + 50, { align: 'center' });
  if (businessPhone) {
    doc.text(`WhatsApp: ${businessPhone}`, 105, finalY + 55, { align: 'center' });
  }
  doc.setFontSize(7);
  doc.text('Documento gerado eletronicamente via TruffleTech', 105, finalY + 65, { align: 'center' });

  doc.save(`recibo-${transactionId}.pdf`);
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

interface Customer {
  id: string;
  name: string;
  phone: string;
  description: string;
  ownerId: string;
  createdAt: Timestamp;
}

interface SaleItem {
  truffleId: string;
  truffleName: string;
  quantity: number;
  pricePerUnit: number;
}

interface Sale {
  id: string;
  truffleId?: string; // Mantido para compatibilidade
  truffleName?: string; // Mantido para compatibilidade
  items?: SaleItem[];
  quantity: number;
  totalPrice: number;
  paidAmount: number;
  discount: number;
  isCredit: boolean;
  customerName: string;
  customerId?: string;
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
              onClick={() => onTabChange('history')}
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

const SalesManager: React.FC<{ 
  truffles: Truffle[], 
  customers: Customer[],
  settings: UserSettings | null,
  editingSale?: Sale | null,
  onCancelEdit?: () => void
}> = ({ truffles, customers, settings, editingSale, onCancelEdit }) => {
  const [basket, setBasket] = useState<SaleItem[]>([]);
  const [selectedTruffleId, setSelectedTruffleId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', description: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (editingSale) {
      if (editingSale.items && editingSale.items.length > 0) {
        setBasket(editingSale.items);
      } else {
        setBasket([{
          truffleId: editingSale.truffleId || '',
          truffleName: editingSale.truffleName || 'Trufa',
          quantity: editingSale.quantity,
          pricePerUnit: (editingSale.totalPrice + editingSale.discount) / editingSale.quantity
        }]);
      }
      setManualDiscount(editingSale.discount);
      setIsCredit(editingSale.isCredit);
      setCustomerName(editingSale.customerName);
      setSelectedCustomerId(editingSale.customerId || '');
    } else {
      setBasket([]);
      setSelectedTruffleId('');
      setItemQuantity(1);
      setManualDiscount(0);
      setIsCredit(false);
      setCustomerName('');
      setSelectedCustomerId('');
    }
  }, [editingSale]);

  const totalQuantity = useMemo(() => basket.reduce((sum, item) => sum + item.quantity, 0), [basket]);

  const calculatedPrice = useMemo(() => {
    if (basket.length === 0) return 0;
    
    let totalPrice = 0;
    let unitPrice = 0;

    // Se houver regras de preço progressivo, elas se aplicam à quantidade TOTAL da venda
    if (settings?.progressivePricing) {
      const sortedRules = [...settings.progressivePricing].sort((a, b) => b.minQty - a.minQty);
      const rule = sortedRules.find(r => totalQuantity >= r.minQty);
      
      if (rule) {
        unitPrice = rule.price;
        totalPrice = unitPrice * totalQuantity;
      } else {
        // Se não houver regra, usa o preço individual de cada trufa no cesto
        totalPrice = basket.reduce((sum, item) => {
          const truffle = truffles.find(t => t.id === item.truffleId);
          return sum + (truffle?.price || 0) * item.quantity;
        }, 0);
      }
    } else {
      // Sem preço progressivo, soma os preços individuais
      totalPrice = basket.reduce((sum, item) => {
        const truffle = truffles.find(t => t.id === item.truffleId);
        return sum + (truffle?.price || 0) * item.quantity;
      }, 0);
    }

    return totalPrice - manualDiscount;
  }, [basket, totalQuantity, manualDiscount, settings, truffles]);

  const addToBasket = () => {
    if (!selectedTruffleId || itemQuantity <= 0) return;
    const truffle = truffles.find(t => t.id === selectedTruffleId);
    if (!truffle) return;

    if (truffle.stock < itemQuantity) {
      alert('Estoque insuficiente para este sabor!');
      return;
    }

    const existingIndex = basket.findIndex(item => item.truffleId === selectedTruffleId);
    if (existingIndex >= 0) {
      const newBasket = [...basket];
      newBasket[existingIndex].quantity += itemQuantity;
      setBasket(newBasket);
    } else {
      setBasket([...basket, {
        truffleId: truffle.id,
        truffleName: truffle.name,
        quantity: itemQuantity,
        pricePerUnit: truffle.price
      }]);
    }
    setSelectedTruffleId('');
    setItemQuantity(1);
  };

  const removeFromBasket = (index: number) => {
    setBasket(basket.filter((_, i) => i !== index));
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    setCreatingCustomer(true);
    try {
      const customerData: Omit<Customer, 'id'> = {
        name: normalizeName(newCustomer.name),
        phone: newCustomer.phone,
        description: newCustomer.description,
        ownerId: auth.currentUser!.uid,
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(collection(db, 'customers'), customerData);
      setSelectedCustomerId(docRef.id);
      setCustomerName(customerData.name);
      setShowNewCustomerModal(false);
      setNewCustomer({ name: '', phone: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSale = async () => {
    if (basket.length === 0) return;

    if (!customerName && !selectedCustomerId) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    
    setLoading(true);
    try {
      const saleData: any = {
        items: basket,
        quantity: totalQuantity,
        totalPrice: calculatedPrice,
        paidAmount: isCredit ? (editingSale?.paidAmount || 0) : calculatedPrice,
        discount: manualDiscount,
        isCredit,
        customerName: selectedCustomerId ? (customers.find(c => c.id === selectedCustomerId)?.name || '') : normalizeName(customerName),
        customerId: selectedCustomerId || '',
        ownerId: auth.currentUser!.uid,
        status: isCredit ? 'pending' : 'paid'
      };

      // Para compatibilidade com o histórico antigo
      if (basket.length === 1) {
        saleData.truffleId = basket[0].truffleId;
        saleData.truffleName = basket[0].truffleName;
      } else {
        saleData.truffleId = 'multi';
        saleData.truffleName = `${basket.length} Sabores`;
      }

      if (editingSale) {
        // Restaurar estoque antigo antes de aplicar o novo
        const oldItems = editingSale.items || [{
          truffleId: editingSale.truffleId || '',
          quantity: editingSale.quantity
        }];

        for (const item of oldItems) {
          const truffle = truffles.find(t => t.id === item.truffleId);
          if (truffle) {
            await updateDoc(doc(db, 'truffles', truffle.id), {
              stock: truffle.stock + item.quantity
            });
          }
        }

        // Aplicar novo estoque e atualizar venda
        await updateDoc(doc(db, 'sales', editingSale.id), saleData);
        for (const item of basket) {
          const truffle = truffles.find(t => t.id === item.truffleId);
          if (truffle) {
            await updateDoc(doc(db, 'truffles', truffle.id), {
              stock: truffle.stock - item.quantity
            });
          }
        }
        
        alert('Venda atualizada com sucesso!');
        if (onCancelEdit) onCancelEdit();
      } else {
        // Nova venda
        saleData.date = Timestamp.now();
        const docRef = await addDoc(collection(db, 'sales'), saleData);
        
        // Atualizar estoque para cada item
        for (const item of basket) {
          const truffle = truffles.find(t => t.id === item.truffleId);
          if (truffle) {
            await updateDoc(doc(db, 'truffles', truffle.id), {
              stock: truffle.stock - item.quantity
            });
          }
        }

        setLastSale({ id: docRef.id, ...saleData } as Sale);
        setShowSuccessModal(true);

        // Reset
        setBasket([]);
        setSelectedTruffleId('');
        setItemQuantity(1);
        setManualDiscount(0);
        setIsCredit(false);
        setCustomerName('');
        setSelectedCustomerId('');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-[#141414]/5 shadow-xl relative">
      {editingSale && (
        <button 
          onClick={onCancelEdit}
          className="absolute right-6 top-6 p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
          title="Cancelar Edição"
        >
          <Plus className="rotate-45" size={20} />
        </button>
      )}
      <h2 className="text-2xl md:text-3xl font-black tracking-tighter italic mb-6 md:mb-8">
        {editingSale ? 'Editar Venda' : 'Nova Venda'}
      </h2>
      
      <div className="space-y-6">
        <div className="p-6 bg-[#F5F5F4] rounded-[2rem] space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Adicionar Trufas ao Pedido</label>
          <div className="space-y-4">
            <select 
              value={selectedTruffleId}
              onChange={(e) => setSelectedTruffleId(e.target.value)}
              className="w-full p-4 bg-white rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
            >
              <option value="">Escolha um sabor...</option>
              {truffles.map(t => (
                <option key={t.id} value={t.id}>{t.name} (R${t.price.toFixed(2)}) - {t.stock} em estoque</option>
              ))}
            </select>
            
            <div className="flex gap-2">
              <input 
                type="number"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                placeholder="Qtd"
                className="w-24 p-4 bg-white rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
              />
              <button 
                onClick={addToBasket}
                disabled={!selectedTruffleId || itemQuantity <= 0}
                className="flex-1 bg-[#141414] text-white rounded-2xl font-bold hover:bg-[#141414]/90 transition-all disabled:opacity-50"
              >
                Adicionar ao Pedido
              </button>
            </div>
          </div>

          {basket.length > 0 && (
            <div className="mt-6 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Itens Selecionados</label>
              {basket.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#141414]/5">
                  <div>
                    <span className="font-bold text-sm">{item.truffleName}</span>
                    <span className="ml-2 text-xs opacity-40">x{item.quantity}</span>
                  </div>
                  <button onClick={() => removeFromBasket(index)} className="text-red-500 p-1">
                    <Plus className="rotate-45" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-[#F5F5F4] rounded-2xl">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Total de Trufas</label>
            <div className="text-2xl font-black">{totalQuantity}</div>
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
          {totalQuantity > 0 && (
            <p className="text-[10px] font-medium opacity-40">
              Preço médio unitário: R${(calculatedPrice / totalQuantity).toFixed(2)}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Cliente <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select 
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  if (e.target.value) {
                    const c = customers.find(cust => cust.id === e.target.value);
                    if (c) setCustomerName(c.name);
                  } else {
                    setCustomerName('');
                  }
                }}
                className="flex-1 p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
              >
                <option value="">Selecionar Cliente Existente...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button 
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="p-4 bg-[#141414] text-white rounded-2xl hover:bg-[#141414]/90 transition-all flex items-center justify-center"
                title="Cadastrar Novo Cliente"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>
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

        <button 
          onClick={handleSale}
          disabled={loading || basket.length === 0}
          className="w-full bg-[#141414] text-white py-5 rounded-3xl font-black text-lg tracking-tight hover:bg-[#141414]/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl"
        >
          {loading ? 'Processando...' : editingSale ? 'Atualizar Venda' : 'Finalizar Venda'}
        </button>
      </div>

      {/* Modal Novo Cliente */}
      <AnimatePresence>
        {showNewCustomerModal && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowNewCustomerModal(false)}
                className="absolute right-6 top-6 p-2 hover:bg-[#F5F5F4] rounded-full transition-colors"
              >
                <Plus className="rotate-45 text-[#141414]/40" size={24} />
              </button>

              <h3 className="text-2xl font-black tracking-tighter italic mb-6">Novo Cliente</h3>
              
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Nome Completo</label>
                  <input 
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Celular / WhatsApp</label>
                  <input 
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Descrição / Observação</label>
                  <textarea 
                    value={newCustomer.description}
                    onChange={(e) => setNewCustomer({ ...newCustomer, description: e.target.value })}
                    className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 h-24 resize-none"
                    placeholder="Alguma observação sobre o cliente?"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={creatingCustomer || !newCustomer.name}
                  className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all disabled:opacity-50"
                >
                  {creatingCustomer ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <p className="text-[#141414]/40 font-bold text-sm mb-8">Deseja baixar o comprovante em PDF?</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    downloadReceiptPDF(lastSale, settings);
                    setShowSuccessModal(false);
                  }}
                  className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all flex items-center justify-center gap-3"
                >
                  <FileText size={20} />
                  Baixar Recibo (PDF)
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 rounded-2xl font-bold text-[#141414]/40 hover:text-[#141414] transition-all"
                >
                  Continuar sem PDF
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

const AdminHistory: React.FC<{ 
  sales: Sale[], 
  settings: UserSettings | null,
  onEditSale: (sale: Sale) => void
}> = ({ sales, settings, onEditSale }) => {
  const [confirmAction, setConfirmAction] = useState<{ type: 'edit' | 'delete', sale: Sale } | null>(null);
  const [passwordAction, setPasswordAction] = useState<{ type: 'edit' | 'delete', sale: Sale } | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const ADMIN_PASSWORD = "admin";

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      const action = passwordAction!;
      setPasswordAction(null);
      setPassword('');
      setPasswordError('');

      if (action.type === 'delete') {
        setIsDeleting(true);
        try {
          // Restaurar estoque ao excluir venda
          const itemsToRestore = action.sale.items || [{
            truffleId: action.sale.truffleId || '',
            quantity: action.sale.quantity
          }];

          for (const item of itemsToRestore) {
            if (!item.truffleId) continue;
            const truffleRef = doc(db, 'truffles', item.truffleId);
            const truffleDoc = await getDoc(truffleRef);
            if (truffleDoc.exists()) {
              await updateDoc(truffleRef, {
                stock: truffleDoc.data().stock + item.quantity
              });
            }
          }
          await deleteDoc(doc(db, 'sales', action.sale.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `sales/${action.sale.id}`);
        } finally {
          setIsDeleting(false);
        }
      } else if (action.type === 'edit') {
        onEditSale(action.sale);
      }
    } else {
      setPasswordError('Senha incorreta.');
      setPassword('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-[#141414]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter italic">Histórico de Vendas</h2>
            <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">Gerenciamento total de registros</p>
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
                  <td className="p-6 text-sm font-bold">
                    {sale.items && sale.items.length > 0 ? (
                      <div className="space-y-1">
                        {sale.items.map((item, i) => (
                          <div key={i} className="text-[10px] opacity-60">
                            {item.truffleName} (x{item.quantity})
                          </div>
                        ))}
                      </div>
                    ) : (
                      sale.truffleName
                    )}
                  </td>
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
                        onClick={() => downloadReceiptPDF(sale, settings)}
                        className="p-2 text-[#141414]/40 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Baixar PDF"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => setConfirmAction({ type: 'edit', sale })}
                        className="p-2 text-[#141414]/40 hover:text-[#141414] hover:bg-[#F5F5F4] rounded-lg transition-all"
                        title="Editar Registro"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setConfirmAction({ type: 'delete', sale })}
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

      {/* Modal de Confirmação */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
                confirmAction.type === 'delete' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              )}>
                {confirmAction.type === 'delete' ? <Trash2 size={32} /> : <Edit2 size={32} />}
              </div>
              <h3 className="text-xl font-black tracking-tighter italic mb-2">
                {confirmAction.type === 'delete' ? 'Excluir Registro?' : 'Editar Registro?'}
              </h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">
                {confirmAction.type === 'delete' 
                  ? `Tem certeza que deseja excluir a venda de ${confirmAction.sale.truffleName}?`
                  : `Deseja editar a venda de ${confirmAction.sale.truffleName}? Você será redirecionado para a aba de vendas.`}
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-4 font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setPasswordAction(confirmAction);
                    setConfirmAction(null);
                  }}
                  className={cn(
                    "flex-1 text-white py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95",
                    confirmAction.type === 'delete' ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Senha */}
      <AnimatePresence>
        {passwordAction && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Autenticação Necessária</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">Insira a senha de admin para prosseguir.</p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input 
                  type="password"
                  placeholder="Senha Admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold text-center focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
                  autoFocus
                />
                {passwordError && <p className="text-red-600 text-xs font-bold">{passwordError}</p>}
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setPasswordAction(null);
                      setPassword('');
                      setPasswordError('');
                    }}
                    className="flex-1 py-4 font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all active:scale-95"
                  >
                    Verificar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Overlay para Exclusão */}
      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 bg-[#141414]/50 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#141414]/10 border-t-[#141414] rounded-full animate-spin mb-4" />
              <p className="font-black tracking-tighter italic">Excluindo registro...</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PendingPayments: React.FC<{ sales: Sale[], customers: Customer[] }> = ({ sales, customers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [partialPaymentModal, setPartialPaymentModal] = useState<{ customerName: string, total: number, sales: Sale[] } | null>(null);
  const [partialAmount, setPartialAmount] = useState<string>('');
  
  const pendingSalesByCustomer = useMemo(() => {
    const pending = sales.filter(s => s.status === 'pending');
    const grouped: { [key: string]: { sales: Sale[], customer?: Customer, name: string } } = {};
    
    pending.forEach(sale => {
      const customerId = sale.customerId;
      const name = normalizeName(sale.customerName) || 'Sem Nome';
      const key = customerId || name;

      if (!grouped[key]) {
        grouped[key] = { 
          sales: [], 
          customer: customers.find(c => c.id === customerId),
          name: name
        };
      }
      grouped[key].sales.push(sale);
    });

    return Object.entries(grouped)
      .map(([key, data]) => ({
        key,
        name: data.name,
        customer: data.customer,
        sales: data.sales,
        total: data.sales.reduce((acc, s) => acc + (s.totalPrice - (s.paidAmount || 0)), 0)
      }))
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [sales, customers, searchTerm]);

  const totalPending = useMemo(() => 
    sales.filter(s => s.status === 'pending').reduce((acc, s) => acc + (s.totalPrice - (s.paidAmount || 0)), 0), 
  [sales]);

  const handleMarkAsPaid = async (saleIds: string[], customerName?: string) => {
    const processingId = customerName || saleIds[0];
    setIsProcessing(processingId);
    try {
      await Promise.all(saleIds.map(id => {
        const sale = sales.find(s => s.id === id);
        return updateDoc(doc(db, 'sales', id), { 
          status: 'paid',
          paidAmount: sale?.totalPrice || 0
        });
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/multiple`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePartialPayment = async () => {
    if (!partialPaymentModal || !partialAmount || isNaN(parseFloat(partialAmount))) return;
    
    let amountToApply = parseFloat(partialAmount);
    if (amountToApply <= 0) return;

    setIsProcessing(partialPaymentModal.customerName);
    try {
      // Sort sales by date (oldest first) to apply payment
      const sortedSales = [...partialPaymentModal.sales].sort((a, b) => a.date.toMillis() - b.date.toMillis());
      
      for (const sale of sortedSales) {
        if (amountToApply <= 0) break;
        
        const currentDebt = sale.totalPrice - (sale.paidAmount || 0);
        const paymentForThisSale = Math.min(amountToApply, currentDebt);
        const newPaidAmount = (sale.paidAmount || 0) + paymentForThisSale;
        
        await updateDoc(doc(db, 'sales', sale.id), {
          paidAmount: newPaidAmount,
          status: newPaidAmount >= sale.totalPrice ? 'paid' : 'pending'
        });
        
        amountToApply -= paymentForThisSale;
      }
      
      setPartialPaymentModal(null);
      setPartialAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/partial`);
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
              key={customer.key} 
              className="bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-sm overflow-hidden"
            >
              <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#F5F5F4]/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#141414] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <UserIcon size={28} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black tracking-tight">{customer.name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
                        {customer.sales.length} {customer.sales.length === 1 ? 'item pendente' : 'itens pendentes'}
                      </p>
                      {customer.customer?.phone && (
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                          {customer.customer.phone}
                        </p>
                      )}
                    </div>
                    {customer.customer?.description && (
                      <p className="text-[10px] font-medium text-[#141414]/40 mt-1 line-clamp-1 italic">
                        "{customer.customer.description}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
                  <p className="text-3xl font-black text-orange-600 tracking-tighter">R${customer.total.toFixed(2)}</p>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => setPartialPaymentModal({ customerName: customer.name, total: customer.total, sales: customer.sales })}
                      className="flex-1 md:flex-none bg-[#141414] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#141414]/90 transition-all active:scale-95"
                    >
                      Pagar Parte
                    </button>
                    <button 
                      onClick={() => handleMarkAsPaid(customer.sales.map(s => s.id), customer.name)}
                      disabled={isProcessing === customer.name}
                      className="flex-1 md:flex-none bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing === customer.name ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      {isProcessing === customer.name ? '...' : 'Quitar Tudo'}
                    </button>
                  </div>
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
                            {sale.items && sale.items.length > 0 ? (
                              <div className="space-y-1">
                                {sale.items.map((item, i) => (
                                  <p key={i} className="font-bold text-sm">
                                    {item.quantity}x {item.truffleName}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="font-bold text-sm">{sale.quantity}x {sale.truffleName}</p>
                            )}
                            <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
                              {format(sale.date.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-black text-sm">R${(sale.totalPrice - (sale.paidAmount || 0)).toFixed(2)}</p>
                            {sale.paidAmount > 0 && (
                              <p className="text-[9px] font-bold text-green-600 uppercase">Pago: R${sale.paidAmount.toFixed(2)}</p>
                            )}
                          </div>
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

        {/* Partial Payment Modal */}
        <AnimatePresence>
          {partialPaymentModal && (
            <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
              >
                <h3 className="text-2xl font-black tracking-tighter italic mb-2">Pagamento Parcial</h3>
                <p className="text-[#141414]/40 font-bold text-sm mb-6">
                  Cliente: <span className="text-[#141414]">{partialPaymentModal.customerName}</span><br />
                  Dívida Total: <span className="text-orange-600">R$ {partialPaymentModal.total.toFixed(2)}</span>
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Valor a Pagar (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      autoFocus
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="Ex: 10.00"
                      className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => {
                        setPartialPaymentModal(null);
                        setPartialAmount('');
                      }}
                      className="flex-1 py-4 font-bold text-[#141414]/40 hover:text-[#141414] transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handlePartialPayment}
                      disabled={!partialAmount || isProcessing === partialPaymentModal.customerName}
                      className="flex-1 bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all disabled:opacity-50"
                    >
                      {isProcessing === partialPaymentModal.customerName ? 'Processando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const PasswordGate: React.FC<{ onAuthenticated: () => void, title: string, description: string }> = ({ onAuthenticated, title, description }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const ADMIN_PASSWORD = "admin"; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onAuthenticated();
      setError('');
    } else {
      setError('Senha incorreta. Acesso negado.');
      setPassword('');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-2xl text-center">
      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <ShieldCheck size={40} />
      </div>
      <h2 className="text-2xl font-black tracking-tighter italic mb-2">{title}</h2>
      <p className="text-[#141414]/40 font-bold mb-8 text-sm">{description}</p>
      
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
          Acessar Configurações
        </button>
      </form>
    </div>
  );
};

const SettingsHub: React.FC<{ 
  settings: UserSettings | null, 
  truffles: Truffle[], 
  sales: Sale[],
  profile: UserProfile | null,
  activeSubTab: 'pricing' | 'inventory' | 'business' | 'account',
  onSubTabChange: (tab: any) => void,
  setIsAdminAuthenticated: (val: boolean) => void
}> = ({ settings, truffles, sales, profile, activeSubTab, onSubTabChange, setIsAdminAuthenticated }) => {
  
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
                onClick={() => {
                  setIsAdminAuthenticated(false);
                  signOut(auth);
                }}
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'settings' | 'pending' | 'history'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'pricing' | 'inventory' | 'business' | 'account'>('business');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [editingSaleRecord, setEditingSaleRecord] = useState<Sale | null>(null);
  
  const [truffles, setTruffles] = useState<Truffle[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const tabLabels = {
    dashboard: 'Painel',
    sales: 'Nova Venda',
    pending: 'Contas a Receber',
    history: 'Histórico',
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

    const qCustomers = query(collection(db, 'customers'), where('ownerId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', user.uid), (d) => {
      if (d.exists()) setSettings(d.data() as UserSettings);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings'));

    return () => {
      unsubscribeTruffles();
      unsubscribeSales();
      unsubscribeCustomers();
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
              { id: 'history', label: 'Histórico', icon: History },
              { id: 'settings', label: 'Configurações', icon: SettingsIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'sales') setEditingSaleRecord(null);
                  setActiveTab(item.id as any);
                }}
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
                      if (tab === 'sales') setEditingSaleRecord(null);
                      if (['pricing', 'inventory', 'business', 'account'].includes(tab)) {
                        setActiveTab('settings');
                        setSettingsTab(tab as any);
                      } else {
                        setActiveTab(tab as any);
                      }
                    }} 
                    settings={settings} 
                  />
                )}
                {activeTab === 'sales' && (
                  <SalesManager 
                    truffles={truffles} 
                    customers={customers}
                    settings={settings} 
                    editingSale={editingSaleRecord}
                    onCancelEdit={() => {
                      setEditingSaleRecord(null);
                      setActiveTab('history');
                    }}
                  />
                )}
                {activeTab === 'pending' && <PendingPayments sales={sales} customers={customers} />}
                {activeTab === 'history' && (
                  <AdminHistory 
                    sales={sales} 
                    settings={settings} 
                    onEditSale={(sale) => {
                      setEditingSaleRecord(sale);
                      setActiveTab('sales');
                    }}
                  />
                )}
                {activeTab === 'settings' && (
                  !isAdminAuthenticated ? (
                    <PasswordGate 
                      onAuthenticated={() => setIsAdminAuthenticated(true)} 
                      title="Configurações"
                      description="Insira a senha administrativa para gerenciar preços, estoque e perfil do negócio."
                    />
                  ) : (
                    <SettingsHub 
                      settings={settings} 
                      truffles={truffles} 
                      sales={sales} 
                      profile={profile} 
                      activeSubTab={settingsTab}
                      onSubTabChange={setSettingsTab}
                      setIsAdminAuthenticated={setIsAdminAuthenticated}
                    />
                  )
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
            { id: 'history', icon: History, label: 'Histórico' },
            { id: 'settings', icon: SettingsIcon, label: 'Config' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'sales') setEditingSaleRecord(null);
                setActiveTab(item.id as any);
              }}
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
