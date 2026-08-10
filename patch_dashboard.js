const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

// Remove Lucro do Mês metric
code = code.replace(
  /\{.*?Lucro do Mês.*?\}.*?<div.*?Lucro Líquido Mês.*?<\/div>.*?<\/div>.*?<\/div>/s,
  ''
);

// Remove Lucro from chart data creation
code = code.replace(/Lucro: parseFloat\(totalProfit\.toFixed\(2\)\)/g, '');
code = code.replace(/Lucro: parseFloat\(stat\.profit\.toFixed\(2\)\)/g, '');

// Remove Lucro Area from charts
code = code.replace(/<Area type="monotone" dataKey="Lucro" stroke="#16a34a" strokeWidth=\{3\} fillOpacity=\{1\} fill="url\(#colorProfit\)" \/>/g, '');

// Remove colorProfit linearGradient
code = code.replace(/<linearGradient id="colorProfit".*?<\/linearGradient>/s, '');

// Remove Estoque Baixo metric
code = code.replace(
  /\{.*?Estoque Baixo.*?\}.*?<div.*?Estoque Baixo.*?<\/div>.*?<\/div>.*?<\/div>/s,
  ''
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
