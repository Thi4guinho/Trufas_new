const fs = require('fs');
let code = fs.readFileSync('src/components/CompanyMembersManager.tsx', 'utf-8');

const targetContent = `              {isEditingName ? (
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
                  <h2 className="text-2xl font-black italic tracking-tighter text-[#141414] dark:text-zinc-100">{settings?.businessName || company.name || 'Sua Empresa'}</h2>
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
              )}`;

const replacement = `              <h2 className="text-2xl font-black italic tracking-tighter text-[#141414] dark:text-zinc-100">{settings?.businessName || company.name || 'Sua Empresa'}</h2>`;

code = code.replace(targetContent, replacement);
fs.writeFileSync('src/components/CompanyMembersManager.tsx', code);
