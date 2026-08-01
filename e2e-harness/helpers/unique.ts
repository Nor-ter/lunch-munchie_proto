/** Test-owned identifiers are unique across parallel/repeated shared-environment runs. */
const run = `${process.env.GITHUB_RUN_ID ?? process.env.BUILD_BUILDNUMBER ?? Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  .replace(/[^a-z0-9]/gi, '').toLowerCase();
let sequence = 0;

export function uniqueName(scope: string): string {
  sequence += 1;
  return `e2e_${scope.replace(/[^a-z0-9]/gi, '').toLowerCase()}_${run}_${sequence}`;
}
