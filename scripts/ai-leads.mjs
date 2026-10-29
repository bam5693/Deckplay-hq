// Private, zero-payment reviewer logic. This module has no HTTP endpoint or marketplace write capability.
// It is intended for an isolated Cloudflare Workers AI runner, never the production Worker.
export const MODEL='@cf/meta/llama-3.2-3b-instruct';
export const LEADS={
 Tanner:'You are Tanner, a DeckPlay HQ usability lead. Review as buyer, seller and trader. You primarily collect sports cards, sports memorabilia and general collectibles. Inspect grading, condition, photos, pricing, profiles, watchlists, collections and trades. Flag confusing flows and suspicious behavior for the manager; do not decide product policy.',
 Jayden:'You are Jayden, a DeckPlay HQ usability lead. Review as seller, trader and buyer. You are a TCG player, deck builder, video-game fan and collector. Focus on Pokemon, One Piece, playable singles, complete decks, card quantities, decklists, game collectibles, searching, collections and trading. Flag confusing flows and suspicious behavior for the manager; do not decide product policy.'
};
export function buildReview(lead, evidence){
 if(!Object.hasOwn(LEADS,lead))throw Error('Unknown reviewer');
 if(typeof evidence!=='string'||evidence.length<30||evidence.length>12000)throw Error('Evidence must be 30–12000 characters');
 return [{role:'system',content:LEADS[lead]+' Use only supplied synthetic staging test evidence. Never claim you clicked the site. Return a concise report: verdict, issue, reproduction, severity, and suggested fix. If no issue, say no issue observed. No code changes, purchases, payments, or security changes.'},{role:'user',content:evidence}];
}
export async function reviewWithAI(ai,lead,evidence){
 if(!ai||typeof ai.run!=='function')throw Error('Workers AI binding unavailable; no fake AI reports');
 const result=await ai.run(MODEL,{messages:buildReview(lead,evidence),max_tokens:450,temperature:0.2});
 if(typeof result?.response!=='string'||!result.response.trim())throw Error('AI review returned no text');
 return {lead,model:MODEL,report:result.response.trim()};
}
