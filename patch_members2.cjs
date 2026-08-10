const fs = require('fs');
let code = fs.readFileSync('src/components/CompanyMembersManager.tsx', 'utf-8');

const displayName = "settings?.businessName || company.name || 'Sua Empresa'";

code = code.replace(
  "{(company.name || 'Empresa').charAt(0).toUpperCase()}",
  "{(" + displayName + ").charAt(0).toUpperCase()}"
);

code = code.replace(
  /<h2 className="text-2xl font-black italic tracking-tighter text-\[#141414\] dark:text-zinc-100">\{company\.name \|\| 'Sua Empresa'\}<\/h2>/,
  '<h2 className="text-2xl font-black italic tracking-tighter text-[#141414] dark:text-zinc-100">{' + displayName + '}</h2>'
);

fs.writeFileSync('src/components/CompanyMembersManager.tsx', code);
