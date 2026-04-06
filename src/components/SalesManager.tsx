import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  FileText, 
  AlertCircle 
} from 'lucide-react';
import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { Truffle, UserSettings, Sale, OperationType } from '../types';
import { auth, db } from '../firebase';
import { normalizeName, downloadReceiptPDF, handleFirestoreError } from '../utils';

interface SalesManagerProps {
  truffles: Truffle[];
  settings: UserSettings | null;
}

export const SalesManager: React.FC<SalesManagerProps> = ({ truffles, settings }) => {
  const [selectedTruffleId, setSelectedTruffleId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState<string | null>(null);
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

    return Math.max(0, (unitPrice * quantity) - manualDiscount);
  }, [selectedTruffle, quantity, manualDiscount, settings]);

  const handleSale = async () => {
    if (!selectedTruffle || quantity <= 0) return;
    if (selectedTruffle.stock < quantity) {
      setShowErrorModal('Estoque insuficiente para esta venda!');
      return;
    }

    setLoading(true);
    try {
      const saleData: Omit<Sale, 'id'> = {
        truffleId: selectedTruffle.id,
        truffleName: selectedTruffle.name,
        quantity,
        totalPrice: calculatedPrice,
        paidAmount: isCredit ? 0 : calculatedPrice,
        discount: manualDiscount,
        isCredit,
        customerName: isCredit ? normalizeName(customerName) : '',
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {showErrorModal && (
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
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Atenção</h3>
              <p className="text-[#141414]/40 font-bold text-xs mb-8">{showErrorModal}</p>
              <button 
                onClick={() => setShowErrorModal(null)}
                className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#141414]/90 transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
