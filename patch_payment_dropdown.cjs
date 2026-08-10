const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

const replacement = `          <div className="relative">
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
                <ChevronDown size={14} className={\`transition-transform \${isPaymentDropdownOpen ? 'rotate-180' : ''}\`} />
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
                          className={\`w-full text-left p-3.5 text-xs font-bold transition-colors hover:bg-[#141414]/5 dark:hover:bg-zinc-800 cursor-pointer \${
                            paymentMethod === option.id ? "bg-[#141414]/5 dark:bg-zinc-800 text-[#141414] dark:text-zinc-100" : "text-[#141414] dark:text-zinc-100"
                          }\`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>`;

code = code.replace(
  /<div>\s*<label className="block text-\[9px\] font-black uppercase tracking-widest text-\[#141414\]\/40 dark:text-zinc-400 mb-1\.5">Forma de Pagamento<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/,
  replacement
);

fs.writeFileSync('src/components/SalesManager.tsx', code);
