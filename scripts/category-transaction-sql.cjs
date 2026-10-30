const fs=require('node:fs');const catalog=JSON.parse(fs.readFileSync('tests/fixtures/category-catalog.json'));
const template=fs.readFileSync('tests/integration/category-transactions.sql','utf8');
if(template.split('__CATEGORY_ROWS__').length!==2)throw Error('Expected exact catalog placeholder');
fs.writeFileSync('/tmp/deckplay-category-transactions.sql',template.replace('__CATEGORY_ROWS__',()=>JSON.stringify(catalog.rows).replaceAll("'","''")));
console.log('Generated rollback-only staging SQL for '+catalog.rows.length+' combinations × four personas');
