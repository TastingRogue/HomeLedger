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
		client: {start:"_app/immutable/entry/start.qVni0XDX.js",app:"_app/immutable/entry/app.6zxvPgQz.js",imports:["_app/immutable/entry/start.qVni0XDX.js","_app/immutable/chunks/B4syh7w_.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/DyuinE6p.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/entry/app.6zxvPgQz.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/B_uYsnB3.js","_app/immutable/chunks/77HFI_Vi.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/chunks/CWPryWmu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/Dk_ziTbZ.js","_app/immutable/chunks/DgfdodRS.js","_app/immutable/chunks/BMQssNym.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-C9-Ad5wi.js')),
			__memo(() => import('./1-FPK2fXBQ.js')),
			__memo(() => import('./2-Ds2xZbpW.js')),
			__memo(() => import('./3-Bj-gF4yy.js')),
			__memo(() => import('./4-CIsucLQZ.js')),
			__memo(() => import('./5-yrMsjh2t.js')),
			__memo(() => import('./6-C8I8qsl5.js')),
			__memo(() => import('./7-Bh2w6BR7.js')),
			__memo(() => import('./8-fjcowe8f.js')),
			__memo(() => import('./9-C1N4TgmB.js')),
			__memo(() => import('./10-Caobz7kf.js')),
			__memo(() => import('./11-Bo0Y018U.js')),
			__memo(() => import('./12-lkmUjQWo.js')),
			__memo(() => import('./13-B9fnzAUp.js')),
			__memo(() => import('./14-41kPDL2J.js')),
			__memo(() => import('./15-BhLkD1lI.js')),
			__memo(() => import('./16-DNVeKShi.js')),
			__memo(() => import('./17-jUUEWmXd.js')),
			__memo(() => import('./18-DBl4Y9-B.js')),
			__memo(() => import('./19-E9UTqV2a.js')),
			__memo(() => import('./20-BzWncqcq.js')),
			__memo(() => import('./21-t3q4Kk4U.js')),
			__memo(() => import('./22-BEm8Xg7s.js')),
			__memo(() => import('./23-gAevfrA5.js')),
			__memo(() => import('./24-xcQRwLSs.js'))
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
				page: { layouts: [0,3,], errors: [1,,], leaf: 23 },
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
				id: "/(app)/patrimonio",
				pattern: /^\/patrimonio\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/(app)/presupuestos",
				pattern: /^\/presupuestos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/(app)/recibos",
				pattern: /^\/recibos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/(app)/registro-rapido",
				pattern: /^\/registro-rapido\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/(app)/reportes",
				pattern: /^\/reportes\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(app)/respaldo",
				pattern: /^\/respaldo\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(app)/suscripciones",
				pattern: /^\/suscripciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/(app)/transacciones",
				pattern: /^\/transacciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/(app)/transferencias",
				pattern: /^\/transferencias\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 22 },
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
//# sourceMappingURL=manifest.js-Dcc9Bsyy.js.map
