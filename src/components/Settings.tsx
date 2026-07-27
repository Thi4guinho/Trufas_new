import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, HelpCircle } from 'lucide-react';
import { doc, setDoc, collection, addDoc, Timestamp, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { UserSettings, PricingRule, OperationType } from '../types';
import { auth, db } from '../firebase';
import { handleFirestoreError } from '../utils';

interface SettingsProps {
  settings: UserSettings | null;
  profile: any;
}

export const Settings: React.FC<SettingsProps> = ({ settings, profile }) => {
  const [rules, setRules] = useState<PricingRule[]>(settings?.progressivePricing || []);
  const [businessName, setBusinessName] = useState(settings?.businessName || 'TruffleTech');
  const [businessPhone, setBusinessPhone] = useState(settings?.businessPhone || '');
  const [lowStockAlert, setLowStockAlert] = useState<number>(settings?.lowStockAlert || 5);
  const [businessModel, setBusinessModel] = useState<string>(settings?.businessModel || 'production');
  const [isSaving, setIsSaving] = useState(false);

  
  const [isResetting, setIsResetting] = useState(false);
  const handleResetDatabase = async () => {
    const ownerId = profile?.companyId || auth.currentUser?.uid;
    if (!ownerId) return;

    if (!window.confirm('ATENÇÃO: Você tem certeza ABSOLUTA que deseja apagar TODOS os dados do sistema? Esta ação é irreversível.')) {
      return;
    }
    
    if (window.prompt('Para confirmar a exclusão, digite a palavra: APAGAR') !== 'APAGAR') {
      alert('Exclusão cancelada.');
      return;
    }

    setIsResetting(true);
    try {
      const collections = [
        'truffles',
        'sales',
        'customers',
        'cashflow',
        'audit_logs',
        'production_batches',
        'stock_batches',
        'materials'
      ];

      for (const collName of collections) {
        const q = query(collection(db, collName), where('ownerId', '==', ownerId));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }

      alert('Sistema resetado com sucesso! Todos os dados foram apagados.');
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Erro ao tentar resetar o sistema.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ownerId: profile?.companyId || auth.currentUser!.uid,
        progressivePricing: rules,
        businessName: businessName.trim(),
        businessPhone: businessPhone.trim(),
        lowStockAlert: Number(lowStockAlert),
        businessModel: businessModel as any
      };

      await setDoc(doc(db, 'settings', auth.currentUser!.uid), updatedSettings, { merge: true });
      
      // Log Action
      await addDoc(collection(db, 'audit_logs'), {
        userId: auth.currentUser!.uid,
        userName: profile?.displayName || auth.currentUser?.email || 'Sistema',
        action: 'Atualizou as configurações gerais do negócio/preços',
        details: `Empresa: ${businessName} | Telefone: ${businessPhone} | Alerta Estoque: ${lowStockAlert}`,
        date: Timestamp.now(),
        ownerId: profile?.companyId || auth.currentUser!.uid
      });

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#141414]/5 shadow-xl space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Configurações Básicas</p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter italic">Informações da Empresa</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#141414]/5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Nome Comercial</label>
            <input 
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Produtos da Maria"
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 text-sm text-[#141414]"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Telefone Comercial / WhatsApp</label>
            <input 
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="Ex: (11) 98765-4321"
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 text-sm text-[#141414]"
            />
          </div>


          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Modelo de Negócio</label>
            <select
              value={businessModel}
              onChange={(e) => setBusinessModel(e.target.value)}
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 text-sm text-[#141414]"
            >
              <option value="retail">Revenda (Somente Estoque Final)</option>
              <option value="production">Produção (Ingredientes e Fichas Técnicas)</option>
              <option value="service">Prestação de Serviços</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Alerta de Estoque Baixo (Un.)</label>
            <input 
              type="number"
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-4 bg-[#F5F5F4] rounded-2xl font-bold border-none focus:ring-2 focus:ring-[#141414]/10 text-sm text-[#141414]"
            />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Preço Progressivo</p>
          <p className="text-[#141414]/60 mb-6 text-xs leading-relaxed font-medium">
            Defina faixas de preços especiais baseados no volume total comprado. Se o pacote final somar a quantidade informada, o valor unitário será reajustado automaticamente na venda.
          </p>
        </div>

        <div className="space-y-4">
          {rules.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-[#141414]/10 rounded-2xl text-xs font-bold text-[#141414]/40">
              Nenhuma faixa progressiva configurada.
            </div>
          )}

          {rules.map((rule, i) => (
            <div key={i} className="flex gap-4 items-end p-4 bg-[#F5F5F4] rounded-2xl border border-[#141414]/5">
              <div className="flex-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 mb-1.5">Qtd. Mínima (Un.)</label>
                <input 
                  type="number"
                  min="2"
                  value={Number.isNaN(rule.minQty) ? '' : rule.minQty}
                  onChange={(e) => {
                    const newRules = [...rules];
                    newRules[i].minQty = parseInt(e.target.value) || 1;
                    setRules(newRules);
                  }}
                  className="w-full p-3 bg-white rounded-xl font-bold border-none text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#141414]/40 mb-1.5">Preço Unitário Especial (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={Number.isNaN(rule.price) ? '' : rule.price}
                  onChange={(e) => {
                    const newRules = [...rules];
                    newRules[i].price = parseFloat(e.target.value) || 0;
                    setRules(newRules);
                  }}
                  className="w-full p-3 bg-white rounded-xl font-bold border-none text-xs"
                />
              </div>
              <button 
                onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
                className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        
        <div className="pt-6 border-t border-[#141414]/10 mt-8 mb-4">
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Zona de Perigo: Resetar Sistema
              </h3>
              <p className="text-sm text-red-600 mt-1">
                Isso apagará permanentemente todos os produtos, vendas, clientes, materiais e fluxo de caixa.
              </p>
            </div>
            <button
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {isResetting ? 'Apagando...' : 'Apagar Todos os Dados'}
            </button>
          </div>
        </div>
        <div className="flex gap-4 pt-4">

          <button 
            type="button"
            onClick={() => setRules([...rules, { minQty: 10, price: 2.50 }])}
            className="flex-1 bg-[#F5F5F4] hover:bg-[#141414]/5 text-[#141414] py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1 transition-all"
          >
            <Plus size={16} /> Adicionar Regra
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#141414] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#141414]/90 transition-all"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
