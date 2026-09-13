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
		client: {start:"_app/immutable/entry/start.CLPY3okk.js",app:"_app/immutable/entry/app.CIssbxpe.js",imports:["_app/immutable/entry/start.CLPY3okk.js","_app/immutable/chunks/BDER4wWl.js","_app/immutable/chunks/pnNFi0m6.js","_app/immutable/chunks/B2PhzMRV.js","_app/immutable/entry/app.CIssbxpe.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/pnNFi0m6.js","_app/immutable/chunks/Dtl3SOpz.js","_app/immutable/chunks/BIyGH3KA.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/CBA4BUWF.js","_app/immutable/chunks/B2PhzMRV.js","_app/immutable/chunks/CuBSh5zO.js","_app/immutable/chunks/V4g_GhX9.js","_app/immutable/chunks/C6StLxs3.js","_app/immutable/chunks/CidbFk-K.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-DNHSxxws.js')),
			__memo(() => import('./1-Cgoi4f7c.js')),
			__memo(() => import('./2-C2568zi7.js')),
			__memo(() => import('./3-DfO2R5JP.js')),
			__memo(() => import('./4-GIpEUSK_.js')),
			__memo(() => import('./5-DDutMKNc.js')),
			__memo(() => import('./6-DLWEr_Dm.js')),
			__memo(() => import('./7-mn-kSxoX.js')),
			__memo(() => import('./8-C_Vjxsvd.js')),
			__memo(() => import('./9-BjuCeX-S.js')),
			__memo(() => import('./10-Cbq2fBzp.js')),
			__memo(() => import('./11-CGOIyY8V.js')),
			__memo(() => import('./12-OEkIIVHR.js')),
			__memo(() => import('./13-D90c3r-j.js')),
			__memo(() => import('./14-auHLhrW3.js')),
			__memo(() => import('./15-B8LFtJrR.js')),
			__memo(() => import('./16-Br6oE-ix.js')),
			__memo(() => import('./17-CL6NU-KQ.js')),
			__memo(() => import('./18-CHYjXXl5.js')),
			__memo(() => import('./19-CrO0NPwE.js')),
			__memo(() => import('./20-DVsMsm7a.js')),
			__memo(() => import('./21-BUnxLFt-.js')),
			__memo(() => import('./22-DREFtEOU.js')),
			__memo(() => import('./23-BY3FBa8e.js')),
			__memo(() => import('./24-1Q_3_dEL.js')),
			__memo(() => import('./25-Vm4rhImA.js'))
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
				page: { layouts: [0,3,], errors: [1,,], leaf: 24 },
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
				page: { layouts: [0,4,], errors: [1,,], leaf: 25 },
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
				id: "/(app)/reglas",
				pattern: /^\/reglas\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(app)/reportes",
				pattern: /^\/reportes\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(app)/respaldo",
				pattern: /^\/respaldo\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/(app)/suscripciones",
				pattern: /^\/suscripciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/(app)/transacciones",
				pattern: /^\/transacciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/(app)/transferencias",
				pattern: /^\/transferencias\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 23 },
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
//# sourceMappingURL=manifest.js-KVH9_IO3.js.map
