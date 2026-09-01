const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","manifest.json","service-worker.js"]),
	mimeTypes: {".png":"image/png",".json":"application/json"},
	_: {
		client: {start:"_app/immutable/entry/start.OR_w_iyu.js",app:"_app/immutable/entry/app.BwWuLykf.js",imports:["_app/immutable/entry/start.OR_w_iyu.js","_app/immutable/chunks/BOw3uO3K.js","_app/immutable/chunks/3RHX6JqA.js","_app/immutable/chunks/NUncyfbW.js","_app/immutable/chunks/C7POXgOQ.js","_app/immutable/chunks/D7PgUhmG.js","_app/immutable/entry/app.BwWuLykf.js","_app/immutable/chunks/U5uLDO8E.js","_app/immutable/chunks/3RHX6JqA.js","_app/immutable/chunks/Bg_LcmL0.js","_app/immutable/chunks/BsbooDs4.js","_app/immutable/chunks/D7PgUhmG.js","_app/immutable/chunks/DqKqML3T.js","_app/immutable/chunks/DXPx0FND.js","_app/immutable/chunks/BRyhJJkv.js","_app/immutable/chunks/BM_Qgp1F.js","_app/immutable/chunks/NUncyfbW.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-DKkfgisv.js')),
			__memo(() => import('./1-DG3nwOyE.js')),
			__memo(() => import('./2-BuvXoM8s.js')),
			__memo(() => import('./3-BXQfU0g3.js')),
			__memo(() => import('./4-CLAgfenx.js')),
			__memo(() => import('./5-l2xq4nae.js')),
			__memo(() => import('./6-jJQuMHRI.js')),
			__memo(() => import('./7-D3Z7p0xR.js')),
			__memo(() => import('./8-DcDIct8m.js')),
			__memo(() => import('./9-B4RC2h6Y.js')),
			__memo(() => import('./10-CiCLqkI9.js')),
			__memo(() => import('./11-DJ3tUuFh.js')),
			__memo(() => import('./12-BkWKQGLA.js')),
			__memo(() => import('./13-BdFUTBzO.js')),
			__memo(() => import('./14-DsJNQiq5.js')),
			__memo(() => import('./15-mNZv348R.js')),
			__memo(() => import('./16-CNSNU-QY.js')),
			__memo(() => import('./17-Dnm_P0RZ.js')),
			__memo(() => import('./18-D51jKY-3.js')),
			__memo(() => import('./19-CjpPOm87.js')),
			__memo(() => import('./20-BZCppC5R.js')),
			__memo(() => import('./21-DYdFPFLL.js')),
			__memo(() => import('./22-B1NRH8ae.js')),
			__memo(() => import('./23-rLe1iW1V.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/alertas",
				pattern: /^\/alertas\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/calendario",
				pattern: /^\/calendario\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(app)/categorias",
				pattern: /^\/categorias\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(app)/configuracion",
				pattern: /^\/configuracion\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(app)/cuentas",
				pattern: /^\/cuentas\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/(app)/importar",
				pattern: /^\/importar\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/(app)/metas",
				pattern: /^\/metas\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/(app)/presupuestos",
				pattern: /^\/presupuestos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/(app)/recibos",
				pattern: /^\/recibos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/(app)/registro-rapido",
				pattern: /^\/registro-rapido\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/(app)/reportes",
				pattern: /^\/reportes\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/(app)/respaldo",
				pattern: /^\/respaldo\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(app)/suscripciones",
				pattern: /^\/suscripciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(app)/transacciones",
				pattern: /^\/transacciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/(app)/transferencias",
				pattern: /^\/transferencias\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export { manifest as m };
//# sourceMappingURL=manifest.js-BaXbPQRZ.js.map
