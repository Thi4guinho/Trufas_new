const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const regex = /\s*\{\/\* Third Row: Heatmap Calendar \*\/\}\s*<div className="grid grid-cols-1 gap-6 md:gap-8">\s*<SalesCalendar sales=\{activeSales\} \/>\s*<\/div>/g;
let matches = code.match(regex);
if (matches && matches.length > 1) {
  // Replace the first match with itself, but remove the second one.
  // Actually, let's just replace all occurrences with a single one.
  code = code.replace(regex, '');
  code = code.replace(
    /      <\/div>\s*<\/div>\s*\);\s*\};\s*export default Dashboard;/,
    `      </div>\n      {/* Third Row: Heatmap Calendar */}\n      <div className="grid grid-cols-1 gap-6 md:gap-8">\n        <SalesCalendar sales={activeSales} />\n      </div>\n    </div>\n  );\n};\n\nexport default Dashboard;`
  );
}

fs.writeFileSync('src/components/Dashboard.tsx', code);
