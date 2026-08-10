const fs = require('fs');
let code = fs.readFileSync('src/components/CompanyMembersManager.tsx', 'utf-8');

code = code.replace(
  "import { Company, CompanyMember, CompanyPermission } from '../types';",
  "import { Company, CompanyMember, CompanyPermission, UserSettings } from '../types';"
);

code = code.replace(
  "interface CompanyMembersManagerProps {\n  companyId: string;\n  currentUserEmail: string | null;\n}",
  "interface CompanyMembersManagerProps {\n  companyId: string;\n  currentUserEmail: string | null;\n  settings: UserSettings | null;\n}"
);

code = code.replace(
  "export const CompanyMembersManager: React.FC<CompanyMembersManagerProps> = ({ companyId, currentUserEmail }) => {",
  "export const CompanyMembersManager: React.FC<CompanyMembersManagerProps> = ({ companyId, currentUserEmail, settings }) => {"
);

const displayName = "settings?.businessName || company.name || 'Sua Empresa'";

// Replace the name display
code = code.replace(
  /\{\(company\.name \|\| 'Empresa'\)\.charAt\(0\)\.toUpperCase\(\)\}/g,
  "{(" + displayName + ").charAt(0).toUpperCase()}"
);

code = code.replace(
  /<h2 className="text-2xl font-black italic tracking-tighter text-\[#141414\] dark:text-zinc-100">\{company\.name \|\| 'Sua Empresa'\}<\/h2>/,
  '<h2 className="text-2xl font-black italic tracking-tighter text-[#141414] dark:text-zinc-100">{' + displayName + '}</h2>'
);

// We should remove the editing name part since it should be edited in settings
// The user says "substitua os campos de nome da empresa pelo nome comercial, solicitado nas informações da empresa"
// So we probably don't want the inline edit anymore? Let's check how the inline edit is rendered.
