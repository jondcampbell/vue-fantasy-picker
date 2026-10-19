// Local-only: the app posts a summary of its lists (my team, taken, watch list, league rosters) here,
// and the dev/preview server writes it to .local/state.json (git-ignored) so it can be read outside the browser.

import fs from 'node:fs/promises';
import path from 'node:path';

export const ROUTE = '/state-snapshot';
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Handle POST /state-snapshot with a JSON body. Returns { status, body }.
 * writeFile(json) saves the formatted snapshot.
 */
export const createSnapshotHandler = function(writeFile, now = () => new Date()) {
	return async function handle(body) {
		let snapshot;
		try {
			snapshot = JSON.parse(body);
		} catch (e) {
			return { status: 400, body: 'Body must be JSON' };
		}
		if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
			return { status: 400, body: 'Body must be a JSON object' };
		}
		await writeFile(JSON.stringify({ savedAt: now().toISOString(), ...snapshot }, null, '\t') + '\n');
		return { status: 204, body: '' };
	};
};

const readBody = req => new Promise((resolve, reject) => {
	let size = 0;
	const chunks = [];
	req.on('data', chunk => {
		size += chunk.length;
		if (size > MAX_BYTES) {
			reject(new Error('Snapshot too large'));
			req.destroy();
			return;
		}
		chunks.push(chunk);
	});
	req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
	req.on('error', reject);
});

// Vite plugin: serves the route in `pnpm dev` and `pnpm preview`
export const stateSnapshotPlugin = function(root = process.cwd()) {
	const file = path.join(root, '.local', 'state.json');
	const handle = createSnapshotHandler(async json => {
		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.writeFile(file, json);
	});
	const middleware = async (req, res, next) => {
		if (req.method !== 'POST' || req.url !== ROUTE) {
			return next();
		}
		try {
			const { status, body } = await handle(await readBody(req));
			res.writeHead(status, { 'content-type': 'text/plain' });
			res.end(body);
		} catch (error) {
			res.writeHead(500, { 'content-type': 'text/plain' });
			res.end(error.message);
		}
	};
	return {
		name: 'state-snapshot',
		configureServer(server) {
			server.middlewares.use(middleware);
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware);
		}
	};
};
