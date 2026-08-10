const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

code = code.replace(
  "  const [isDropdownOpen, setIsDropdownOpen] = useState(false);",
  "  const [isDropdownOpen, setIsDropdownOpen] = useState(false);\n  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);"
);

fs.writeFileSync('src/components/SalesManager.tsx', code);
