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

fs.writeFileSync('src/components/CompanyMembersManager.tsx', code);
