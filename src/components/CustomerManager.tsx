import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Search, 
  User, 
  Trash2, 
  AlertCircle, 
  Phone, 
  FileText,
  DollarSign,
  Award,
  Calendar,
  History,
  TrendingUp
} from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Customer, OperationType, Sale } from '../types';
import { auth, db } from '../firebase';
import { handleFirestoreError, cn, normalizeName } from '../utils';
import { format } from 'date-fns';

interface CustomerManagerProps {
  customers: Customer[];
  sales: Sale[];
  profile: any;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, sales, profile }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'ranking'>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Dynamic calculations for each customer based on finished sales
  const customerStatsDict = useMemo(() => {
    const stats: { 
      [customerName: string]: { 
        totalSpent: number; 
        salesCount: number; 
        history: Sale[] 
      } 
    } = {};

    // Standardize key lookup by using normalized lower-case client name
    const activeSales = sales.filter(s => s.status !== 'cancelled');

    activeSales.forEach(s => {
      const normalizedSName = normalizeName(s.customerName);
      if (!normalizedSName) return;

      if (!stats[normalizedSName]) {
        stats[normalizedSName] = {
          totalSpent: 0,
          salesCount: 0,
          history: []
        };
      }

      stats[normalizedSName].totalSpent += s.totalPrice;
      stats[normalizedSName].salesCount += 1;
      stats[normalizedSName].history.push(s);
    });

    // Sort purchase history for each customer by date desc
    Object.keys(stats).forEach(key => {
      stats[key].history.sort((a, b) => b.date.seconds - a.date.seconds);
    });

    return stats;
  }, [sales]);

  // Combine Firestore customer profiles with their dynamic stats
  const customersWithStats = useMemo(() => {
    return customers.map(cust => {
      const normalizedName = normalizeName(cust.name);
      const stats = customerStatsDict[normalizedName] || { totalSpent: 0, salesCount: 0, history: [] };
      return {
        ...cust,
        totalSpent: stats.totalSpent,
        salesCount: stats.salesCount,
        history: stats.history
      };
    });
  }, [customers, customerStatsDict]);

  // Filter list
  const filteredCustomers = useMemo(() => {
    return customersWithStats
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customersWithStats, searchTerm]);

  // Customer ranking by total spent (Top Customers)
  const customerRanking = useMemo(() => {
    return [...customersWithStats]
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customersWithStats]);

  const selectedCustomerDetails = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customersWithStats.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customersWithStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSubmitting(true);
    
    try {
      const formattedName = normalizeName(name);
      const data = {
        name: formattedName,
        phone: phone.trim(),
        description: description.trim(),
        ownerId: profile?.companyId || auth.currentUser!.uid,
        createdAt: Timestamp.now()
      };

      if (editingId) {
        await updateDoc(doc(db, 'customers', editingId), data);
        
        // Log action (Security / audit trail requirement 10)
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Alterou cadastro de cliente: ${formattedName}`,
          details: `Telefone: ${phone}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });
      } else {
        await addDoc(collection(db, 'customers'), data);

        // Log action
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Criou cadastro de cliente: ${formattedName}`,
          details: `Telefone: ${phone}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });
      }

      setName('');
      setPhone('');
      setDescription('');
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const clientToDelete = customers.find(c => c.id === deletingId);
    try {
      await deleteDoc(doc(db, 'customers', deletingId));
      
      // Log action
      if (clientToDelete) {
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Excluiu cliente: ${clientToDelete.name}`,
          details: `Telefone anterior: ${clientToDelete.phone}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });
      }

      // Close details if deleted client was active
      if (selectedCustomerId === deletingId) {
        setSelectedCustomerId(null);
      }
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${deletingId}`);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Section and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Relacionamento Comercial</p>
          <h3 className="text-3xl font-black tracking-tighter italic">Gestão de Clientes</h3>
        </div>

        {/* View Segment Controls */}
        <div className="flex bg-[#F5F5F4] p-1 rounded-2xl self-start">
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedCustomerId(null);
            }}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeTab === 'list' && !selectedCustomerId ? "bg-[#141414] text-white shadow-sm" : "text-[#141414]/40 hover:text-[#141414]"
            )}
          >
            Geral / Lista
          </button>
          <button
            onClick={() => {
              setActiveTab('ranking');
              setSelectedCustomerId(null);
            }}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeTab === 'ranking' ? "bg-[#141414] text-white shadow-sm" : "text-[#141414]/40 hover:text-[#141414]"
            )}
          >
            🔥 Ranking de Compradores
          </button>
        </div>
      </div>

      {/* Main Views Layout */}
      {activeTab === 'list' && !selectedCustomerId && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Form Side */}
          <div className="xl:col-span-4">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-xl xl:sticky xl:top-8">
              <div className="flex items-center gap-3 mb-8">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colorsColor",
                  editingId ? "bg-blue-50 text-blue-600" : "bg-[#141414] text-white"
                )}>
                  {editingId ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tighter italic">
                    {editingId ? 'Editar Cliente' : 'Novo Cliente'}
                  </h3>
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
                    {editingId ? 'Atualize as informações' : 'Fidelize mais um cliente'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Nome Completo</label>
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Telefone / WhatsApp</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Anotações / Descrição</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Preferências, endereço de entrega..."
                    rows={3}
                    className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all text-xs"
                  />
                </div>

                <div className="pt-2 space-y-3">
                  <button 
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg disabled:opacity-50",
                      editingId ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#141414] text-white hover:bg-[#141414]/90"
                    )}
                  >
                    {isSubmitting ? 'Processando...' : editingId ? 'Atualizar Dados' : 'Fidelizar Cliente'}
                  </button>
                  
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setName('');
                        setPhone('');
                        setDescription('');
                      }}
                      className="w-full py-2 font-bold text-xs uppercase tracking-widest text-[#141414]/40 hover:text-[#141414] transition-colors"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Side */}
          <div className="xl:col-span-8 space-y-6">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#141414]/20 group-focus-within:text-[#141414] transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Buscar clientes cadastrados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] border border-[#141414]/5 shadow-sm focus:ring-2 focus:ring-[#141414]/10 font-bold transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredCustomers.map((c, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    key={c.id} 
                    className="bg-white p-6 rounded-[2rem] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#141414] group-hover:bg-[#141414] group-hover:text-white transition-colors shrink-0">
                        <User size={22} />
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            setEditingId(c.id);
                            setName(c.name);
                            setPhone(c.phone);
                            setDescription(c.description || '');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(c.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 mb-5">
                      <h4 className="text-lg font-black tracking-tighter italic text-[#141414]">{c.name}</h4>
                      
                      {c.phone ? (
                        <p className="text-xs font-bold text-[#141414]/50 flex items-center gap-1">
                          <Phone size={12} className="opacity-40" /> {c.phone}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-[#141414]/30 uppercase tracking-widest leading-none">Sem telefone</p>
                      )}

                      {c.description && (
                        <p className="text-xs font-medium text-[#141414]/60 bg-[#F5F5F4]/60 p-2.5 rounded-xl mt-3 border border-[#141414]/5 line-clamp-2">
                          {c.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Stats banner */}
                    <div className="grid grid-cols-2 gap-2 text-center bg-[#F5F5F4]/40 p-3 rounded-xl border border-[#141414]/5 mb-5 text-[10px] font-bold text-[#141414]/40">
                      <div>
                        <p className="uppercase text-[8px] tracking-wider mb-0.5 opacity-65">Total Comprado</p>
                        <p className="text-[#141414] font-black text-sm">R$ {c.totalSpent.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="uppercase text-[8px] tracking-wider mb-0.5 opacity-65">Nº de Pedidos</p>
                        <p className="text-[#141414] font-black text-sm">{c.salesCount}</p>
                      </div>
                    </div>

                    {c.salesCount > 0 && (
                      <button
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="w-full text-center py-2.5 rounded-xl border border-[#141414]/10 bg-white hover:bg-[#141414] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        Ver Histórico Detalhado
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Customer Purchase History Detailed View */}
      {selectedCustomerId && selectedCustomerDetails && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 creative-top-navigation">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="px-4 py-2 bg-[#F5F5F4] hover:bg-[#141414] hover:text-white rounded-xl text-xs font-bold transition-all"
            >
              ← Voltar à Lista
            </button>
            <h4 className="font-extrabold text-[#141414]">Histórico e Perfil de Compras</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer card profiling */}
            <div className="bg-white p-6 rounded-[2rem] border border-[#141414]/5 shadow-md flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 bg-[#141414] text-white rounded-2xl flex items-center justify-center mb-4">
                  <User size={32} />
                </div>
                <h3 className="text-2xl font-black text-[#141414] italic">{selectedCustomerDetails.name}</h3>
                {selectedCustomerDetails.phone && (
                  <p className="text-sm font-bold text-[#141414]/40 flex items-center gap-1.5 mt-1">
                    <Phone size={14} /> {selectedCustomerDetails.phone}
                  </p>
                )}
                {selectedCustomerDetails.description && (
                  <div className="mt-4 p-3 bg-[#F5F5F4] rounded-xl text-xs border border-[#141414]/5 text-[#141414]/60 whitespace-pre-wrap">
                    <strong className="text-[10px] uppercase font-black tracking-wider text-[#141414]/40 block mb-1">Anotações do Cliente</strong>
                    {selectedCustomerDetails.description}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[#141414]/5 mt-6 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-xl">
                  <p className="text-[8px] font-bold text-green-700 uppercase tracking-wider">Total Investido</p>
                  <p className="text-green-800 font-black text-lg mt-0.5">R$ {selectedCustomerDetails.totalSpent.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-[8px] font-bold text-blue-700 uppercase tracking-wider">Fidelidade</p>
                  <p className="text-blue-800 font-black text-lg mt-0.5">{selectedCustomerDetails.salesCount} Ped.</p>
                </div>
              </div>
            </div>

            {/* Purchases Logs */}
            <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm space-y-6">
              <h4 className="text-lg font-black tracking-tighter italic flex items-center gap-2">
                <History size={18} /> Histórico de Pedidos
              </h4>
              
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {selectedCustomerDetails.history.map((sale) => (
                  <div 
                    key={sale.id} 
                    className="p-4 rounded-xl border border-[#141414]/5 bg-[#FAF9F5] hover:bg-[#F5F5F4] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#141414] italic">Pedido #{sale.saleNumber}</span>
                        <span className="text-[#141414]/15">•</span>
                        <span className="text-[10px] font-bold text-[#141414]/40">
                          {format(sale.date.toDate(), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      
                      {/* Items loop */}
                      <div className="mt-1.5 space-y-0.5">
                        {sale.items && sale.items.length > 0 ? (
                          sale.items.map((item, id) => (
                            <p key={id} className="text-xs text-[#141414]/70 font-semibold">
                              {item.quantity}x {item.truffleName} (R$ {item.pricePerUnit.toFixed(2)})
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-[#141414]/70 font-semibold">
                            {sale.quantity}x {sale.truffleName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right self-end sm:self-center">
                      <p className="text-sm font-black text-[#141414]">R$ {sale.totalPrice.toFixed(2)}</p>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                        sale.paymentStatus === 'paid' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        {sale.paymentStatus === 'paid' ? 'Pago' : 'Pendente / Fiado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buying Customer Champions Ranking */}
      {activeTab === 'ranking' && (
        <div className="bg-white rounded-[2.5rem] border border-[#141414]/5 shadow-sm overflow-hidden p-8">
          <div className="mb-8">
            <h4 className="text-xl font-black tracking-tight italic flex items-center gap-2">
              <TrendingUp size={22} className="text-amber-500" />Ranking dos Melhores Compradores
            </h4>
            <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">Nossos parceiros e clientes mais frequentes</p>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            {customerRanking.map((cust, idx) => (
              <div 
                key={cust.id}
                className="flex items-center justify-between p-5 rounded-2xl bg-[#F5F5F4]/60 border border-[#141414]/5 hover:bg-white hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Ranking Position Accent */}
                {idx < 3 && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                )}

                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl font-black italic flex items-center justify-center shrink-0 border border-[#141414]/5",
                    idx === 0 ? "bg-amber-100 text-amber-700 text-lg" : 
                    idx === 1 ? "bg-slate-100 text-slate-700 text-md" : 
                    idx === 2 ? "bg-red-50 text-red-700 text-sm" : "bg-white text-[#141414]/40 text-xs"
                  )}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-[#141414] leading-tight italic">{cust.name}</h5>
                    <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-0.5">{cust.salesCount} Pedidos Concluídos</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[8px] font-bold text-[#141414]/40 uppercase tracking-wider">Total Comprado</p>
                  <p className="font-extrabold text-base text-[#111] mt-0.5">R$ {cust.totalSpent.toFixed(2)}</p>
                </div>
              </div>
            ))}

            {customerRanking.length === 0 && (
              <div className="text-center py-16 opacity-30">
                <Award size={44} className="mx-auto mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhuma venda realizada para clientes cadastrados ainda</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Excluir Cadastro?</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">
                Confirmando, este perfil de cliente será deletado. O histórico de compras do mesmo persistirá ligado ao seu nome em vendas efetuadas.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-4 font-bold text-sm uppercase text-[#141414]/40 hover:text-[#141414] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all text-xs uppercase tracking-wider"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
