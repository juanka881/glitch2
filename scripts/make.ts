function getGitCommit() {
	try {
		const result = Bun.spawnSync(['git', 'rev-parse', '--short=12', 'HEAD'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});

		if (result.exitCode !== 0) {
			return 'dev';
		}

		const commit = new TextDecoder().decode(result.stdout).trim();
		return commit.length > 0 ? commit : 'dev';
	} catch {
		return 'dev';
	}
}

const entrypoint = Bun.argv[2];
const outfile = Bun.argv[3];

if (!entrypoint || !outfile) {
	throw new Error('Usage: bun run scripts/make.ts <entrypoint> <outfile>');
}

const packageJson = await Bun.file('./package.json').json();
const buildVersion =
	packageJson && typeof packageJson === 'object' && 'version' in packageJson && typeof packageJson.version === 'string'
		? packageJson.version
		: '0';

const gitCommit = getGitCommit();

const result = await Bun.build({
	entrypoints: [entrypoint],
	compile: {
		outfile,
	},
	define: {
		BUILD_VERSION: JSON.stringify(buildVersion),
		BUILD_COMMIT: JSON.stringify(gitCommit),
	},
});

for (const log of result.logs) {
	console.error(log);
}

if (!result.success) {
	process.exit(1);
}

console.log(`Build successful: ${outfile}`);
