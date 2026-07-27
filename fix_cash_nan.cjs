const fs = require('fs');
let code = fs.readFileSync('src/components/CashflowManager.tsx', 'utf-8');

code = code.replace("value={value}", "value={Number.isNaN(value as number) ? '' : value}");

fs.writeFileSync('src/components/CashflowManager.tsx', code);
