import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Power, 
  Check, 
  X, 
  DollarSign, 
  Tag,
  SlidersHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Truffle, UserProfile, OperationType } from '../types';
import { cn, handleFirestoreError } from '../utils';

interface TruffleManagerProps {
  truffles: Truffle[];
  profile: UserProfile | null;
  lowStockLimit?: number;
}

export const TruffleManager: React.FC<TruffleManagerProps> = ({ truffles, profile }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Quick edit modal state (in case user wants to edit in a modal on mobile or anywhere)
  const [modalEditItem, setModalEditItem] = useState<Truffle | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalPrice, setModalPrice] = useState<number | ''>('');
  const [modalIsActive, setModalIsActive] = useState<boolean>(true);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const startEditInForm = (t: Truffle) => {
    setEditingId(t.id);
    setName(t.name);
    setPrice(t.price);
    setIsActive(t.active !== false);
    // Smooth scroll to form if on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditInModal = (t: Truffle) => {
    setModalEditItem(t);
    setModalName(t.name);
    setModalPrice(t.price);
    setModalIsActive(t.active !== false);
  };

  const cancelFormEdit = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setIsActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;

    setIsSubmitting(true);
    const parsedPrice = Number(price);

    try {
      if (editingId) {
        const prevTruffle = truffles.find(t => t.id === editingId);
        await updateDoc(doc(db, 'truffles', editingId), {
          name: name.trim(),
          price: parsedPrice,
          active: isActive,
        });
        
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Alterou produto: ${name.trim()}`,
          details: `Preço: R$ ${parsedPrice.toFixed(2)} | Status: ${isActive ? 'Ativo' : 'Desativado'} (Anterior: ${prevTruffle?.name || ''}, R$ ${prevTruffle?.price.toFixed(2) || '0.00'})`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });

      } else {
        await addDoc(collection(db, 'truffles'), {
          name: name.trim(),
          price: parsedPrice,
          cost: 0,
          stock: 0,
          active: isActive,
          ownerId: profile?.companyId || auth.currentUser!.uid
        });

        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Criou produto: ${name.trim()}`,
          details: `Preço: R$ ${parsedPrice.toFixed(2)} | Status: ${isActive ? 'Ativo' : 'Desativado'}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });
      }

      setName('');
      setPrice('');
      setIsActive(true);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'truffles');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditItem || !modalName.trim() || modalPrice === '') return;

    setModalSubmitting(true);
    const parsedPrice = Number(modalPrice);

    try {
      await updateDoc(doc(db, 'truffles', modalEditItem.id), {
        name: modalName.trim(),
        price: parsedPrice,
        active: modalIsActive,
      });
      
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: `Alterou produto: ${modalName.trim()}`,
        details: `Preço: R$ ${parsedPrice.toFixed(2)} | Status: ${modalIsActive ? 'Ativo' : 'Desativado'} (Anterior: ${modalEditItem.name}, R$ ${modalEditItem.price.toFixed(2)})`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });

      // If we were also editing this item in the side form, sync it
      if (editingId === modalEditItem.id) {
        setName(modalName.trim());
        setPrice(parsedPrice);
        setIsActive(modalIsActive);
      }

      setModalEditItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'truffles');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleActive = async (t: Truffle) => {
    const newStatus = t.active === false ? true : false;
    setTogglingId(t.id);
    try {
      await updateDoc(doc(db, 'truffles', t.id), {
        active: newStatus
      });

      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: `${newStatus ? 'Ativou' : 'Desativou'} produto: ${t.name}`,
        details: `Status alterado para ${newStatus ? 'Ativo (Disponível no PDV)' : 'Desativado (Oculto no PDV)'}`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });

      // If current form is editing this item, sync state
      if (editingId === t.id) {
        setIsActive(newStatus);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'truffles');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const itemToDelete = truffles.find(t => t.id === deletingId);
      await deleteDoc(doc(db, 'truffles', deletingId));
      
      if (itemToDelete) {
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Excluiu produto: ${itemToDelete.name}`,
          details: `Preço anterior: R$ ${itemToDelete.price.toFixed(2)}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });
      }
      
      if (editingId === deletingId) {
        cancelFormEdit();
      }
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'truffles');
    }
  };

  const totalCount = truffles.length;
  const activeCount = truffles.filter(t => t.active !== false).length;
  const inactiveCount = truffles.filter(t => t.active === false).length;

  const filteredTruffles = truffles.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isItemActive = t.active !== false;

    if (statusFilter === 'active') return matchesSearch && isItemActive;
    if (statusFilter === 'inactive') return matchesSearch && !isItemActive;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Top summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={cn(
            "p-5 rounded-3xl border transition-all text-left flex items-center justify-between",
            statusFilter === 'all' 
              ? "bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-md"
              : "bg-white dark:bg-zinc-900 border-[#141414]/5 dark:border-zinc-50/10 hover:border-[#141414]/20"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center",
              statusFilter === 'all' ? "bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-900" : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            )}>
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total de Produtos</p>
              <h3 className="text-2xl font-black tracking-tight">{totalCount}</h3>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={cn(
            "p-5 rounded-3xl border transition-all text-left flex items-center justify-between",
            statusFilter === 'active' 
              ? "bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-600/20"
              : "bg-white dark:bg-zinc-900 border-[#141414]/5 dark:border-zinc-50/10 hover:border-emerald-500/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center",
              statusFilter === 'active' ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            )}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Produtos Ativos</p>
              <h3 className="text-2xl font-black tracking-tight">{activeCount}</h3>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/20">PDV</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('inactive')}
          className={cn(
            "p-5 rounded-3xl border transition-all text-left flex items-center justify-between",
            statusFilter === 'inactive' 
              ? "bg-zinc-700 text-white border-transparent shadow-md"
              : "bg-white dark:bg-zinc-900 border-[#141414]/5 dark:border-zinc-50/10 hover:border-zinc-500/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center",
              statusFilter === 'inactive' ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}>
              <Power size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Desativados</p>
              <h3 className="text-2xl font-black tracking-tight">{inactiveCount}</h3>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-black/10 dark:bg-white/10">Ocultos</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Form: Create / Edit */}
        <div className="xl:col-span-4 space-y-6">
          <div className={cn(
            "p-6 md:p-8 rounded-[2.5rem] border shadow-sm transition-all relative overflow-hidden",
            editingId 
              ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 ring-2 ring-blue-500/20" 
              : "bg-white dark:bg-zinc-900 border-[#141414]/5 dark:border-zinc-50/10"
          )}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  editingId 
                    ? "bg-blue-600 text-white" 
                    : "bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900"
                )}>
                  {editingId ? <Edit2 size={18} /> : <Plus size={20} />}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    {editingId ? 'Editar Produto' : 'Novo Produto'}
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-[#141414]/50 dark:text-zinc-400 font-bold leading-none mt-1">
                    {editingId ? 'Edite nome, preço e status' : 'Cadastre um novo sabor ou item'}
                  </p>
                </div>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelFormEdit}
                  className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Cancelar Edição"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Product Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/60 dark:text-zinc-400 mb-2">
                  Nome do Produto / Sabor
                </label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/30 dark:text-zinc-500" size={16} />
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maracujá Cremoso, Brigadeiro Tradicional"
                    className="w-full pl-11 pr-4 py-4 bg-[#F5F5F4] dark:bg-zinc-800/80 rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/20 dark:ring-zinc-50/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>
              
              {/* Sale Price */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/60 dark:text-zinc-400 mb-2">
                  Preço de Venda (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xs text-[#141414]/40 dark:text-zinc-500">R$</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={Number.isNaN(price as number) ? '' : price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-11 pr-4 py-4 bg-[#F5F5F4] dark:bg-zinc-800/80 rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/20 dark:ring-zinc-50/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              {/* Status Switch (Active / Inactive) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/60 dark:text-zinc-400 mb-2">
                  Status de Disponibilidade
                </label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left",
                    isActive 
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200" 
                      : "bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                      isActive ? "bg-emerald-600 text-white" : "bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    )}>
                      {isActive ? <Check size={16} /> : <Power size={16} />}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs">
                        {isActive ? 'Produto Ativo' : 'Produto Desativado'}
                      </p>
                      <p className="text-[10px] opacity-75 font-semibold">
                        {isActive ? 'Visível para vendas no PDV' : 'Oculto das opções de venda'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Pill UI */}
                  <div className={cn(
                    "w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5",
                    isActive ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
                  )}>
                    <motion.div 
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-md",
                        isActive ? "ml-auto" : "mr-auto"
                      )}
                    />
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-3">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-98 shadow-md disabled:opacity-50 flex items-center justify-center gap-2",
                    editingId 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-[#141414] dark:bg-zinc-100 hover:bg-[#141414]/90 text-white dark:text-zinc-900"
                  )}
                >
                  {isSubmitting ? (
                    'Salvando...'
                  ) : editingId ? (
                    <>
                      <Check size={18} />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Cadastrar Produto
                    </>
                  )}
                </button>
                
                {editingId && (
                  <button 
                    type="button"
                    onClick={cancelFormEdit}
                    className="w-full py-3 font-bold text-xs uppercase tracking-widest text-[#141414]/50 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100 transition-colors"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right List: Products Grid & Filter Toolbar */}
        <div className="xl:col-span-8 space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/30 dark:text-zinc-500" size={18} />
              <input 
                type="text"
                placeholder="Buscar por sabor ou produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#F5F5F4] dark:bg-zinc-800/80 rounded-2xl font-bold focus:ring-2 focus:ring-[#141414]/10 dark:ring-zinc-50/10 border-none transition-all text-xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 font-bold"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shrink-0",
                  statusFilter === 'all'
                    ? "bg-[#141414] text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-[#F5F5F4] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                )}
              >
                Todos ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5",
                  statusFilter === 'active'
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                )}
              >
                <CheckCircle2 size={13} />
                Ativos ({activeCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5",
                  statusFilter === 'inactive'
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                )}
              >
                <Power size={13} />
                Desativados ({inactiveCount})
              </button>
            </div>
          </div>

          {/* Product Cards Grid */}
          {filteredTruffles.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 p-12 text-center">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Package size={32} />
              </div>
              <h3 className="text-lg font-black tracking-tight text-[#141414] dark:text-zinc-100 mb-1">
                Nenhum produto encontrado
              </h3>
              <p className="text-xs text-[#141414]/50 dark:text-zinc-400 max-w-sm mx-auto">
                {searchQuery 
                  ? `Nenhum resultado corresponde à busca "${searchQuery}".` 
                  : statusFilter === 'inactive'
                  ? 'Você não possui produtos desativados no momento.'
                  : 'Nenhum produto cadastrado nesta categoria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTruffles.map((t) => {
                  const isItemActive = t.active !== false;
                  const isCurrentlyEditing = editingId === t.id;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      key={t.id}
                      className={cn(
                        "p-6 rounded-[2rem] border shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between group",
                        isCurrentlyEditing 
                          ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20"
                          : !isItemActive
                          ? "bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 opacity-80"
                          : "bg-white dark:bg-zinc-900 border-[#141414]/5 dark:border-zinc-50/10"
                      )}
                    >
                      {/* Top Header in Card */}
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors",
                            isItemActive 
                              ? "bg-[#FAF9F5] dark:bg-zinc-800 text-[#141414] dark:text-zinc-100" 
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                          )}>
                            <Package size={20} />
                          </div>
                          
                          {/* Status Badge */}
                          <div>
                            {isItemActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Ativo no PDV
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                                <Power size={10} />
                                Desativado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => startEditInModal(t)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                            title="Editar Produto (Nome, Preço, Status)"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setDeletingId(t.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                            title="Excluir Produto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Product Name & Price Details */}
                      <div className="space-y-2 mb-6">
                        <h4 className={cn(
                          "text-lg font-black tracking-tight leading-tight",
                          isItemActive ? "text-[#141414] dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400 line-through decoration-zinc-400/50"
                        )}>
                          {t.name}
                        </h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Preço:</span>
                          <span className="text-xl font-black text-[#141414] dark:text-zinc-100">
                            R$ {t.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Quick Controls: Toggle Active / Inactive & Edit Button */}
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                        {/* Quick Toggle Status */}
                        <button
                          type="button"
                          disabled={togglingId === t.id}
                          onClick={() => handleToggleActive(t)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border active:scale-95 disabled:opacity-50",
                            isItemActive 
                              ? "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100" 
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                          )}
                        >
                          <Power size={13} className={isItemActive ? "text-zinc-400" : "text-emerald-500"} />
                          <span>{isItemActive ? 'Desativar' : 'Ativar Produto'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => startEditInForm(t)}
                          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5"
                        >
                          <Edit2 size={13} />
                          Editar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Quick Edit Product (Nome, Preço, Status) */}
      <AnimatePresence>
        {modalEditItem && (
          <div className="fixed inset-0 bg-[#141414]/80 dark:bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                    <Edit2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Editar Produto</h3>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Alteração de dados e status</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalEditItem(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/60 dark:text-zinc-400 mb-1.5">
                    Nome do Produto / Sabor
                  </label>
                  <input 
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="Ex: Maracujá Cremoso"
                    className="w-full p-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/60 dark:text-zinc-400 mb-1.5">
                    Preço de Venda (R$)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={Number.isNaN(modalPrice as number) ? '' : modalPrice}
                    onChange={(e) => setModalPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full p-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/60 dark:text-zinc-400 mb-1.5">
                    Status do Produto
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalIsActive(!modalIsActive)}
                    className={cn(
                      "w-full p-3.5 rounded-xl border transition-all flex items-center justify-between text-left",
                      modalIsActive 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200" 
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold",
                        modalIsActive ? "bg-emerald-600 text-white" : "bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                      )}>
                        {modalIsActive ? <Check size={14} /> : <Power size={14} />}
                      </div>
                      <span className="font-extrabold text-xs">
                        {modalIsActive ? 'Ativo (Disponível no PDV)' : 'Desativado (Oculto)'}
                      </span>
                    </div>

                    <div className={cn(
                      "w-10 h-5 rounded-full transition-colors relative flex items-center p-0.5",
                      modalIsActive ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
                    )}>
                      <motion.div 
                        layout
                        className={cn(
                          "w-4 h-4 rounded-full bg-white shadow-sm",
                          modalIsActive ? "ml-auto" : "mr-auto"
                        )}
                      />
                    </div>
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setModalEditItem(null)}
                    className="flex-1 py-3.5 font-bold text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={modalSubmitting}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg disabled:opacity-50 transition-all"
                  >
                    {modalSubmitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Delete Confirmation */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 bg-[#141414]/80 dark:bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center border border-zinc-200 dark:border-zinc-800"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tight mb-2">Excluir Produto?</h3>
              <p className="text-[#141414]/60 dark:text-zinc-400 font-bold text-xs mb-8 leading-relaxed">
                Confirmando, este produto será removido do catálogo. Se desejar apenas ocultá-lo das vendas, você pode optar por <span className="font-extrabold text-[#141414] dark:text-zinc-100">Desativar</span> o produto.
              </p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3.5 font-bold text-xs uppercase text-[#141414]/60 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all text-xs uppercase tracking-wider"
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
