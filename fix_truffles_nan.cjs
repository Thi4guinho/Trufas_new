const fs = require('fs');
let code = fs.readFileSync('src/components/TruffleManager.tsx', 'utf-8');

code = code.replace("value={cost}", "value={Number.isNaN(cost as number) ? '' : cost}");
code = code.replace("value={price}", "value={Number.isNaN(price as number) ? '' : price}");
code = code.replace("value={stock}", "value={Number.isNaN(stock as number) ? '' : stock}");

fs.writeFileSync('src/components/TruffleManager.tsx', code);
