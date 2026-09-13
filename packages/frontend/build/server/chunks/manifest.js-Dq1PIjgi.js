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
		client: {start:"_app/immutable/entry/start.DywobjBa.js",app:"_app/immutable/entry/app.CU-Ss43G.js",imports:["_app/immutable/entry/start.DywobjBa.js","_app/immutable/chunks/BVY0GC16.js","_app/immutable/chunks/BnPvwj35.js","_app/immutable/chunks/Dtxy3wED.js","_app/immutable/chunks/Cp_yKMn4.js","_app/immutable/chunks/DAySRaas.js","_app/immutable/entry/app.CU-Ss43G.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/BnPvwj35.js","_app/immutable/chunks/Dk2XBvnj.js","_app/immutable/chunks/D2GmUj5F.js","_app/immutable/chunks/DAySRaas.js","_app/immutable/chunks/3M5yl8Z3.js","_app/immutable/chunks/Dtxy3wED.js","_app/immutable/chunks/CwwQkM3E.js","_app/immutable/chunks/B34qhBaJ.js","_app/immutable/chunks/CrubcUYj.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-B3UrA2kB.js')),
			__memo(() => import('./1-Cyv49uUY.js')),
			__memo(() => import('./2-D0AuKiWc.js')),
			__memo(() => import('./3-DXebrkmG.js')),
			__memo(() => import('./4-afeKMlis.js')),
			__memo(() => import('./5-DKRr9iFS.js')),
			__memo(() => import('./6-Hpec6iIC.js')),
			__memo(() => import('./7-CWU_NP4u.js')),
			__memo(() => import('./8-C9pNXXgr.js')),
			__memo(() => import('./9-BgWBt21r.js')),
			__memo(() => import('./10-DBPiHRY9.js')),
			__memo(() => import('./11-Bbbs30Uo.js')),
			__memo(() => import('./12-Duxeimxq.js')),
			__memo(() => import('./13-DamEAEA_.js')),
			__memo(() => import('./14-C7jnDJRj.js')),
			__memo(() => import('./15-GgwN77cE.js')),
			__memo(() => import('./16-d7RfCahi.js')),
			__memo(() => import('./17-CvmNQNuw.js')),
			__memo(() => import('./18-CYopKJcb.js')),
			__memo(() => import('./19-DEf-5DsJ.js')),
			__memo(() => import('./20-CcWi4Fd6.js')),
			__memo(() => import('./21-wavKZMPt.js')),
			__memo(() => import('./22-CuiruFgQ.js')),
			__memo(() => import('./23-BFvLNBbJ.js')),
			__memo(() => import('./24-DTavKLSm.js'))
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
//# sourceMappingURL=manifest.js-Dq1PIjgi.js.map
