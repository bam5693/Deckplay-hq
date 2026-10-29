// Test-only TOTP generator. Never log or persist a live setup key or code.
const {createHmac}=require('node:crypto');
function totp(secret,seconds=Date.now()/1000){
 const encoded=String(secret).replace(/\s/g,'').replace(/=+$/,'').toUpperCase();
 if(!/^[A-Z2-7]+$/.test(encoded)||!Number.isFinite(seconds)||seconds<0)throw Error('Invalid TOTP test input');
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',bytes=[];let value=0,bits=0;
 for(const char of encoded){value=(value<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bits-=8;bytes.push((value>>bits)&255);value&=(1<<bits)-1}}
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(seconds/30)));
 const hash=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;
 return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
module.exports={totp};
