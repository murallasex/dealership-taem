global.window = {};
global.document = {
  getElementById: () => ({ addEventListener: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ classList: { add: () => {} }, appendChild: () => {} }),
  body: { appendChild: () => {} }
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.location = { hash: '' };
global.history = { replaceState: () => {} };
global.navigator = { userAgent: 'node' };

import('./app.js').then(app => {
  console.log('APP LOADED SUCCESSFULLY');
}).catch(err => {
  console.error('APP CRASHED:', err);
});
