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
		client: {start:"_app/immutable/entry/start.BcsiQVaE.js",app:"_app/immutable/entry/app.BS-OCler.js",imports:["_app/immutable/entry/start.BcsiQVaE.js","_app/immutable/chunks/CVHRbmcu.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/entry/app.BS-OCler.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/B1Kl3kr4.js","_app/immutable/chunks/CBOUQN55.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BywzsR2X.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/chunks/GmcJfYT3.js","_app/immutable/chunks/Dd1np6MK.js","_app/immutable/chunks/CsWuPvNW.js","_app/immutable/chunks/B4U2k82o.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-C07uhTF7.js')),
			__memo(() => import('./1-Dgmjt20Z.js')),
			__memo(() => import('./2-D4h0DzIM.js')),
			__memo(() => import('./3-C4kOVVoa.js')),
			__memo(() => import('./4-IAWYh8zn.js')),
			__memo(() => import('./5-JuQiJbiD.js')),
			__memo(() => import('./6-BS9174k4.js')),
			__memo(() => import('./7-Rhmlp_GO.js')),
			__memo(() => import('./8-D-3bZ01W.js')),
			__memo(() => import('./9-BT2D8vP-.js')),
			__memo(() => import('./10-BktrUr7c.js')),
			__memo(() => import('./11-D2OzUqi3.js')),
			__memo(() => import('./12-Dr7RTgBL.js')),
			__memo(() => import('./13-CP9EWgnb.js')),
			__memo(() => import('./14-B586d-Fr.js')),
			__memo(() => import('./15-CBBwAJR2.js')),
			__memo(() => import('./16--Gbf2hh5.js')),
			__memo(() => import('./17-DaXmDKQw.js')),
			__memo(() => import('./18-DbEwOa1F.js')),
			__memo(() => import('./19-BCZv4uXg.js')),
			__memo(() => import('./20-D7WJQ6ix.js')),
			__memo(() => import('./21-BaA7eXNA.js')),
			__memo(() => import('./22-D9HDO45z.js')),
			__memo(() => import('./23-CznfKBS_.js')),
			__memo(() => import('./24-DVSkv742.js')),
			__memo(() => import('./25-BHAlLqpu.js')),
			__memo(() => import('./26-BpWdxJfh.js'))
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
//# sourceMappingURL=manifest.js-ttJ-lzkl.js.map
