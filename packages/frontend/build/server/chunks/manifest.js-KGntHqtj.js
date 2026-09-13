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
		client: {start:"_app/immutable/entry/start.DUyIUrV4.js",app:"_app/immutable/entry/app.9oI7xT1J.js",imports:["_app/immutable/entry/start.DUyIUrV4.js","_app/immutable/chunks/CEtBJcae.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/entry/app.9oI7xT1J.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/B1Kl3kr4.js","_app/immutable/chunks/CBOUQN55.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BywzsR2X.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/chunks/GmcJfYT3.js","_app/immutable/chunks/Dd1np6MK.js","_app/immutable/chunks/CsWuPvNW.js","_app/immutable/chunks/B4U2k82o.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-Js3ZRTI-.js')),
			__memo(() => import('./1-Dw1X472N.js')),
			__memo(() => import('./2-CIapVhgD.js')),
			__memo(() => import('./3-DQESa8tc.js')),
			__memo(() => import('./4-3gadsiXS.js')),
			__memo(() => import('./5-DT70KgQw.js')),
			__memo(() => import('./6-7dPe0BpP.js')),
			__memo(() => import('./7-DJlqIsR4.js')),
			__memo(() => import('./8-CGGf3EPD.js')),
			__memo(() => import('./9-Bq0zuVF-.js')),
			__memo(() => import('./10-Y90G_LyU.js')),
			__memo(() => import('./11-ByUOdFoy.js')),
			__memo(() => import('./12-l2b57lyi.js')),
			__memo(() => import('./13-GC6CQeKq.js')),
			__memo(() => import('./14-CHkQXi2C.js')),
			__memo(() => import('./15-BorTmdPg.js')),
			__memo(() => import('./16-Co8JDjYP.js')),
			__memo(() => import('./17-B5LDiYci.js')),
			__memo(() => import('./18-C24yFokq.js')),
			__memo(() => import('./19-BJC897LK.js')),
			__memo(() => import('./20-BosowdBx.js')),
			__memo(() => import('./21-Wtc3tkqB.js')),
			__memo(() => import('./22-CZ_JtyGj.js')),
			__memo(() => import('./23-CktG6X9f.js')),
			__memo(() => import('./24-BBImL8Gw.js')),
			__memo(() => import('./25-DKiY4HNc.js')),
			__memo(() => import('./26-TJoeNOXh.js'))
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
//# sourceMappingURL=manifest.js-KGntHqtj.js.map
