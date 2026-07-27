const fs = require('fs');
let code = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

code = code.replace("value={rule.minQty}", "value={Number.isNaN(rule.minQty) ? '' : rule.minQty}");
code = code.replace("value={rule.price}", "value={Number.isNaN(rule.price) ? '' : rule.price}");

fs.writeFileSync('src/components/Settings.tsx', code);
