const fs = require('fs');
let code = fs.readFileSync('src/permissions.ts', 'utf-8');

code = code.replace(
  '  truffles_delete: true,',
  `  truffles_delete: true,
  materials_view: true,
  materials_create: true,
  materials_edit: true,
  materials_delete: true,
  production_view: true,
  production_create: true,
  production_edit: true,
  production_delete: true,`
);

code = code.replace(
  '  truffles_delete: false,',
  `  truffles_delete: false,
  materials_view: true,
  materials_create: false,
  materials_edit: false,
  materials_delete: false,
  production_view: true,
  production_create: true,
  production_edit: false,
  production_delete: false,`
);

fs.writeFileSync('src/permissions.ts', code);
