// Moves Checkpad to its next version: npm run release -- patch | minor | major
//
// One version for the whole product (SemVer): the root package.json holds it, and every package
// (the dashboard, the check-in site, the functions, shared) and the lockfile move with it. Both
// sites show it and send it to Sentry with every error, and the functions do too (the builds read
// it, see apps/dashboard/vite.config.ts, apps/web/astro.config.mjs, functions/src/monitoring.ts).
//
//   patch  fixes and small polish                 1.2.0 → 1.2.1
//   minor  something new for organisers or attendees  1.2.1 → 1.3.0
//   major  a change people have to relearn or redo  1.3.0 → 2.0.0
//
// It drafts the new version's CHANGELOG.md entry from the commit messages since the last tag,
// to be edited before committing, and then says what to run. It doesn't commit, tag or deploy.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();

const level = process.argv[2];
if (!['patch', 'minor', 'major'].includes(level)) {
	console.error('Which kind of release? npm run release -- patch | minor | major');
	process.exit(1);
}
if (run('git', ['status', '--porcelain'])) {
	console.error('Commit or stash your changes first, so the release is only the version and its changelog.');
	process.exit(1);
}

const current = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).version;
const [major, minor, patch] = current.split('.').map(Number);
const next = level === 'major' ? `${major + 1}.0.0` : level === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

// The root and every workspace, and the lockfile, in one go
// (errors only: npm's engine warnings would bury what to do next)
run('npm', ['version', next, '--workspaces', '--include-workspace-root', '--no-git-tag-version', '--loglevel=error']);

// What's in it: commit messages since the last version's tag, oldest first, release commits left out
const lastTag = (() => {
	try {
		return run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*']);
	} catch {
		return null;
	}
})();
const changes = run('git', ['log', '--reverse', '--format=%s', lastTag ? `${lastTag}..HEAD` : 'HEAD'])
	.split('\n')
	.filter((line) => line && !/^Release \d+\.\d+\.\d+$/.test(line));

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
const entry = `## ${next} (${today})\n\n${changes.map((line) => `- ${line}`).join('\n') || '- (nothing since the last version)'}\n`;
const changelog = readFileSync(new URL('CHANGELOG.md', root), 'utf8');
const [head, ...rest] = changelog.split(/\n(?=## )/);
writeFileSync(new URL('CHANGELOG.md', root), [head.trimEnd(), entry, ...rest].join('\n\n').replace(/\n{3,}/g, '\n\n'));

console.log(`
${current} → ${next}${lastTag ? `, ${changes.length} commits since ${lastTag}` : ''}.

1. Tidy the new entry at the top of CHANGELOG.md: merge, reword or drop lines as you like.
2. Commit and tag it:
     git commit -am "Release ${next}"
     git tag -a v${next} -m "Release ${next}"
3. Deploy, so what's live is ${next}:
     npx -y firebase-tools@latest deploy --only functions,hosting --project checkpad-app
4. Push the commit and its tag together (annotated, so --follow-tags sends it):
     git push --follow-tags
`);
