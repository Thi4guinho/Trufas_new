const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsHub.tsx', 'utf-8');

const replacementFn = `
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const handleResetDatabase = async () => {
    const ownerId = profile?.companyId || auth.currentUser?.uid;
    if (!ownerId) return;

    if (resetCode !== 'APAGAR') {
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

      setShowResetConfirm(false);
      setResetCode('');
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Erro ao tentar resetar o sistema.');
    } finally {
      setIsResetting(false);
    }
  };
`;

code = code.replace(
  /const \[isResetting, setIsResetting\] = useState\(false\);[\s\S]*?const handleResetDatabase = async \(\) => \{[\s\S]*?finally \{\s*setIsResetting\(false\);\s*\}\s*\};\s*/m,
  replacementFn
);

const btnMarkupOriginal = `
              {/* Reset Data Button */}
              <button 
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="w-full p-6 bg-red-600 text-white rounded-[2rem] hover:bg-red-700 transition-all flex items-center justify-between group text-left shadow-lg disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tighter italic text-lg">Zona de Perigo: Resetar Sistema</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Apagar TODOS os dados e começar do zero</p>
                  </div>
                </div>
                <ChevronRight size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
`;

const btnMarkupReplacement = `
              {/* Reset Data Button */}
              {!showResetConfirm ? (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full p-6 bg-red-600 text-white rounded-[2rem] hover:bg-red-700 transition-all flex items-center justify-between group text-left shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-black tracking-tighter italic text-lg">Zona de Perigo: Resetar Sistema</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Apagar TODOS os dados e começar do zero</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <div className="w-full p-6 bg-red-50 border border-red-200 rounded-[2rem]">
                  <h4 className="font-black tracking-tighter italic text-lg text-red-800 mb-2">Tem certeza absoluta?</h4>
                  <p className="text-sm text-red-600 mb-4 font-medium">Esta ação é irreversível. Todos os clientes, vendas, produtos e histórico serão apagados permanentemente.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-red-800/60 mb-2">
                        Digite APAGAR para confirmar
                      </label>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="APAGAR"
                        className="w-full p-4 bg-white rounded-xl border border-red-200 font-bold text-center"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setShowResetConfirm(false);
                          setResetCode('');
                        }}
                        className="flex-1 p-4 bg-white text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleResetDatabase}
                        disabled={resetCode !== 'APAGAR' || isResetting}
                        className="flex-1 p-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isResetting ? 'Apagando...' : 'Confirmar Exclusão'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
`;

code = code.replace(btnMarkupOriginal.trim(), btnMarkupReplacement.trim());

fs.writeFileSync('src/components/SettingsHub.tsx', code);
