const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

code = code.replace("value={quantity}", "value={Number.isNaN(quantity as number) ? '' : quantity}");

fs.writeFileSync('src/components/SalesManager.tsx', code);
