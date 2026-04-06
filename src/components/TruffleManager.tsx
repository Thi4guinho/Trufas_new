import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Search, 
  Package, 
  Trash2, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Truffle, OperationType } from '../types';
import { auth, db } from '../firebase';
import { handleFirestoreError, cn } from '../utils';

interface TruffleManagerProps {
  truffles: Truffle[];
}

export const TruffleManager: React.FC<TruffleManagerProps> = ({ truffles }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'truffles', deletingId));
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
                      onClick={() => setDeletingId(t.id)}
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
                Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-4 font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all"
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
