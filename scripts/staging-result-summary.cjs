// Only the explicitly duplicated mobile MFA journey may be skipped.
const mfaTitle='disposable collector completes real authenticator setup with a signed MFA session while moderator access stays denied';
function expectedMfaMobileSkips(xml){
 let allowed=0;
 for(const suite of xml.matchAll(/<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g)){
  if(!/\bhostname="staging-mobile"/.test(suite[1])||!/\bname="moderator-mfa-live\.spec\.js"/.test(suite[1]))continue;
  for(const testcase of suite[2].matchAll(/<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g)){
   if(testcase[1].includes('name="'+mfaTitle+'"')&&/<skipped(?:\s*\/>|>\s*<\/skipped>)/.test(testcase[2]))allowed++;
  }
 }
 return Math.min(allowed,1);
}
module.exports={expectedMfaMobileSkips};
