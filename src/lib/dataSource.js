// Data source layer.
//
// The dashboard reads everything from seed.json, which a scheduled Claude job
// rebuilds daily from Assembled (supply) and Redshift (demand) and commits to
// this repo. Lovable syncs the commit; the published site picks it up on the
// next deploy.
//
// To switch to runtime fetching later (e.g. if the repo goes public or the
// seed moves behind an API), replace getSeed with an async fetch and update
// App.jsx to await it.
import seed from '../data/seed.json';

export function getSeed() {
  return seed;
}
