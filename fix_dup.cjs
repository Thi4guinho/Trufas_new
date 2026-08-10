const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

code = code.replace(
  "  const [isDropdownOpen, setIsDropdownOpen] = useState(false);\n  const [isDropdownOpen, setIsDropdownOpen] = useState(false);",
  "  const [isDropdownOpen, setIsDropdownOpen] = useState(false);"
);

fs.writeFileSync('src/components/SalesManager.tsx', code);
