const fs = require('fs');
let code = fs.readFileSync('src/components/SalesCalendar.tsx', 'utf-8');

// Ensure the month view has text inside the tooltip
code = code.replace(/\{val > 0 \? val\.toFixed\(0\) : ''\}/g, '{val > 0 ? val.toFixed(0) : \'\'}');

fs.writeFileSync('src/components/SalesCalendar.tsx', code);
