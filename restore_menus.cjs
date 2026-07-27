const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "{ id: 'customers', label: 'Meus Clientes', icon: UserIcon, show: hasPermission(currentMember, 'customers', 'view') },",
  "{ id: 'customers', label: 'Meus Clientes', icon: UserIcon, show: hasPermission(currentMember, 'customers', 'view') },\n              { id: 'production', label: 'Lotes de Estoque', icon: Package, show: hasPermission(currentMember, 'truffles', 'view') || hasPermission(currentMember, 'stock', 'view') },"
);

fs.writeFileSync('src/App.tsx', code);
