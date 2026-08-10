import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {  
  CheckCircle2, 
  FileText, 
  AlertCircle,
  Plus,
  Trash2,
  Mic,
  ShoppingBag,
  Info,
  DollarSign,
  User,
  X,
  CreditCard,
  MessageSquare
, ChevronDown } from 'lucide-react';
import { Timestamp, addDoc, collection, doc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Truffle, UserSettings, Sale, SaleItem, OperationType, Customer } from '../types';
import { auth, db } from '../firebase';
import { normalizeName, downloadReceiptPDF, handleFirestoreError, cn } from '../utils';

interface SalesManagerProps {
  truffles: Truffle[];
  customers: Customer[];
  sales: Sale[];
  settings: UserSettings | null;
  profile: any;
  editingSale?: Sale | null;
  onCancelEdit?: () => void;
}

export const SalesManager: React.FC<SalesManagerProps> = ({ 
  truffles, 
  customers,
  sales,
  settings, 
  profile,
  editingSale,
  onCancelEdit
}) => {

  // Voice Order State
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [voiceOrderData, setVoiceOrderData] = useState<any>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [voiceError, setVoiceError] = useState("");

  // Shopping Cart state
  const [basket, setBasket] = useState<Omit<SaleItem, 'costPerUnit'>[]>([]);
  
  // Quick adding state
  const [selectedTruffleId, setSelectedTruffleId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  
  // Customer identity - Now mandatory as requested!
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Commercial details
  const [manualDiscount, setManualDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'fiado'>('dinheiro');

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Quick register modal state
  const [showQuickRegModal, setShowQuickRegModal] = useState(false);
  const [quickRegName, setQuickRegName] = useState('');
  const [quickRegPhone, setQuickRegPhone] = useState('');
  const [quickRegDesc, setQuickRegDesc] = useState('');

  // Sync details from edits if specified
  React.useEffect(() => {
    if (editingSale) {
      setCustomerName(editingSale.customerName);
      setManualDiscount(editingSale.discount);
      setPaymentMethod(editingSale.paymentMethod || 'dinheiro');
      setSelectedCustomerId(editingSale.customerId || '');
      
      const items = editingSale.items || [
        {
          truffleId: editingSale.truffleId || '',
          truffleName: editingSale.truffleName || 'Produto (Legado)',
          quantity: editingSale.quantity,
          pricePerUnit: (editingSale.totalPrice + editingSale.discount) / editingSale.quantity
        }
      ];
      setBasket(items);
    }
  }, [editingSale]);

  const availableTruffles = useMemo(() => {
    return truffles.filter(t => t.active !== false);
  }, [truffles]);

  const activeTruffle = truffles.find(t => t.id === selectedTruffleId);

  // Progressive Pricing calculations based on total units selected in basket
  const totalBasketUnits = useMemo(() => {
    return basket.reduce((acc, item) => acc + item.quantity, 0);
  }, [basket]);

  // Determine current unit price dynamically based on progressive pricing constraints
  const getDynamicUnitPrice = (truffle: Truffle, totalQty: number): number => {
    let unitPrice = truffle.price;
    if (settings?.progressivePricing && settings.progressivePricing.length > 0) {
      const sortedRules = [...settings.progressivePricing].sort((a, b) => b.minQty - a.minQty);
      const rule = sortedRules.find(r => totalQty >= r.minQty);
      if (rule) {
        unitPrice = rule.price;
      }
    }
    return unitPrice;
  };

  // Recalculates whole basket dynamically whenever quantities or rules shift
  const basketWithPricing = useMemo(() => {
    return basket.map(item => {
      const dbTruffle = truffles.find(t => t.id === item.truffleId);
      const basePrice = dbTruffle ? getDynamicUnitPrice(dbTruffle, totalBasketUnits) : item.pricePerUnit;
      return {
        ...item,
        pricePerUnit: basePrice
      };
    });
  }, [basket, totalBasketUnits, truffles, settings]);

  const basketSubtotal = useMemo(() => {
    return basketWithPricing.reduce((acc, item) => acc + (item.pricePerUnit * item.quantity), 0);
  }, [basketWithPricing]);

  const finalTotalPrice = useMemo(() => {
    return Math.max(0, basketSubtotal - manualDiscount);
  }, [basketSubtotal, manualDiscount]);

  // Handle adding an item to the basket
  
  const startListening = () => {
    setVoiceError("");
    setVoiceText("");
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceError("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setVoiceText(finalTranscript);
      if (recognitionRef.current) {
        recognitionRef.current.transcriptText = finalTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setVoiceError("Erro ao ouvir. Tente novamente.");
    };

    recognition.onend = () => {
      setIsListening(false);
      const textToProcess = recognitionRef.current?.transcriptText;
      if (textToProcess && textToProcess.trim() !== '') {
        processVoiceOrder(textToProcess);
        recognitionRef.current.transcriptText = ''; // Clear after processing
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.transcriptText = voiceText;
      recognitionRef.current.stop();
    }
  };

  const processVoiceOrder = async (text: string) => {
    if (!text || text.trim() === '') return;
    setVoiceProcessing(true);
    setVoiceError("");
    try {
      const availableProducts = availableTruffles.map(t => t.name);
      const res = await fetch('/api/gemini/voice-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, availableProducts })
      });
      if (!res.ok) {
        throw new Error("Erro na API.");
      }
      const data = await res.json();
      setVoiceOrderData(data);
      setShowVoiceConfirm(true);
    } catch (err: any) {
      setVoiceError("Falha ao processar texto com IA.");
    } finally {
      setVoiceProcessing(false);
    }
  };

  const populateVoiceFields = () => {
    if (!voiceOrderData) return;
    setCustomerName(voiceOrderData.cliente || "Desconhecido");
    const payment = voiceOrderData.pagamento ? voiceOrderData.pagamento.toLowerCase() : null;
    if (payment) {
      if (payment.includes('pix')) setPaymentMethod('pix');
      else if (payment.includes('dinheiro')) setPaymentMethod('dinheiro');
      else if (payment.includes('crédito') || payment.includes('credito')) setPaymentMethod('credito');
      else if (payment.includes('débito') || payment.includes('debito') || payment.includes('cartão') || payment.includes('cartao')) setPaymentMethod('debito');
    }
    const newBasket = [];
    if (voiceOrderData.itens && Array.isArray(voiceOrderData.itens)) {
      voiceOrderData.itens.forEach((aiItem) => {
        const matchingTruffle = truffles.find(t => t.name.toLowerCase() === aiItem.produto.toLowerCase() || t.name.toLowerCase().includes(aiItem.produto.toLowerCase()));
        if (matchingTruffle) {
          newBasket.push({
            truffleId: matchingTruffle.id,
            truffleName: matchingTruffle.name,
            quantity: Number(aiItem.quantidade) || 1,
            pricePerUnit: matchingTruffle.price
          });
        }
      });
    }
    setBasket(newBasket);
  };

  const handleVoiceEdit = () => {
    populateVoiceFields();
    setShowVoiceConfirm(false);
  };

  const handleVoiceCancel = () => {
    setShowVoiceConfirm(false);
    setVoiceText("");
    setVoiceOrderData(null);
  };

  const confirmVoiceOrder = async () => {
    populateVoiceFields();
    setShowVoiceConfirm(false);
    // Needs a small delay to let state update before submit
    setTimeout(() => {
      const btn = document.getElementById("checkout-btn");
      if (btn) btn.click();
    }, 100);
  };


  const handleAddToBasket = () => {
    const qty = Number(quantity) || 0;
    if (!selectedTruffleId || qty <= 0) return;
    if (!activeTruffle) return;

    // Check inventory overflow check (Sum quantity if already in basket)
    const existingInBasket = basket.find(item => item.truffleId === selectedTruffleId);
    const existingQty = existingInBasket ? existingInBasket.quantity : 0;
    const totalRequestedQty = existingQty + qty;

    if (existingInBasket) {
      // Update quantity
      setBasket(basket.map(item => 
        item.truffleId === selectedTruffleId 
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      // Add new
      setBasket([...basket, {
        truffleId: activeTruffle.id,
        truffleName: activeTruffle.name,
        quantity: qty,
        pricePerUnit: activeTruffle.price
      }]);
    }

    // Reset selectors
    setSelectedTruffleId('');
    setQuantity(1);
  };

  const handleRemoveFromBasket = (truffleId: string) => {
    setBasket(basket.filter(item => item.truffleId !== truffleId));
  };

  const syncCustomerSelection = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerName('');
    } else {
      const selected = customers.find(c => c.id === customerId);
      if (selected) setCustomerName(selected.name);
    }
  };

  const handleQuickRegisterCustomer = () => {
    if (!customerName.trim()) {
      setShowErrorModal('Digite o nome do cliente antes de registrar.');
      return;
    }
    const formattedName = normalizeName(customerName);
    
    // Check if exists
    const exists = customers.some(c => normalizeName(c.name) === formattedName);
    if (exists) {
      setShowErrorModal('Cliente já existe com este nome!');
      return;
    }

    setQuickRegName(customerName);
    setQuickRegPhone('');
    setQuickRegDesc('');
    setShowQuickRegModal(true);
  };

  const confirmQuickRegisterCustomer = async () => {
    if (!quickRegName.trim()) {
      setShowErrorModal('Nome do cliente é obrigatório.');
      return;
    }
    
    const formattedName = normalizeName(quickRegName);
    const exists = customers.some(c => normalizeName(c.name) === formattedName);
    if (exists) {
      setShowErrorModal('Cliente já existe com este nome!');
      return;
    }

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        name: formattedName,
        phone: quickRegPhone.trim(),
        description: quickRegDesc.trim() || 'Registrado rapidamente no momento da venda',
        ownerId: profile?.companyId || auth.currentUser!.uid,
        createdAt: Timestamp.now()
      });
      setSelectedCustomerId(docRef.id);
      setCustomerName(formattedName);
      
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: `Criou cadastro rápido de cliente: ${formattedName}`,
        details: `Criado durante registro de venda`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });
      setShowQuickRegModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    } finally {
      setLoading(false);
    }
  };

  // Final confirmation of the sale pipeline
  const handleCheckout = async () => {
    if (basketWithPricing.length === 0) {
      setShowErrorModal('Sua sacola de produtos está vazia!');
      return;
    }

    if (!customerName.trim()) {
      setShowErrorModal('O Nome do Cliente é obrigatório!');
      return;
    }

    if (paymentMethod === 'fiado' && !selectedCustomerId) {
      setShowErrorModal('É proibido vender fiado para clientes não registrados. Por favor, selecione um cliente registrado ou adicione-o primeiro.');
      return;
    }

    setLoading(true);
    try {
      const maxNum = sales.reduce((max, s) => {
        if (s.saleNumber && s.saleNumber.startsWith('NF ')) {
          const match = s.saleNumber.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            return isNaN(num) ? max : Math.max(max, num);
          }
        }
        return max;
      }, 0);
      const uniqueSaleNum = `NF ${String(maxNum + 1).padStart(4, '0')}`;
      const normalizedCName = normalizeName(customerName);

      // Map basket items with manufacturing cost per unit
      const finalItemsList: SaleItem[] = basketWithPricing.map(item => {
        const matchingTruffle = truffles.find(t => t.id === item.truffleId);
        return {
          truffleId: item.truffleId,
          truffleName: item.truffleName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          costPerUnit: matchingTruffle ? (matchingTruffle.cost || 0) : 0
        };
      });

      const totalQty = finalItemsList.reduce((acc, item) => acc + item.quantity, 0);

      const paymentStatusValue = paymentMethod === 'fiado' ? 'pending' : 'paid';

      const saleData: Omit<Sale, 'id'> = {
        saleNumber: editingSale ? editingSale.saleNumber : uniqueSaleNum,
        items: finalItemsList,
        quantity: totalQty,
        totalPrice: finalTotalPrice,
        discount: manualDiscount,
        paidAmount: paymentStatusValue === 'paid' ? finalTotalPrice : 0,
        isCredit: paymentMethod === 'fiado',
        customerName: normalizedCName,
        date: editingSale ? editingSale.date : Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid,
        sellerName: profile?.displayName || profile?.email || auth.currentUser?.email || 'Vendedor',
        status: 'finished',
        paymentStatus: paymentStatusValue,
        paymentMethod
      };

      if (selectedCustomerId) {
        saleData.customerId = selectedCustomerId;
      }

      let actionText = '';
      if (editingSale) {
        // Edit flow
        await updateDoc(doc(db, 'sales', editingSale.id), saleData);
        actionText = `Editou a venda #${editingSale.saleNumber} para ${normalizedCName}`;
      } else {
        // Regular Create flow
        const docRef = await addDoc(collection(db, 'sales'), saleData);
        actionText = `Registrou venda #${uniqueSaleNum} para ${normalizedCName}`;

        setLastSale({ id: docRef.id, ...saleData } as Sale);
      }

      // Safe add Audit Log (Section 10)
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: actionText,
        details: `Total: R$ ${finalTotalPrice.toFixed(2)} | Mét. Pagamento: ${paymentMethod}`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });

      // Show Success popup
      setShowSuccessModal(true);

      // Reset Form fields
      setBasket([]);
      setCustomerName('');
      setSelectedCustomerId('');
      setManualDiscount(0);
      setPaymentMethod('dinheiro');

      if (editingSale && onCancelEdit) {
        onCancelEdit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 font-sans">
      {/* LEFT: Item Selection and basket forming */}
      <div className="md:col-span-7 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tighter italic">
              {editingSale ? `Editando Venda #${editingSale.saleNumber}` : 'Nova Sacola de Vendas'}
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 font-bold leading-none mt-1">Insira e monte o pedido</p>
          </div>
        </div>

        
        {/* Voice Ordering UI */}
        <div className="bg-[#141414]/5 dark:bg-zinc-50/5 rounded-2xl p-4 border border-[#141414]/10 dark:border-zinc-50/20">
          {!isListening ? (
            <button
              onClick={startListening}
              disabled={voiceProcessing}
              className="w-full bg-[#141414] dark:bg-zinc-100 hover:bg-black dark:hover:bg-zinc-300 text-white dark:text-zinc-900 font-black text-xs uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {voiceProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processando Voz...
                </>
              ) : (
                <>
                  <Mic size={16} />
                  Registrar por Voz
                </>
              )}
            </button>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold animate-pulse text-[#141414] dark:text-zinc-100">Ouvindo... Fale o pedido</span>
              </div>
              <p className="text-xs text-[#141414]/50 dark:text-zinc-400 mb-4 min-h-[1.5rem] italic">{voiceText}</p>
              <button
                onClick={stopListening}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-black text-xs uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <X size={16} /> Parar e Processar
              </button>
            </div>
          )}
          {voiceError && <p className="text-red-500 text-[10px] font-bold mt-2 text-center">{voiceError}</p>}
        </div>

        {/* Voice Confirmation Modal */}
        <AnimatePresence>
          {showVoiceConfirm && voiceOrderData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8 overflow-hidden border border-white/20"
              >
                <h3 className="text-xl font-black tracking-tighter italic mb-4">Confirmação de Voz</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Cliente</span>
                    <span className="text-sm font-bold text-gray-900">{voiceOrderData.cliente || 'Desconhecido'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Pagamento</span>
                    <span className="text-sm font-bold text-gray-900">{voiceOrderData.pagamento || 'Pendente'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <span className="text-xs font-bold text-gray-500 block mb-2">Itens Reconhecidos</span>
                    <div className="space-y-2">
                      {voiceOrderData.itens && voiceOrderData.itens.length > 0 ? (
                        <>
                          {voiceOrderData.itens.map((i: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm font-bold">
                              <span>{i.produto}</span>
                              <span>{i.quantidade} un.</span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-black">
                            <span>Total</span>
                            <span>{voiceOrderData.itens.reduce((acc: number, curr: any) => acc + (Number(curr.quantidade) || 0), 0)} doces</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-red-500 font-bold">Nenhum item reconhecido.</p>
                      )}
                    </div>
                  </div>
                  {(!voiceOrderData.itens || voiceOrderData.itens.length === 0) && (
                    <p className="text-xs text-orange-600 font-bold bg-orange-50 p-2 rounded-lg mt-2">
                      <AlertCircle size={12} className="inline mr-1" />
                      Não consegui identificar todos os itens. Revise antes de confirmar.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleVoiceCancel}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleVoiceEdit}
                    className="w-full bg-[#141414]/5 dark:bg-zinc-50/5 text-[#141414] dark:text-zinc-100 hover:bg-[#141414]/10 dark:bg-zinc-50/10 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={confirmVoiceOrder}
                    className="w-full bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-black dark:hover:bg-zinc-300 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Truffle Quick Select Form */}
        <div className="bg-[#FAF9F5] dark:bg-zinc-800 p-5 rounded-2xl border border-[#141414]/5 dark:border-zinc-50/10 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full relative">
            <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5">Escolher Sabor</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full p-3.5 bg-white dark:bg-zinc-900 rounded-xl font-bold border-none text-xs flex justify-between items-center text-[#141414] dark:text-zinc-100 ring-1 ring-transparent focus:ring-[#141414]/10 dark:focus:ring-zinc-50/10 transition-all text-left"
              >
                <span className={!selectedTruffleId ? "opacity-50" : ""}>
                  {selectedTruffleId ? (() => {
                     const t = truffles.find(t => t.id === selectedTruffleId);
                     return t ? `${t.name} (R${t.price.toFixed(2)})` : "Selecione o Produto...";
                  })() : "Selecione o Produto..."}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-[#141414]/10 dark:border-zinc-50/10 z-50 max-h-60 overflow-y-auto"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTruffleId('');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left p-3.5 text-xs font-bold transition-colors hover:bg-[#141414]/5 dark:hover:bg-zinc-800 cursor-pointer text-[#141414]/50 dark:text-zinc-500"
                      >
                        Selecione o Produto...
                      </button>
                      {availableTruffles.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-400 font-bold">
                          Nenhum produto ativo cadastrado.
                        </div>
                      ) : (
                        availableTruffles.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTruffleId(t.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left p-3.5 text-xs font-bold transition-colors hover:bg-[#141414]/5 dark:hover:bg-zinc-800 cursor-pointer ${
                              selectedTruffleId === t.id ? "bg-[#141414]/5 dark:bg-zinc-800" : ""
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[#141414] dark:text-zinc-100">{t.name}</span>
                              <span className="text-[#141414]/50 dark:text-zinc-400">R${t.price.toFixed(2)}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="w-full sm:w-24 shrink-0">
            <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5">Unidades</label>
            <input 
              type="number"
              min={1}
              value={Number.isNaN(quantity as number) ? '' : quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="w-full p-3.5 bg-white dark:bg-zinc-900 rounded-xl font-bold border-none text-xs text-center focus:ring-1 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
            />
          </div>

          <button
            type="button"
            onClick={handleAddToBasket}
            className="w-full sm:w-auto px-5 py-3.5 bg-[#141414] dark:bg-zinc-100 hover:bg-[#141414]/85 text-white dark:text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all h-[46px] flex items-center justify-center gap-1 shrink-0"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {/* Current Basket Render */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400">Itens Adicionados ({basketWithPricing.length})</h4>
          
          <div className="divide-y divide-[#141414]/5 max-h-[290px] overflow-y-auto pr-2">
            {basketWithPricing.map((item) => (
              <div key={item.truffleId} className="py-3 flex justify-between items-center gap-4">
                <div>
                  <h5 className="font-extrabold text-sm text-[#141414] dark:text-zinc-100 leading-tight italic">{item.truffleName}</h5>
                  <span className="text-[10px] font-bold text-[#141414]/40 dark:text-zinc-400">
                    {item.quantity} un. x R$ {item.pricePerUnit.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-sm text-[#141414] dark:text-zinc-100">R$ {(item.quantity * item.pricePerUnit).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromBasket(item.truffleId)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

            {basketWithPricing.length === 0 && (
              <div className="text-center py-16 opacity-35">
                <ShoppingBag size={40} className="mx-auto mb-2 text-[#141414]/60 dark:text-zinc-300" />
                <p className="text-xs font-black uppercase tracking-wider">A sacola de produtos está vazia</p>
                <p className="text-[10px] font-medium text-[#141414]/50 dark:text-zinc-400 mt-1 max-w-[200px] mx-auto">Adicione produtos e quantidades acima.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Customer details & Payment checkout forms */}
      <div className="md:col-span-5 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-[#141414]/5 dark:border-zinc-50/10 shadow-sm space-y-6 relative">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black italic tracking-tight">Finalização da Compra</h3>
          {totalBasketUnits > 0 && (
            <span className="bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black px-2.5 py-1 rounded-full">{totalBasketUnits} PRODUTOS</span>
          )}
        </div>

        {/* Customer Identity Selection Block */}
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
              <span>Cliente (Obrigatorio)</span>
              <span className="text-[8px] text-red-600 font-extrabold font-mono">CRÍTICO</span>
            </label>
            
            <div className="relative flex gap-2">
              <div className="relative flex-1" ref={suggestionRef}>
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#141414]/30 dark:text-zinc-500" size={15} />
                <input 
                  placeholder="Nome do Cliente (Escreva aqui)"
                  value={customerName}
                  required
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerName(val);
                    setShowSuggestions(true);
                    const matched = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                    if (matched) setSelectedCustomerId(matched.id);
                    else setSelectedCustomerId('');
                  }}
                  className={`w-full pl-10 pr-4 py-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none text-xs focus:ring-1 focus:ring-[#141414]/10 dark:ring-zinc-50/10 transition-all ${
                    customerName.toLowerCase() === 'desconhecido' ? 'text-red-600' : 'text-[#141414] dark:text-zinc-100'
                  }`}
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-zinc-900 border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {(!customerName || 'desconhecido'.includes(customerName.toLowerCase())) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName('Desconhecido');
                          setSelectedCustomerId('');
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#F5F5F4] dark:bg-zinc-800 transition-colors text-xs font-bold border-b border-gray-50 text-red-600"
                      >
                        Desconhecido <span className="text-red-400 font-medium ml-1">(Consumidor Final)</span>
                      </button>
                    )}
                    {customers
                      .filter(c => customerName ? c.name.toLowerCase().includes(customerName.toLowerCase()) : true)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerName(c.name);
                            setSelectedCustomerId(c.id);
                            setShowSuggestions(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-[#F5F5F4] dark:bg-zinc-800 transition-colors text-xs font-bold border-b border-gray-50 last:border-b-0 ${
                            c.name.toLowerCase() === 'desconhecido' ? 'text-red-600' : 'text-[#141414] dark:text-zinc-100'
                          }`}
                        >
                          {c.name} {c.phone ? <span className={`${c.name.toLowerCase() === 'desconhecido' ? 'text-red-400' : 'text-[#141414]/40 dark:text-zinc-400'} font-medium ml-1`}>({c.phone})</span> : ''}
                        </button>
                      ))}
                    {customers.filter(c => customerName ? c.name.toLowerCase().includes(customerName.toLowerCase()) : true).length === 0 && !(!customerName || 'desconhecido'.includes(customerName.toLowerCase())) && (
                      <div className="px-4 py-3 text-xs font-medium text-[#141414]/50 dark:text-zinc-400">
                        Nenhum cliente encontrado. Digite para registrar um novo.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {!selectedCustomerId && customerName.trim() && (
                <button
                  type="button"
                  onClick={handleQuickRegisterCustomer}
                  className="px-4 bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl hover:bg-[#141414]/90 transition-colors whitespace-nowrap"
                >
                  Cadastrar Cliente
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
                    <div className="relative">
            <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5">Forma de Pagamento</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                className="w-full p-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none text-xs flex justify-between items-center text-[#141414] dark:text-zinc-100 ring-1 ring-transparent focus:ring-[#141414]/10 dark:focus:ring-zinc-50/10 transition-all text-left"
              >
                <span>
                  {paymentMethod === 'dinheiro' && 'Dinheiro'}
                  {paymentMethod === 'pix' && 'Pix'}
                  {paymentMethod === 'cartao_debito' && 'Cartão de Débito'}
                  {paymentMethod === 'cartao_credito' && 'Cartão de Crédito'}
                  {paymentMethod === 'fiado' && 'Fiado (Registrar Pendente)'}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isPaymentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isPaymentDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsPaymentDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-[#141414]/10 dark:border-zinc-50/10 z-50 max-h-60 overflow-y-auto"
                    >
                      {[
                        { id: 'dinheiro', label: 'Dinheiro' },
                        { id: 'pix', label: 'Pix' },
                        { id: 'cartao_debito', label: 'Cartão de Débito' },
                        { id: 'cartao_credito', label: 'Cartão de Crédito' },
                        { id: 'fiado', label: 'Fiado (Registrar Pendente)' }
                      ].map(option => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(option.id as any);
                            setIsPaymentDropdownOpen(false);
                          }}
                          className={`w-full text-left p-3.5 text-xs font-bold transition-colors hover:bg-[#141414]/5 dark:hover:bg-zinc-800 cursor-pointer ${
                            paymentMethod === option.id ? "bg-[#141414]/5 dark:bg-zinc-800 text-[#141414] dark:text-zinc-100" : "text-[#141414] dark:text-zinc-100"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Manual Discount field */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5">Desconto (R$)</label>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={manualDiscount}
                onChange={(e) => setManualDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full p-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none text-xs focus:ring-1 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
              />
            </div>
          </div>
        </div>

        {/* Pricing card details summaries */}
        <div className="p-5 bg-[#141414] dark:bg-zinc-100 rounded-2xl text-white dark:text-zinc-900 space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Subtotal</span>
            <span className="text-sm font-bold opacity-80">R$ {basketSubtotal.toFixed(2)}</span>
          </div>
          {manualDiscount > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Desconto manual</span>
              <span className="text-sm font-bold text-red-400">- R$ {manualDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-white/10 flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Total a Pagar</span>
            <span className="text-2xl font-black tracking-tight text-green-400">R$ {finalTotalPrice.toFixed(2)}</span>
          </div>

          {settings?.progressivePricing && totalBasketUnits > 0 && (
            <p className="text-[8px] opacity-40 font-semibold leading-none pt-1">
              * Preço unitário ajustado de acordo com a tabela progressiva.
            </p>
          )}
        </div>

        {/* Submission Trigger */}
        <div className="space-y-2 pt-2">
          <button
            id="checkout-btn" onClick={handleCheckout}
            disabled={loading || basketWithPricing.length === 0}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-40"
          >
            {loading ? 'Processando transação...' : editingSale ? 'Atualizar Pedido de Venda' : 'Finalizar Venda'}
          </button>

          {editingSale && onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="w-full py-2.5 border border-[#141414]/10 dark:border-zinc-50/20 rounded-xl font-black text-[10px] uppercase tracking-widest text-[#141414]/50 dark:text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              Cancelar Edição
            </button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-[#141414]/80 dark:bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center border border-[#141414]/10 dark:border-zinc-50/20"
            >
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-100">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Venda Registrada!</h3>
              <p className="text-[#141414]/40 dark:text-zinc-400 font-bold text-xs mb-8">
                O pedido foi contabilizado com sucesso.
              </p>
              
              <div className="space-y-2">
                {lastSale && (
                  <button 
                    onClick={() => downloadReceiptPDF(lastSale, settings)}
                    className="w-full bg-[#141414] dark:bg-zinc-100 hover:bg-[#141414]/90 text-white dark:text-zinc-900 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md"
                  >
                    <FileText size={16} /> Emitir Danfe (PDF)
                  </button>
                )}
                
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-2 font-black text-xs uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 hover:text-[#141414] dark:hover:text-zinc-100 transition-colors"
                >
                  Fechar janela
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Alert Modal */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 bg-[#141414]/80 dark:bg-zinc-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tighter italic mb-2">Inconsistência</h3>
              <p className="text-[#141414]/50 dark:text-zinc-400 font-semibold text-xs mb-8 leading-relaxed">
                {showErrorModal}
              </p>
              <button 
                onClick={() => setShowErrorModal(null)}
                className="w-full bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Register Modal */}
      <AnimatePresence>
        {showQuickRegModal && (
          <div className="fixed inset-0 bg-[#141414]/80 dark:bg-zinc-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <div className="mb-6">
                <h3 className="text-xl font-black tracking-tighter italic mb-1">Cadastrar Cliente</h3>
                <p className="text-[#141414]/50 dark:text-zinc-400 font-bold text-xs">Registro rápido no momento da venda</p>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5">Nome do Cliente</label>
                  <input
                    value={quickRegName}
                    onChange={(e) => setQuickRegName(e.target.value)}
                    className="w-full p-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none text-xs focus:ring-1 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5">Telefone</label>
                  <input
                    value={quickRegPhone}
                    onChange={(e) => setQuickRegPhone(e.target.value)}
                    className="w-full p-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none text-xs focus:ring-1 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 dark:text-zinc-400 mb-1.5">Descrição / Observação</label>
                  <input
                    value={quickRegDesc}
                    onChange={(e) => setQuickRegDesc(e.target.value)}
                    className="w-full p-3.5 bg-[#F5F5F4] dark:bg-zinc-800 rounded-xl font-bold border-none text-xs focus:ring-1 focus:ring-[#141414]/10 dark:ring-zinc-50/10"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowQuickRegModal(false)}
                  className="flex-1 bg-[#F5F5F4] dark:bg-zinc-800 text-[#141414] dark:text-zinc-100 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#E5E5E5] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmQuickRegisterCustomer}
                  disabled={loading}
                  className="flex-1 bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#141414]/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
