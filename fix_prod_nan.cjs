const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionManager.tsx', 'utf-8');

code = code.replace("value={recipesCount}", "value={Number.isNaN(parseFloat(recipesCount)) ? '' : recipesCount}");
code = code.replace("value={actualYield}", "value={Number.isNaN(parseFloat(actualYield)) ? '' : actualYield}");
code = code.replace("value={discarded}", "value={Number.isNaN(parseFloat(discarded)) ? '' : discarded}");

fs.writeFileSync('src/components/ProductionManager.tsx', code);
