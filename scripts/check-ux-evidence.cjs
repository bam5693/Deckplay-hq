#!/usr/bin/env node
// Lightweight, fail-closed independent UX evidence validator for customer-facing PRs.
const fs=require('node:fs');
const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const pr=event.pull_request;
if(!pr)throw Error('Expected pull_request event');
const body=pr.body||'';
const files=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const paths=files.map(f=>f.filename);
const customer=paths.some(p=>p==='index.html'||/^(?:[^/]+\.html|(?:src|components|public|assets|tests\/e2e)\/)/.test(p)&&!/\.md$/.test(p));
if(!customer){console.log('Documentation or infrastructure only: no customer-facing UI change');process.exit(0)}
const fail=[];
if(!/##\s*UX ACCEPTANCE/i.test(body))fail.push('Missing UX ACCEPTANCE section');
const required=['Jayden','Tanner','mobile','dark','light','reviewer','evidence','status'];
for(const name of required)if(!new RegExp(name,'i').test(body))fail.push('Missing UX evidence field: '+name);
if(/UX\s*(?:status|decision)\s*:\s*(?:UX\s*)?BLOCKED/i.test(body))fail.push('UX is explicitly BLOCKED');
if(!/UX\s*(?:status|decision)\s*:\s*ACCEPTED/i.test(body))fail.push('Explicit UX status: ACCEPTED required');
if(!/^Reviewer:[ \t]*@?[\w-]{2,}[ \t]*$/im.test(body))fail.push('Named reviewer required');
if(!/^Evidence:[ \t]*https:\/\/\S+[ \t]*$/im.test(body))fail.push('Link to focused test evidence required');
if(/\[ \]\s*\*\*(?:Jayden|Tanner)/.test(body))fail.push('Unchecked reviewer persona checkbox');
if(fail.length){for(const f of fail)console.error('UX BLOCKED: '+f);process.exit(1)}
console.log('UX evidence gate accepted metadata; code/test correctness is validated separately.');
