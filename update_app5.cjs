const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "{ id: 'materials', label: 'Matérias-primas', icon: Package, permission: 'materials_view' },\n    { id: 'production', label: 'Produção', icon: Package, permission: 'production_view' },",
  "...(settings?.businessModel === 'production' ? [\n      { id: 'materials', label: 'Matérias-primas', icon: Package, permission: 'materials_view' },\n      { id: 'production', label: 'Produção', icon: Package, permission: 'production_view' }\n    ] : []),"
);

fs.writeFileSync('src/App.tsx', code);
