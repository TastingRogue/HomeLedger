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
		client: {start:"_app/immutable/entry/start.BJweBA0Y.js",app:"_app/immutable/entry/app.DEoJ1Oag.js",imports:["_app/immutable/entry/start.BJweBA0Y.js","_app/immutable/chunks/XvBrpY5S.js","_app/immutable/chunks/CSbg3uGX.js","_app/immutable/chunks/B2gIgrjZ.js","_app/immutable/entry/app.DEoJ1Oag.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CSbg3uGX.js","_app/immutable/chunks/BrhsJ-la.js","_app/immutable/chunks/7Sx3nSQQ.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/zU9Z80sj.js","_app/immutable/chunks/B2gIgrjZ.js","_app/immutable/chunks/c_n8jXDC.js","_app/immutable/chunks/Bo2W8OLc.js","_app/immutable/chunks/DBetf3xE.js","_app/immutable/chunks/RQERDnAO.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-CD4QPV9P.js')),
			__memo(() => import('./1-OyrRx8sV.js')),
			__memo(() => import('./2-DI3i5ads.js')),
			__memo(() => import('./3-BbTss7yU.js')),
			__memo(() => import('./4-DrD4XLqh.js')),
			__memo(() => import('./5-B_oRTkN6.js')),
			__memo(() => import('./6-CBoHO7x-.js')),
			__memo(() => import('./7-BEiGI80_.js')),
			__memo(() => import('./8-3xZsG4LX.js')),
			__memo(() => import('./9-BSnM3iYm.js')),
			__memo(() => import('./10-Bql2xnht.js')),
			__memo(() => import('./11-B1aSyCgk.js')),
			__memo(() => import('./12-BiYCgwga.js')),
			__memo(() => import('./13-BG9ajFzW.js')),
			__memo(() => import('./14-D1fOhKiU.js')),
			__memo(() => import('./15-MwsZCq6C.js')),
			__memo(() => import('./16-DHF2w0TT.js')),
			__memo(() => import('./17-9bJv3wnY.js')),
			__memo(() => import('./18-Cs6MBg7G.js')),
			__memo(() => import('./19-COIcZViS.js')),
			__memo(() => import('./20-4j1Ljx_W.js')),
			__memo(() => import('./21-2Fhr1Kbv.js')),
			__memo(() => import('./22-RssYODRC.js')),
			__memo(() => import('./23-CV0A1geX.js')),
			__memo(() => import('./24-8S195L1A.js')),
			__memo(() => import('./25-g-Meqf3H.js')),
			__memo(() => import('./26-CYc-zcMB.js'))
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
				page: { layouts: [0,3,], errors: [1,,], leaf: 25 },
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
				id: "/(app)/prestamos",
				pattern: /^\/prestamos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/(app)/presupuestos",
				pattern: /^\/presupuestos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/(app)/recibos",
				pattern: /^\/recibos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 26 },
				endpoint: null
			},
			{
				id: "/(app)/registro-rapido",
				pattern: /^\/registro-rapido\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(app)/reglas",
				pattern: /^\/reglas\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(app)/reportes",
				pattern: /^\/reportes\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/(app)/respaldo",
				pattern: /^\/respaldo\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/(app)/suscripciones",
				pattern: /^\/suscripciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/(app)/transacciones",
				pattern: /^\/transacciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/(app)/transferencias",
				pattern: /^\/transferencias\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 24 },
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
//# sourceMappingURL=manifest.js-BsFIChl3.js.map
