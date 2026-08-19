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
dom.window.document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('demo-accounts length:', dom.window.document.getElementById('demo-accounts').innerHTML.length);
        process.exit(0);
    }, 1000);
});
