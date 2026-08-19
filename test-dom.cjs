const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
});

dom.window.console.error = (msg) => console.log('ERROR:', msg);
dom.window.console.log = (msg) => console.log('LOG:', msg);

dom.window.document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const demoAccounts = dom.window.document.getElementById('demo-accounts');
    console.log('demo-accounts innerHTML:', demoAccounts.innerHTML);
  }, 1000);
});
