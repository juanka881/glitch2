declare const BUILD_VERSION: string;
declare const BUILD_COMMIT: string;

export function getBuildVersion(): string {
	return typeof BUILD_VERSION === 'string' ? BUILD_VERSION : '0';
}

export function getBuildCommit(): string {
	return typeof BUILD_COMMIT === 'string' ? BUILD_COMMIT : 'dev';
}
