const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');

const testDirectory = resolve(__dirname, '..', '.test-dist', 'tests');
for (const file of readdirSync(testDirectory).filter(name => name.endsWith('.test.js')).sort()) {
  require(resolve(testDirectory, file));
}
