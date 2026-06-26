import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Search, 
  Package, 
  Trash2, 
  AlertCircle, 
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Truffle, OperationType } from '../types';
import { auth, db } from '../firebase';
import { handleFirestoreError, cn } from '../utils';

interface TruffleManagerProps {
  truffles: Truffle[];
  profile: any;
  lowStockLimit?: number;
}

export const TruffleManager: React.FC<TruffleManagerProps> = ({ 
  truffles, 
  profile,
  lowStockLimit = 5 
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [cost, setCost] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTruffles = useMemo(() => {
    return truffles.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [truffles, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price === '' || cost === '' || stock === '') return;
    setIsSubmitting(true);
    
    try {
      const data = {
        name,
        price: Number(price),
        cost: Number(cost),
        stock: Number(stock),
        ownerId: profile?.companyId || auth.currentUser!.uid
      };

      if (editingId) {
        const oldTruffle = truffles.find(t => t.id === editingId);
        const oldStock = oldTruffle ? oldTruffle.stock : 0;
        const stockDiff = Number(stock) - oldStock;

        await updateDoc(doc(db, 'truffles', editingId), data);
        
        // Log action (Security / audit trail requirement 10)
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Alterou produto: ${name}`,
          details: `Preço: R$ ${Number(price).toFixed(2)} | Custo: R$ ${Number(cost).toFixed(2)} | Estoque: ${stock}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });

        if (stockDiff > 0) {
          await addDoc(collection(db, 'cashflow'), {
            type: 'expense',
            value: stockDiff * Number(cost),
            category: 'Compra de Produto',
            date: Timestamp.now(),
            description: `Aumento de estoque (${stockDiff} un) - ${name}`,
            responsible: profile?.displayName || auth.currentUser?.email || 'Sistema',
            ownerId: profile?.companyId || auth.currentUser!.uid,
            isSystem: true
          });
        }
      } else {
        await addDoc(collection(db, 'truffles'), data);

        // Log action
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Criou produto: ${name}`,
          details: `Preço definido: R$ ${Number(price).toFixed(2)} | Custo fábrica: R$ ${Number(cost).toFixed(2)} | Estoque: ${stock}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });

        if (Number(stock) > 0) {
          await addDoc(collection(db, 'cashflow'), {
            type: 'expense',
            value: Number(stock) * Number(cost),
            category: 'Compra de Produto',
            date: Timestamp.now(),
            description: `Estoque inicial (${stock} un) - ${name}`,
            responsible: profile?.displayName || auth.currentUser?.email || 'Sistema',
            ownerId: profile?.companyId || auth.currentUser!.uid,
            isSystem: true
          });
        }
      }

      setName('');
      setPrice('');
      setCost('');
      setStock('');
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'truffles');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const itemToDelete = truffles.find(t => t.id === deletingId);
    try {
      await deleteDoc(doc(db, 'truffles', deletingId));
      
      // Log action
      if (itemToDelete) {
        await addDoc(collection(db, 'audit_logs'), {
          userId: auth.currentUser!.uid,
          userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
          action: `Excluiu produto: ${itemToDelete.name}`,
          details: `Preço anterior: R$ ${itemToDelete.price.toFixed(2)} | Quantidade em estoque: ${itemToDelete.stock}`,
          date: Timestamp.now(),
          ownerId: profile?.companyId || auth.currentUser!.uid
        });
      }
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `truffles/${deletingId}`);
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
                {editingId ? 'Editar Produto' : 'Nova Produto'}
              </h3>
              <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
                {editingId ? 'Atualize os dados e margens' : 'Cadastre sabor e margens'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Sabor da Produto</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maracujá Cremoso"
                className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all text-sm"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Custo Unit. (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Preço Unit. (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Estoque Inicial (Un.)</label>
              <input 
                type="number"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 transition-all text-sm"
                required
              />
            </div>

            {/* Live margin previews */}
            {price !== '' && cost !== '' && (
              <div className="p-4 bg-green-50/60 rounded-2xl border border-green-600/10 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-green-700/60 uppercase text-[9px] tracking-wider">Lucro Estimado</span>
                  <span className="font-extrabold text-green-800">R$ {Math.max(0, Number(price) - Number(cost)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-green-700/60 uppercase text-[9px] tracking-wider">Margem Percentual</span>
                  <span className="font-extrabold text-green-800">
                    {Number(price) > 0 ? (((Number(price) - Number(cost)) / Number(price)) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button 
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg disabled:opacity-50",
                  editingId ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#141414] text-white hover:bg-[#141414]/90"
                )}
              >
                {isSubmitting ? 'Processando...' : editingId ? 'Atualizar Produto' : 'Cadastrar Produto'}
              </button>
              
              {editingId && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setCost('');
                    setName('');
                    setPrice('');
                    setStock('');
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

      {/* List Section */}
      <div className="xl:col-span-8 space-y-6">
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
            {filteredTruffles.map((t, i) => {
              const profit = t.price - (t.cost || 0);
              const marginPercent = t.price > 0 ? (profit / t.price) * 100 : 0;
              const isLowStock = t.stock <= lowStockLimit;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  key={t.id} 
                  className={cn(
                    "bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
                    isLowStock ? "border-red-600/10 bg-red-50/10" : "border-[#141414]/5"
                  )}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isLowStock 
                        ? "bg-red-50 text-red-600" 
                        : "bg-[#F5F5F4] text-[#141414] group-hover:bg-[#141414] group-hover:text-white"
                    )}>
                      <Package size={22} />
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          setEditingId(t.id);
                          setName(t.name);
                          setPrice(t.price);
                          setCost(t.cost || 0);
                          setStock(t.stock);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeletingId(t.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mb-5">
                    <h4 className="text-lg font-black tracking-tighter italic text-[#141414] leading-tight flex items-center gap-1.5">
                      {t.name}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-[#141414]">Venda: R$ {t.price.toFixed(2)}</span>
                      <span className="text-[#141414]/15">•</span>
                      <span className="text-[10px] font-bold text-[#141414]/50">Custo: R$ {(t.cost || 0).toFixed(2)}</span>
                      <span className="text-[#141414]/15">•</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                        isLowStock ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                      )}>
                        {t.stock} Un.
                      </span>
                    </div>
                  </div>

                  {/* Profit breakdown info banner */}
                  <div className="grid grid-cols-2 gap-2 bg-[#F5F5F4]/60 p-3 rounded-xl border border-[#141414]/5 mb-5 text-[10px] font-bold text-[#141414]/50 text-center">
                    <div>
                      <p className="uppercase text-[8px] tracking-wider text-[#141414]/40">Lucro Unit.</p>
                      <p className="text-green-600 font-extrabold text-xs mt-0.5">R$ {profit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="uppercase text-[8px] tracking-wider text-[#141414]/40">Margem</p>
                      <p className="text-blue-600 font-extrabold text-xs mt-0.5">{marginPercent.toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#141414]/5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-[#141414]/40">
                    <span>Alertas / Status</span>
                    {t.stock <= 0 ? (
                      <span className="flex items-center gap-1 text-red-600 font-extrabold">
                        <AlertCircle size={10} /> ESGOTADO
                      </span>
                    ) : isLowStock ? (
                      <span className="flex items-center gap-1 text-red-500 font-extrabold">
                        <AlertCircle size={10} /> BAIXO ESTOQUE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 font-extrabold">
                        <CheckCircle2 size={10} /> OPERANDO OK
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

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
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Excluir Produto?</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">
                Confirmando, este produto será removido permanentemente de seu cardápio comercial.
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
