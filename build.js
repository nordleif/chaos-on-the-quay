const fs=require('fs');
const three=fs.readFileSync(__dirname+'/node_modules/three/build/three.min.js','utf8').replace(/<\/script/g,'<\\/script');
const game=fs.readFileSync(__dirname+'/game.js','utf8');
let h=fs.readFileSync(__dirname+'/src.html','utf8');
h=h.replace('/*THREE*/',()=>three).replace('/*GAME*/',()=>game);
fs.mkdirSync(__dirname+'/docs',{recursive:true});
fs.writeFileSync(__dirname+'/docs/index.html',h);
console.log('built',(h.length/1024|0)+'KB');
