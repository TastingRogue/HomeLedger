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
		client: {start:"_app/immutable/entry/start.BzifJcPp.js",app:"_app/immutable/entry/app.BZ9axawU.js",imports:["_app/immutable/entry/start.BzifJcPp.js","_app/immutable/chunks/Tno6ARpe.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/entry/app.BZ9axawU.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CLjLkMds.js","_app/immutable/chunks/B1Kl3kr4.js","_app/immutable/chunks/CBOUQN55.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BywzsR2X.js","_app/immutable/chunks/BhjAh3jO.js","_app/immutable/chunks/GmcJfYT3.js","_app/immutable/chunks/Dd1np6MK.js","_app/immutable/chunks/CsWuPvNW.js","_app/immutable/chunks/B4U2k82o.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-WxSLJPRe.js')),
			__memo(() => import('./1-C0mdoAQb.js')),
			__memo(() => import('./2-C5xQkRAt.js')),
			__memo(() => import('./3-CrhfAcGl.js')),
			__memo(() => import('./4-BK1WOuYX.js')),
			__memo(() => import('./5-Bi6LCHdU.js')),
			__memo(() => import('./6-BoIWYvrl.js')),
			__memo(() => import('./7-B7HFqITa.js')),
			__memo(() => import('./8-BVnAr7Ko.js')),
			__memo(() => import('./9-DbWpdVUE.js')),
			__memo(() => import('./10-D0zTF2L3.js')),
			__memo(() => import('./11-C7aVtbBU.js')),
			__memo(() => import('./12-CIQFqj1u.js')),
			__memo(() => import('./13-B0mq3cp1.js')),
			__memo(() => import('./14-B-2M56OR.js')),
			__memo(() => import('./15-BzHMfKsj.js')),
			__memo(() => import('./16-Di83dC3U.js')),
			__memo(() => import('./17-DV0RDv0i.js')),
			__memo(() => import('./18-CcjPtgGu.js')),
			__memo(() => import('./19-BQI5p54V.js')),
			__memo(() => import('./20-kHphpbWO.js')),
			__memo(() => import('./21-QxLMYgY5.js')),
			__memo(() => import('./22-BrWq0WDb.js')),
			__memo(() => import('./23-D-LO5QnV.js')),
			__memo(() => import('./24-CQNdjI69.js')),
			__memo(() => import('./25-Cb8wxYwa.js')),
			__memo(() => import('./26-CdDt_-Nd.js'))
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
//# sourceMappingURL=manifest.js-BpAV3haW.js.map
