const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add MaterialManager import
code = code.replace(
  "import { SettingsHub } from './components/SettingsHub';",
  "import { SettingsHub } from './components/SettingsHub';\nimport { MaterialManager } from './components/MaterialManager';\nimport { Material } from './types';"
);

// 2. Add state for materials
code = code.replace(
  "const [truffles, setTruffles] = useState<Truffle[]>([]);",
  "const [truffles, setTruffles] = useState<Truffle[]>([]);\n  const [materials, setMaterials] = useState<Material[]>([]);"
);

// 3. Add materials collection listener
const collectionListenerRegex = /const unsubscribeTruffles = onSnapshot[\s\S]*?setTruffles\(trufflesData\);\n\s+\}\);/;
const trufflesListener = code.match(collectionListenerRegex)[0];
const materialsListener = `
      const unsubscribeMaterials = onSnapshot(
        query(collection(db, 'companies', companyId, 'materials'), orderBy('name', 'asc')),
        (snapshot) => {
          const materialsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Material[];
          setMaterials(materialsData);
        }
      );
`;
code = code.replace(trufflesListener, `${trufflesListener}\n${materialsListener}`);
code = code.replace(
  "return () => {\n        unsubscribeTruffles();",
  "return () => {\n        unsubscribeTruffles();\n        unsubscribeMaterials();"
);

// 4. Update tabs
code = code.replace(
  "| 'truffles' | 'customers' | 'settings'>('dashboard');",
  "| 'truffles' | 'customers' | 'settings' | 'materials' | 'production'>('dashboard');"
);

// 5. Add materials to nav
const navItemsRegex = /const navItems = \[\s*\{ id: 'dashboard',[^\]]+\];/m;
const navItemsMatch = code.match(navItemsRegex);
if (navItemsMatch) {
  let navItems = navItemsMatch[0];
  navItems = navItems.replace(
    "{ id: 'truffles', label: 'Estoque', icon: Package, permission: 'truffles_view' },",
    "{ id: 'truffles', label: 'Estoque', icon: Package, permission: 'truffles_view' },\n    { id: 'materials', label: 'Matérias-primas', icon: Package, permission: 'materials_view' },\n    { id: 'production', label: 'Produção', icon: Package, permission: 'production_view' },"
  );
  code = code.replace(navItemsMatch[0], navItems);
}

// 6. Add tab rendering
const mainContentRegex = /<main className="flex-1 overflow-y-auto bg-slate-50">[\s\S]*?<\/main>/m;
const mainContentMatch = code.match(mainContentRegex);
if (mainContentMatch) {
  let mainContent = mainContentMatch[0];
  mainContent = mainContent.replace(
    "{activeTab === 'truffles' && hasPermission(currentMember, 'truffles', 'view') && (",
    "{activeTab === 'materials' && hasPermission(currentMember, 'materials', 'view') && (\n              <MaterialManager materials={materials} profile={profile} lowStockLimit={settings?.lowStockAlert} />\n            )}\n            {activeTab === 'truffles' && hasPermission(currentMember, 'truffles', 'view') && ("
  );
  code = code.replace(mainContentMatch[0], mainContent);
}

fs.writeFileSync('src/App.tsx', code);
