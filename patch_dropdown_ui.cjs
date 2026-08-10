const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

const replacement = `          <div className="flex-1 w-full relative">
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
                     return t ? \`\${t.name} (R$\${t.price.toFixed(2)})\` : "Selecione o Produto...";
                  })() : "Selecione o Produto..."}
                </span>
                <ChevronDown size={14} className={\`transition-transform \${isDropdownOpen ? 'rotate-180' : ''}\`} />
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
                      {truffles.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          disabled={t.stock <= 0}
                          onClick={() => {
                            setSelectedTruffleId(t.id);
                            setIsDropdownOpen(false);
                          }}
                          className={\`w-full text-left p-3.5 text-xs font-bold transition-colors \${
                            t.stock <= 0 
                              ? "opacity-50 cursor-not-allowed" 
                              : "hover:bg-[#141414]/5 dark:hover:bg-zinc-800 cursor-pointer"
                          } \${
                            selectedTruffleId === t.id ? "bg-[#141414]/5 dark:bg-zinc-800" : ""
                          }\`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[#141414] dark:text-zinc-100">{t.name}</span>
                            <span className="text-[#141414]/50 dark:text-zinc-400">R\${t.price.toFixed(2)}</span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>`;

code = code.replace(
  /<div className="flex-1 w-full">\s*<label className="block text-\[9px\] font-black uppercase tracking-widest text-\[#141414\]\/40 dark:text-zinc-400 mb-1\.5">Escolher Sabor<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/,
  replacement
);

fs.writeFileSync('src/components/SalesManager.tsx', code);
