const fs = require('fs');
const files = [
  'src/ui/views/crmView.js',
  'src/ui/views/dashboardView.js',
  'src/ui/views/inventoryView.js',
  'src/ui/views/paymentHistoryView.js',
  'src/ui/views/salesView.js',
  'src/ui/views/sellersView.js'
];
for(const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for(let i=0; i<lines.length; i++) {
    const line = lines[i];
    // check for malformed syntax, e.g. "fmt()" empty, or "fmt(v)" where v is missing, or unexpected ")"
    if(line.includes('fmt(') && (line.includes('fmt()') || line.includes(')') && !line.includes('('))) {
      // rough heuristic
    }
    // Let's just catch syntax errors line by line using Function()
    try {
        new Function(line);
    } catch(e) {
        if(e.name === 'SyntaxError' && !line.includes('import ') && !line.includes('export ') && !line.trim().startsWith('<') && !line.trim().startsWith('$')) {
            // console.log(file, i+1, line);
        }
    }
  }
}
