const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsHub.tsx', 'utf-8');

if (!code.includes('handleResetDatabase')) {
  code = code.replace(
    "import { auth } from '../firebase';",
    "import { auth, db } from '../firebase';\nimport { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';"
  );
  
  const resetFn = `
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
`;
  
  code = code.replace(
    "const renderContent = () => {",
    resetFn + "\n  const renderContent = () => {"
  );
  
  const btnMarkup = `
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
              {/* Sign out button */}
`;
  
  code = code.replace(
    "{/* Sign out button */}",
    btnMarkup
  );
  
  code = code.replace(
    "FileText,\n  UserPlus",
    "FileText,\n  UserPlus,\n  Trash2"
  );
  
  fs.writeFileSync('src/components/SettingsHub.tsx', code);
}
