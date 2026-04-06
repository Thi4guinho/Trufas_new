import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { UserSettings, PricingRule, OperationType } from '../types';
import { auth, db } from '../firebase';
import { handleFirestoreError } from '../utils';

interface SettingsProps {
  settings: UserSettings | null;
}

export const Settings: React.FC<SettingsProps> = ({ settings }) => {
  const [rules, setRules] = useState<PricingRule[]>(settings?.progressivePricing || []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', auth.currentUser!.uid), {
        ownerId: auth.currentUser!.uid,
        progressivePricing: rules
      }, { merge: true });
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
