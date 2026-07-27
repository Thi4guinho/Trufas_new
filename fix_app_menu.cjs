const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "{ id: 'materials', label: 'Matérias-primas', icon: Package, permission: 'materials_view' },",
  ""
);

fs.writeFileSync('src/App.tsx', code);
