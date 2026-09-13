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
		client: {start:"_app/immutable/entry/start.BZ6QUK3z.js",app:"_app/immutable/entry/app.wLu2I8pQ.js",imports:["_app/immutable/entry/start.BZ6QUK3z.js","_app/immutable/chunks/DUPgJstY.js","_app/immutable/chunks/DbcQfYEm.js","_app/immutable/chunks/BSZIZ7Mx.js","_app/immutable/entry/app.wLu2I8pQ.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/DbcQfYEm.js","_app/immutable/chunks/BzDKCW6e.js","_app/immutable/chunks/DcSikBaW.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BejIj5UP.js","_app/immutable/chunks/BSZIZ7Mx.js","_app/immutable/chunks/CJ_ma-EI.js","_app/immutable/chunks/CIXJUIaI.js","_app/immutable/chunks/BQKSlI-7.js","_app/immutable/chunks/C83lkV1K.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-DMrpdCzg.js')),
			__memo(() => import('./1-CYP_z0fL.js')),
			__memo(() => import('./2-BCQCCmdE.js')),
			__memo(() => import('./3-CBECH-Ow.js')),
			__memo(() => import('./4-ma4MYZmh.js')),
			__memo(() => import('./5-Dulp4Wem.js')),
			__memo(() => import('./6--ImpuJoh.js')),
			__memo(() => import('./7-YgHtKpTT.js')),
			__memo(() => import('./8-C1mQ4B_q.js')),
			__memo(() => import('./9-CYw8CCQo.js')),
			__memo(() => import('./10-DZf1V6c3.js')),
			__memo(() => import('./11-B_DKFLl-.js')),
			__memo(() => import('./12-DKDebRsI.js')),
			__memo(() => import('./13-59_VCyAF.js')),
			__memo(() => import('./14-DwfYg1KJ.js')),
			__memo(() => import('./15-DrrYzSUT.js')),
			__memo(() => import('./16-yeAfkVu3.js')),
			__memo(() => import('./17-Byqgol6B.js')),
			__memo(() => import('./18-CHZ_IZQa.js')),
			__memo(() => import('./19-CbmfwKw9.js')),
			__memo(() => import('./20-CVDQyyH_.js')),
			__memo(() => import('./21-ByKE0HyE.js')),
			__memo(() => import('./22-af7lQepD.js')),
			__memo(() => import('./23-CZ55Raa4.js')),
			__memo(() => import('./24-B0MtaGgZ.js'))
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
//# sourceMappingURL=manifest.js-RppZ4S1z.js.map
