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
		client: {start:"_app/immutable/entry/start.B0c-DPKH.js",app:"_app/immutable/entry/app.BFhZPpe7.js",imports:["_app/immutable/entry/start.B0c-DPKH.js","_app/immutable/chunks/CmJQsKdS.js","_app/immutable/chunks/DL-bFAjm.js","_app/immutable/chunks/BVLcRTIc.js","_app/immutable/chunks/DfHdSK79.js","_app/immutable/chunks/MXJBaBR-.js","_app/immutable/entry/app.BFhZPpe7.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/DL-bFAjm.js","_app/immutable/chunks/BvQ-_dmC.js","_app/immutable/chunks/DuqAtCx3.js","_app/immutable/chunks/MXJBaBR-.js","_app/immutable/chunks/DijbNBgN.js","_app/immutable/chunks/BVLcRTIc.js","_app/immutable/chunks/BFyylhx1.js","_app/immutable/chunks/Ceo5s92v.js","_app/immutable/chunks/CK4LIQ0y.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-B_7LFEUM.js')),
			__memo(() => import('./1-DFHqxUb_.js')),
			__memo(() => import('./2-CJLoqxWl.js')),
			__memo(() => import('./3-Cksw-DZ2.js')),
			__memo(() => import('./4-Kxer4eu6.js')),
			__memo(() => import('./5-DglzyuMg.js')),
			__memo(() => import('./6-CO-RNlai.js')),
			__memo(() => import('./7-CAPOf7IQ.js')),
			__memo(() => import('./8-CRZoajcF.js')),
			__memo(() => import('./9-B73u9YqM.js')),
			__memo(() => import('./10-BsGiYpgK.js')),
			__memo(() => import('./11-DLIizPvi.js')),
			__memo(() => import('./12-Bjurh755.js')),
			__memo(() => import('./13-CaM5cPVt.js')),
			__memo(() => import('./14-BuYChLEj.js')),
			__memo(() => import('./15-DD0zSURB.js')),
			__memo(() => import('./16-B36JUyaN.js')),
			__memo(() => import('./17-B7-FrOq7.js')),
			__memo(() => import('./18-DZLCiBWa.js')),
			__memo(() => import('./19-xHc3RGxa.js')),
			__memo(() => import('./20-IF_4q3Ao.js')),
			__memo(() => import('./21-B5dBJmTM.js')),
			__memo(() => import('./22-DXxl01cR.js')),
			__memo(() => import('./23-DWmBp68n.js')),
			__memo(() => import('./24-DhEdYB3T.js'))
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
//# sourceMappingURL=manifest.js-B8GbjHgn.js.map
