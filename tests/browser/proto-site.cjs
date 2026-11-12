// The live config.js now points at the real database. Tests that open the site from disk use a copy of public/
// with an empty config, so they run the in-memory version and never touch real data.
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '../../public'), DIR = path.join(require('os').tmpdir(), 'fettle-proto-site');
fs.rmSync(DIR, { recursive: true, force: true }); fs.cpSync(SRC, DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'config.js'), 'window.FETTLE_CONFIG = { supabaseUrl: "", supabaseAnonKey: "", siteUrl: "", freeBook: true };\n');
module.exports = DIR;
