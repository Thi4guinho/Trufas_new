const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add MaterialManager import
code = code.replace(
  "import { SettingsHub } from './components/SettingsHub';",
  "import { SettingsHub } from './components/SettingsHub';\nimport { MaterialManager } from './components/MaterialManager';\nimport { Material, ProductionBatch } from './types';"
);

// 2. Add state for materials
code = code.replace(
  "const [truffles, setTruffles] = useState<Truffle[]>([]);",
  "const [truffles, setTruffles] = useState<Truffle[]>([]);\n  const [materials, setMaterials] = useState<Material[]>([]);\n  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);"
);

// 3. Add materials collection listener
const trufflesListener = "unsubscribeTruffles = onSnapshot(qTruffles, (snapshot) => {        setTruffles(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Truffle)));      }, onErr('truffles'));";

code = code.replace(trufflesListener, `${trufflesListener}
    } else {
      setTruffles([]);
    }

    let unsubscribeMaterials = () => {};
    let unsubscribeProduction = () => {};

    if (hasPermission(currentMember, 'materials', 'view')) {
      const qMaterials = query(collection(db, 'materials'), where('ownerId', '==', companyId));
      unsubscribeMaterials = onSnapshot(qMaterials, (snapshot) => {
        setMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Material)));
      }, onErr('materials'));
    } else {
      setMaterials([]);
    }

    if (hasPermission(currentMember, 'production', 'view')) {
      const qProduction = query(collection(db, 'production_batches'), where('ownerId', '==', companyId));
      unsubscribeProduction = onSnapshot(qProduction, (snapshot) => {
        setProductionBatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProductionBatch)));
      }, onErr('production'));
`);

code = code.replace(
  "unsubscribeTruffles();\n        unsubscribeSales();",
  "unsubscribeTruffles();\n        unsubscribeSales();\n        unsubscribeMaterials();\n        unsubscribeProduction();"
);

// 4. Update tabs
code = code.replace(
  "| 'truffles' | 'customers' | 'settings'>('dashboard');",
  "| 'truffles' | 'customers' | 'settings' | 'materials' | 'production'>('dashboard');"
);

// 5. Add materials to nav
code = code.replace(
  "{ id: 'truffles', label: 'Estoque', icon: Package, permission: 'truffles_view' },",
  "{ id: 'truffles', label: 'Estoque', icon: Package, permission: 'truffles_view' },\n    { id: 'materials', label: 'Matérias-primas', icon: Package, permission: 'materials_view' },\n    { id: 'production', label: 'Produção', icon: Package, permission: 'production_view' },"
);

// 6. Add tab rendering
code = code.replace(
  "{activeTab === 'truffles' && hasPermission(currentMember, 'truffles', 'view') && (",
  "{activeTab === 'materials' && hasPermission(currentMember, 'materials', 'view') && (\n              <MaterialManager materials={materials} profile={profile} lowStockLimit={settings?.lowStockAlert} />\n            )}\n            {activeTab === 'truffles' && hasPermission(currentMember, 'truffles', 'view') && ("
);

fs.writeFileSync('src/App.tsx', code);
