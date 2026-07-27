const fs = require('fs');
let code = fs.readFileSync('src/components/TruffleManager.tsx', 'utf-8');

const compositionUI = `
            {/* Composition Editor */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Composição (Receita)</label>
                <button
                  type="button"
                  onClick={() => setComposition(prev => prev ? null : { ingredients: [], expectedYield: 1 })}
                  className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                >
                  {composition ? 'Remover' : 'Adicionar'}
                </button>
              </div>

              {composition && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {composition.ingredients.map((ing: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <select
                          value={ing.materialId}
                          onChange={(e) => {
                            const material = materials.find(m => m.id === e.target.value);
                            const newIngs = [...composition.ingredients];
                            newIngs[index] = { 
                              ...newIngs[index], 
                              materialId: e.target.value,
                              materialName: material?.name || '',
                              unit: material?.unit || 'un'
                            };
                            setComposition({ ...composition, ingredients: newIngs });
                          }}
                          className="flex-1 p-2 bg-white rounded-lg font-bold border border-slate-200 text-xs"
                        >
                          <option value="">Selecione...</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="any"
                          value={ing.quantity}
                          onChange={(e) => {
                            const newIngs = [...composition.ingredients];
                            newIngs[index].quantity = parseFloat(e.target.value);
                            setComposition({ ...composition, ingredients: newIngs });
                          }}
                          placeholder="Qtd"
                          className="w-20 p-2 bg-white rounded-lg font-bold border border-slate-200 text-xs text-center"
                        />
                        <span className="text-xs font-bold text-slate-400 w-6">{ing.unit}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newIngs = [...composition.ingredients];
                            newIngs.splice(index, 1);
                            setComposition({ ...composition, ingredients: newIngs });
                          }}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => setComposition({
                        ...composition, 
                        ingredients: [...composition.ingredients, { materialId: '', materialName: '', quantity: 0, unit: 'un' }]
                      })}
                      className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                    >
                      + Novo Ingrediente
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2">Rendimento (Lote)</label>
                    <input
                      type="number"
                      step="any"
                      value={composition.expectedYield}
                      onChange={(e) => setComposition({ ...composition, expectedYield: parseFloat(e.target.value) })}
                      className="w-full p-3 bg-white rounded-xl font-bold border border-slate-200 text-sm"
                      placeholder="Ex: 30"
                    />
                  </div>
                </div>
              )}
            </div>
`;

code = code.replace(
  "            {/* Live margin previews */}",
  `${compositionUI}\n            {/* Live margin previews */}`
);

fs.writeFileSync('src/components/TruffleManager.tsx', code);
