const fs = require('fs');
let code = fs.readFileSync('src/components/SalesCalendar.tsx', 'utf-8');

code = code.replace(/dayData\.products\[item\.name\]/g, 'dayData.products[item.truffleName]');

fs.writeFileSync('src/components/SalesCalendar.tsx', code);
