const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('ownerId: auth.currentUser!.uid')) {
        content = content.replace(/ownerId: auth\.currentUser!\.uid/g, 'ownerId: profile?.companyId || auth.currentUser!.uid');
        fs.writeFileSync(fullPath, content);
        console.log('Modified', fullPath);
      }
    }
  }
}

replaceInDir('./src/components');
