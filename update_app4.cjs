const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "<TruffleManager truffles={truffles} profile={profile} lowStockLimit={settings?.lowStockAlert} />",
  "<TruffleManager truffles={truffles} profile={profile} materials={materials} lowStockLimit={settings?.lowStockAlert} />"
);

fs.writeFileSync('src/App.tsx', code);
