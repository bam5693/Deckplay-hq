const {test}=require('node:test'),assert=require('node:assert/strict');
const {expectedMfaMobileSkips}=require('../../scripts/staging-result-summary.cjs');
const title='disposable collector completes real authenticator setup with a signed MFA session while moderator access stays denied';
const suite=(host='staging-mobile',name=title,body='<skipped>\n</skipped>')=>`<testsuites tests="50" skipped="1"><testsuite name="moderator-mfa-live.spec.js" hostname="${host}"><testcase name="${name}">${body}</testcase></testsuite></testsuites>`;
test('only the named mobile duplicate MFA skip is expected',()=>{assert.equal(expectedMfaMobileSkips(suite()),1);assert.equal(expectedMfaMobileSkips(suite('staging-desktop')),0);assert.equal(expectedMfaMobileSkips(suite('staging-mobile','Other security test')),0);assert.equal(expectedMfaMobileSkips(suite('staging-mobile',title,'<failure/>')),0);assert.equal(expectedMfaMobileSkips(''),0)});
test('the allowlist never hides multiple skipped cases',()=>{assert.equal(expectedMfaMobileSkips(suite()+suite()),1);assert.notEqual(2,expectedMfaMobileSkips(suite()+suite()))});
