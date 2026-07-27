const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "{activeTab === 'settings' && (",
  `{activeTab === 'materials' && (
                  <MaterialManager materials={materials} />
                )}
                {activeTab === 'production' && (
                  <ProductionManager batches={productionBatches} products={truffles} profile={profile} />
                )}
                {activeTab === 'settings' && (`
);

fs.writeFileSync('src/App.tsx', code);
