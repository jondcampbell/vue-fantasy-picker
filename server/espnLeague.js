// Local-only proxy for the private ESPN league: the browser can't attach ESPN's login cookies itself,
// so the Vite dev/preview server does. Cookies come from .env.local and never reach the browser;
// only the SWID (an account id, used to find your team) is passed back in a response header.
// One fixed route, fixed views, and a short cache so repeated clicks don't hit ESPN.

const ESPN_LEAGUE_API = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons';
const VIEWS = ['mTeam', 'mRoster', 'mSettings'];
const CACHE_MS = 60 * 1000;

export const ROUTE = '/espn-league';

export const leagueUrl = (season, leagueId) =>
	`${ESPN_LEAGUE_API}/${season}/segments/0/leagues/${leagueId}?${VIEWS.map(view => `view=${view}`).join('&')}`;

/**
 * Handle GET /espn-league?season=2027.
 * env: { ESPN_LEAGUE_ID, ESPN_S2, ESPN_SWID }. Returns { status, headers, body } (body is a string).
 */
export const createLeagueHandler = function(env, fetchImpl = (...args) => fetch(...args), now = () => Date.now()) {
	const cache = new Map();

	return async function handle(requestUrl) {
		const json = (status, data, headers = {}) => ({ status, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });

		const missing = ['ESPN_LEAGUE_ID', 'ESPN_S2', 'ESPN_SWID'].filter(name => !env[name]);
		if (missing.length > 0) {
			return json(500, { error: `Missing ${missing.join(', ')} in .env.local. Add them and restart the dev server.` });
		}
		const season = new URL(requestUrl, 'http://localhost').searchParams.get('season');
		if (!/^\d{4}$/.test(season || '')) {
			return json(400, { error: 'season must be a 4-digit year, e.g. 2027' });
		}

		const swidHeader = { 'x-espn-swid': env.ESPN_SWID };
		const cached = cache.get(season);
		if (cached && now() - cached.at < CACHE_MS) {
			return { ...cached.response, headers: { ...cached.response.headers, 'x-espn-cache': 'hit' } };
		}

		let response;
		try {
			response = await fetchImpl(leagueUrl(season, env.ESPN_LEAGUE_ID), {
				headers: { Accept: 'application/json', Cookie: `espn_s2=${env.ESPN_S2}; SWID=${env.ESPN_SWID}` }
			});
		} catch (error) {
			return json(502, { error: `Couldn't reach ESPN: ${error.message}` });
		}
		if (response.status === 401 || response.status === 403) {
			return json(401, { error: 'ESPN rejected the login cookies. They may have expired: copy fresh espn_s2 and SWID values into .env.local and restart the dev server.' });
		}
		if (response.status === 404) {
			return json(404, { error: `ESPN has no league ${env.ESPN_LEAGUE_ID} for the ${season - 1}-${String(season).slice(2)} season yet.` });
		}
		if (!response.ok) {
			return json(502, { error: `ESPN returned ${response.status}` });
		}

		const result = { status: 200, headers: { 'content-type': 'application/json', ...swidHeader }, body: await response.text() };
		cache.set(season, { at: now(), response: result });
		return result;
	};
};

// Vite plugin: serves the route in `pnpm dev` and `pnpm preview`
export const espnLeaguePlugin = function(env) {
	const handle = createLeagueHandler(env);
	const middleware = async (req, res, next) => {
		if (req.method !== 'GET' || !req.url.startsWith(ROUTE)) {
			return next();
		}
		const { status, headers, body } = await handle(req.url);
		res.writeHead(status, headers);
		res.end(body);
	};
	return {
		name: 'espn-league-proxy',
		configureServer(server) {
			server.middlewares.use(middleware);
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware);
		}
	};
};
