import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Search, 
  Trash2, 
  AlertCircle, 
  CheckCircle2,
  Package,
  Scale
} from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Material, OperationType } from '../types';
import { db } from '../firebase';
import { handleFirestoreError, cn } from '../utils';

interface MaterialManagerProps {
  materials: Material[];
  profile: any;
  lowStockLimit?: number;
}

export const MaterialManager: React.FC<MaterialManagerProps> = ({ 
  materials, 
  profile,
  lowStockLimit = 5
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'g'|'kg'|'ml'|'l'|'un'>('g');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [stock, setStock] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setUnit('g');
    setCostPerUnit('');
    setStock('');
    setEditingMaterial(null);
    setIsAdding(false);
    setError(null);
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setName(material.name);
    setUnit(material.unit);
    setCostPerUnit(material.costPerUnit.toString());
    setStock(material.stock.toString());
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!profile?.companyId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta matéria-prima?')) return;
    
    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch (error: any) {
      const errorInfo = handleFirestoreError(error, OperationType.DELETE, `materials/${id}`);
      setError(errorInfo.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.companyId) return;

    setLoading(true);
    setError(null);

    const costValue = parseFloat(costPerUnit.replace(',', '.'));
    const stockValue = parseFloat(stock.replace(',', '.'));

    if (isNaN(costValue) || costValue < 0) {
      setError('Custo unitário inválido.');
      setLoading(false);
      return;
    }

    if (isNaN(stockValue) || stockValue < 0) {
      setError('Estoque inválido.');
      setLoading(false);
      return;
    }

    const materialData = {
      name,
      unit,
      costPerUnit: costValue,
      stock: stockValue,
      ownerId: profile.companyId,
      updatedAt: Timestamp.now()
    };

    try {
      if (editingMaterial) {
        await updateDoc(
          doc(db, 'materials', editingMaterial.id),
          materialData
        );
        setSuccess('Matéria-prima atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'materials'), {
          ...materialData,
          createdAt: Timestamp.now()
        });
        setSuccess('Matéria-prima adicionada com sucesso!');
      }
      
      setTimeout(() => setSuccess(null), 3000);
      resetForm();
    } catch (error: any) {
      const errorInfo = handleFirestoreError(
        error, 
        editingMaterial ? OperationType.UPDATE : OperationType.CREATE,
        editingMaterial ? `materials/${editingMaterial.id}` : 'materials'
      );
      setError(errorInfo.error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [materials, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Matérias-primas</h2>
          <p className="text-slate-500">Gerencie os ingredientes para produção</p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Nova Matéria-prima
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar matéria-prima..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ingrediente
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Custo Unitário
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMaterials.map((material) => (
                <tr key={material.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Scale className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-800">{material.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        material.stock <= lowStockLimit ? "text-amber-600" : "text-slate-700"
                      )}>
                        {material.stock} {material.unit}
                      </span>
                      {material.stock <= lowStockLimit && (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-slate-600">
                      R$ {material.costPerUnit.toFixed(4)} / {material.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(material)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(material.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma matéria-prima encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Form - In a real app this would be a Dialog component, but following existing patterns */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingMaterial ? 'Editar Matéria-prima' : 'Nova Matéria-prima'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome do Ingrediente
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: Leite Condensado"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Unidade de Medida
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-900"
                    >
                      <option value="g">Gramas (g)</option>
                      <option value="kg">Quilos (kg)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="l">Litros (l)</option>
                      <option value="un">Unidade (un)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Estoque Atual
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Custo por {unit} (R$)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Informe o custo médio para 1 {unit}.
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
