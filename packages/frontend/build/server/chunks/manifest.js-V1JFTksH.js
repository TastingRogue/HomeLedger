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
		client: {start:"_app/immutable/entry/start.Bm78AVV_.js",app:"_app/immutable/entry/app.CqQnFjNJ.js",imports:["_app/immutable/entry/start.Bm78AVV_.js","_app/immutable/chunks/K4h_Gg_i.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/entry/app.CqQnFjNJ.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/B1Kl3kr4.js","_app/immutable/chunks/CBOUQN55.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BywzsR2X.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/chunks/GmcJfYT3.js","_app/immutable/chunks/Dd1np6MK.js","_app/immutable/chunks/CsWuPvNW.js","_app/immutable/chunks/B4U2k82o.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-BIUHnNlr.js')),
			__memo(() => import('./1-Bauqmw8G.js')),
			__memo(() => import('./2-BXekWcFA.js')),
			__memo(() => import('./3-BFL4FU7N.js')),
			__memo(() => import('./4-C22nZyrL.js')),
			__memo(() => import('./5-DAcPwI72.js')),
			__memo(() => import('./6-yJN9dNqy.js')),
			__memo(() => import('./7-D6J_8A33.js')),
			__memo(() => import('./8-oPV3ezN8.js')),
			__memo(() => import('./9-DzRZXwti.js')),
			__memo(() => import('./10-D4ygcWEg.js')),
			__memo(() => import('./11-Cm1QKyZE.js')),
			__memo(() => import('./12-DMdpOPT-.js')),
			__memo(() => import('./13-DQDAiPcO.js')),
			__memo(() => import('./14-DFuygNJz.js')),
			__memo(() => import('./15-DWsONkpe.js')),
			__memo(() => import('./16-CGAp-Ql9.js')),
			__memo(() => import('./17-BMQNAJ-U.js')),
			__memo(() => import('./18-BH2Q1ORH.js')),
			__memo(() => import('./19-uajEBiJI.js')),
			__memo(() => import('./20-CX4ZpQzU.js')),
			__memo(() => import('./21-CgCnvIID.js')),
			__memo(() => import('./22-CsUEFK7u.js')),
			__memo(() => import('./23-fwbZg9vU.js')),
			__memo(() => import('./24-CO-ht4pr.js')),
			__memo(() => import('./25-DGH1o3yd.js')),
			__memo(() => import('./26-45qKsOFT.js'))
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
//# sourceMappingURL=manifest.js-V1JFTksH.js.map
