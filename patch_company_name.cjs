const fs = require('fs');
let code = fs.readFileSync('src/components/CompanyMembersManager.tsx', 'utf-8');

if (!code.includes('isEditingName')) {
  code = code.replace(
    'const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);',
    `const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const handleUpdateCompanyName = async () => {
    if (!company || !newCompanyName.trim()) return;
    try {
      await updateDoc(doc(db, 'companies', company.id), {
        name: newCompanyName.trim()
      });
      setCompany({ ...company, name: newCompanyName.trim() });
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar nome da empresa.');
    }
  };`
  );

  const uiReplacement = `          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#141414] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-[1.5rem] flex items-center justify-center font-black text-2xl italic tracking-tighter shrink-0">
              {(company.name || 'Empresa').charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="text-2xl font-black italic tracking-tighter text-[#141414] dark:text-zinc-100 bg-transparent border-b-2 border-[#141414]/20 dark:border-zinc-50/20 focus:outline-none focus:border-[#141414] dark:focus:border-zinc-50 max-w-[200px] md:max-w-[300px] pb-1"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateCompanyName}
                    className="p-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle size={18} />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-2xl font-black italic tracking-tighter text-[#141414] dark:text-zinc-100">{company.name || 'Sua Empresa'}</h2>
                  <button 
                    onClick={() => {
                      setNewCompanyName(company.name || '');
                      setIsEditingName(true);
                    }}
                    className="md:opacity-0 group-hover:opacity-100 p-1.5 text-[#141414]/40 hover:text-[#141414] dark:text-zinc-400 dark:hover:text-zinc-100 transition-all rounded-md hover:bg-[#141414]/5 dark:hover:bg-zinc-50/5 focus:opacity-100"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              )}
              <p className="text-[10px] font-bold text-[#141414]/40 dark:text-zinc-400 uppercase tracking-widest mt-0.5">Gestão de Equipe e Sócios</p>
            </div>
          </div>`;

  code = code.replace(
    /<div className="flex items-center gap-4">\s*<div className="w-16 h-16 bg-\[#141414\] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-\[1\.5rem\] flex items-center justify-center font-black text-2xl italic tracking-tighter">\s*\{\(company\.name \|\| 'Empresa'\)\.charAt\(0\)\.toUpperCase\(\)\}\s*<\/div>\s*<div>\s*<h2 className="text-2xl font-black italic tracking-tighter text-\[#141414\] dark:text-zinc-100">\{company\.name \|\| 'Sua Empresa'\}<\/h2>\s*<p className="text-\[10px\] font-bold text-\[#141414\]\/40 dark:text-zinc-400 uppercase tracking-widest mt-0\.5">Gestão de Equipe e Sócios<\/p>\s*<\/div>\s*<\/div>/,
    uiReplacement
  );

  fs.writeFileSync('src/components/CompanyMembersManager.tsx', code);
}
