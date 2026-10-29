// Cancel older runs of this exact staging workflow before acquiring the transaction lock.
// Never cancels production deployments, other workflows, or a newer run.
(async()=>{
 if(process.env.GITHUB_REPOSITORY!=='bam5693/Deckplay-hq'||process.env.GITHUB_REF!=='refs/heads/test/staging-reporting')throw Error('Staging repository required');
 const root='https://api.github.com/repos/bam5693/Deckplay-hq';
 const headers={Authorization:'Bearer '+process.env.GH_RUN_CONTROL_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 const response=await fetch(root+'/actions/runs?branch=test%2Fstaging-reporting&per_page=50',{headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Cannot inspect previous staging runs');const data=await response.json();
 for(const run of data.workflow_runs){
  if(run.path!=='.github/workflows/private-staging.yml'||run.head_branch!=='test/staging-reporting'||BigInt(run.id)>=BigInt(process.env.GITHUB_RUN_ID)||!['queued','in_progress','pending','waiting'].includes(run.status))continue;
  const result=await fetch(root+'/actions/runs/'+run.id+'/cancel',{method:'POST',headers,signal:AbortSignal.timeout(15000)});
  if(result.status!==202&&result.status!==409)throw Error('Could not cancel superseded staging run '+run.id);
  console.log('Cancelled superseded staging run '+run.id);
 }
})().catch(()=>{console.error('Could not clear previous staging test runs. No credentials printed.');process.exitCode=1});
