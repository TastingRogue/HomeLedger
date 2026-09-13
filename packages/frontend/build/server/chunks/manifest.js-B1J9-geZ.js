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
		client: {start:"_app/immutable/entry/start.Y3uscX3h.js",app:"_app/immutable/entry/app.3sVqWrD_.js",imports:["_app/immutable/entry/start.Y3uscX3h.js","_app/immutable/chunks/BBlUyqW4.js","_app/immutable/chunks/DbcQfYEm.js","_app/immutable/chunks/BSZIZ7Mx.js","_app/immutable/entry/app.3sVqWrD_.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/DbcQfYEm.js","_app/immutable/chunks/BzDKCW6e.js","_app/immutable/chunks/DcSikBaW.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BejIj5UP.js","_app/immutable/chunks/BSZIZ7Mx.js","_app/immutable/chunks/CJ_ma-EI.js","_app/immutable/chunks/CIXJUIaI.js","_app/immutable/chunks/BQKSlI-7.js","_app/immutable/chunks/C83lkV1K.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-CNBariuA.js')),
			__memo(() => import('./1-DcLN9028.js')),
			__memo(() => import('./2-BZKhfA8U.js')),
			__memo(() => import('./3-BxfrumgF.js')),
			__memo(() => import('./4-ChnwnGaw.js')),
			__memo(() => import('./5-CJeFHtPC.js')),
			__memo(() => import('./6-DGywxZi8.js')),
			__memo(() => import('./7-DiweflHm.js')),
			__memo(() => import('./8-CvW82Dd7.js')),
			__memo(() => import('./9-CPrtjsiL.js')),
			__memo(() => import('./10-CbLpXL8W.js')),
			__memo(() => import('./11-BFHC7mhM.js')),
			__memo(() => import('./12-BWMc7jMH.js')),
			__memo(() => import('./13-CcrBQR4F.js')),
			__memo(() => import('./14-D6lupHH_.js')),
			__memo(() => import('./15-OnawCAeq.js')),
			__memo(() => import('./16-CXBh3AKB.js')),
			__memo(() => import('./17-GjZdrhC5.js')),
			__memo(() => import('./18-Bu6Zxvuw.js')),
			__memo(() => import('./19-D0M6dBYL.js')),
			__memo(() => import('./20-Cv9iZyxV.js')),
			__memo(() => import('./21-msSTAopi.js')),
			__memo(() => import('./22-BImmKD4U.js')),
			__memo(() => import('./23-DMelrl0y.js')),
			__memo(() => import('./24-Btg5jADN.js'))
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
//# sourceMappingURL=manifest.js-B1J9-geZ.js.map
