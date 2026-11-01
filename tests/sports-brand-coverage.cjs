const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const brands=html.match(/<select id="sportsBrand">([\s\S]*?)<\/select>/)?.[1]||'';
for(const brand of ['O-Pee-Chee','Parkhurst','Leaf','Upper Deck','Topps','Panini','Fleer','Donruss','Bowman','Score']){
 assert(brands.includes('value="'+brand+'"'),'Missing mainstream sports-card brand '+brand);
}
assert(brands.includes('Other / Unknown'),'Must allow niche and unknown brands');
console.log('Sports-card listing brand coverage: 11 checks passed');
