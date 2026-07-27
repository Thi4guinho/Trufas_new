const fs = require('fs');

let typesCode = fs.readFileSync('src/types.ts', 'utf-8');
typesCode = typesCode.replace(
  "export interface UserSettings {\n  ownerId: string;\n  progressivePricing: PricingRule[];\n  businessName?: string;\n  businessPhone?: string;\n  lowStockAlert?: number;\n}",
  "export interface UserSettings {\n  ownerId: string;\n  progressivePricing: PricingRule[];\n  businessName?: string;\n  businessPhone?: string;\n  lowStockAlert?: number;\n  businessModel?: BusinessModel;\n}"
);
fs.writeFileSync('src/types.ts', typesCode);

let code = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

code = code.replace(
  "const [businessName, setBusinessName] = useState(settings?.businessName || '');",
  "const [businessName, setBusinessName] = useState(settings?.businessName || '');\n  const [businessModel, setBusinessModel] = useState<string>(settings?.businessModel || 'production');"
);

code = code.replace(
  "const updatedSettings: UserSettings = {\n        ownerId: auth.currentUser!.uid,\n        progressivePricing: sortedRules,\n        businessName,\n        businessPhone,\n        lowStockAlert\n      };",
  "const updatedSettings: UserSettings = {\n        ownerId: auth.currentUser!.uid,\n        progressivePricing: sortedRules,\n        businessName,\n        businessPhone,\n        lowStockAlert,\n        businessModel: businessModel as any\n      };"
);

const businessModelUI = `
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
`;

code = code.replace(
  "          <div>\n            <label className=\"block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2\">Alerta de Estoque Baixo (Un.)</label>",
  `${businessModelUI}          <div>\n            <label className=\"block text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-2\">Alerta de Estoque Baixo (Un.)</label>`
);

fs.writeFileSync('src/components/Settings.tsx', code);
