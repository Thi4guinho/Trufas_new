const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "import { MaterialManager } from './components/MaterialManager';",
  "import { MaterialManager } from './components/MaterialManager';\nimport { ProductionManager } from './components/ProductionManager';"
);

code = code.replace(
  "{activeTab === 'materials' && hasPermission(currentMember, 'materials', 'view') && (",
  "{activeTab === 'production' && hasPermission(currentMember, 'production', 'view') && (\n              <ProductionManager batches={productionBatches} materials={materials} products={truffles} profile={profile} />\n            )}\n            {activeTab === 'materials' && hasPermission(currentMember, 'materials', 'view') && ("
);

fs.writeFileSync('src/App.tsx', code);
