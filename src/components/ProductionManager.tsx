import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { addDoc, collection, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ProductionBatch, Product, OperationType } from '../types';
import { db } from '../firebase';
import { handleFirestoreError, cn } from '../utils';

interface ProductionManagerProps {
  batches: ProductionBatch[];
  products: Product[];
  profile: any;
}

export const ProductionManager: React.FC<ProductionManagerProps> = ({ 
  batches, 
  products,
  profile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // New Batch State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedProductId('');
    setQuantity('');
    setTotalCost('');
    setIsAdding(false);
    setError(null);
  };

  const handleStartProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.companyId || !selectedProductId) return;

    const qty = parseFloat(quantity);
    const cost = parseFloat(totalCost);

    if (isNaN(qty) || qty <= 0) {
      setError('Quantidade inválida.');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setError('Custo total inválido.');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) {
      setError('Produto não encontrado.');
      setLoading(false);
      return;
    }

    const unitCost = cost / qty;
    const batchData: Omit<ProductionBatch, 'id'> = {
      batchNumber: `LOTE-${Date.now().toString().slice(-6)}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      date: Timestamp.now(),
      responsible: profile.displayName || profile.name || 'Usuário',
      ownerId: profile.companyId,
      compositionUsed: [],
      expectedYield: qty,
      actualYield: qty,
      discarded: 0,
      lost: 0,
      status: 'completed',
      totalCost: cost,
      unitCost,
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now()
    };

    try {
      // 1. Add to production_batches
      const batchRef = await addDoc(collection(db, 'production_batches'), batchData);
      
      // 2. Add to stock_batches for FIFO
      await addDoc(collection(db, 'stock_batches'), {
        itemId: selectedProduct.id,
        itemType: 'product',
        batchId: batchRef.id,
        quantity: qty,
        remainingQuantity: qty,
        unitCost,
        date: Timestamp.now(),
        ownerId: profile.companyId
      });

      // 3. Update Product Stock
      await updateDoc(doc(db, 'truffles', selectedProduct.id), {
        stock: (selectedProduct.stock || 0) + qty
      });

      resetForm();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao registrar o lote. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = useMemo(() => {
    return batches.filter(b => 
      b.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [batches, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gerenciador de Lotes</h2>
          <p className="text-slate-500">Registre novos lotes e seus custos totais</p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Registrar Lote
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por lote ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Lote / Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rendimento
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Custo / Un.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBatches.map(batch => (
                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{batch.batchNumber}</span>
                      <span className="text-xs text-slate-500">
                        {batch.date.toDate().toLocaleDateString('pt-BR')} {batch.date.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-slate-800">{batch.productName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-slate-700">{batch.actualYield} un</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">R$ {batch.unitCost.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400">Total: R$ {batch.totalCost.toFixed(2)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum lote encontrado</p>
                    <p className="text-slate-400 text-sm mt-1">
                      {searchTerm ? 'Tente buscar com outros termos' : 'Registre o primeiro lote para começar'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 shrink-0">
                <h3 className="text-xl font-bold text-slate-800">Registrar Novo Lote</h3>
                <p className="text-sm text-slate-500 mt-1">Informe a quantidade e o investimento total</p>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Produto
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Selecione o produto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Rendimento (Un.)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={Number.isNaN(parseFloat(quantity)) ? '' : quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Custo Total (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={Number.isNaN(parseFloat(totalCost)) ? '' : totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartProduction}
                  disabled={loading || !selectedProductId || !quantity || !totalCost}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Registrando...' : 'Registrar Lote'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
