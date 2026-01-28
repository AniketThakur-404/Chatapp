const fs=require('fs'); const data=fs.readFileSync('server.js','utf8'); const idx=data.indexOf('// Helper - placeholder'); console.log(data.slice(idx,idx+800));
