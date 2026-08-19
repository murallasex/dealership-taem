const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable'
});

dom.window.console.error = (msg) => { console.log('BROWSER ERROR:', msg); };
dom.window.addEventListener('error', (e) => { console.log('UNCAUGHT EXCEPTION:', e.error); });
setTimeout(() => { console.log('Done'); process.exit(0); }, 3000);
