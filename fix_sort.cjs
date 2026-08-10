const fs = require('fs');
let code = fs.readFileSync('src/components/SalesCalendar.tsx', 'utf-8');

code = code.replace(/b\[1\] - a\[1\]/g, '(b[1] as number) - (a[1] as number)');

fs.writeFileSync('src/components/SalesCalendar.tsx', code);
