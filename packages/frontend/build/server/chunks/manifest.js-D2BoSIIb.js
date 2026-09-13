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
		client: {start:"_app/immutable/entry/start.BH80J9t-.js",app:"_app/immutable/entry/app.CfZAEXmc.js",imports:["_app/immutable/entry/start.BH80J9t-.js","_app/immutable/chunks/BqK1N63b.js","_app/immutable/chunks/CtFg-CuC.js","_app/immutable/chunks/CYIa-GvR.js","_app/immutable/entry/app.CfZAEXmc.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CtFg-CuC.js","_app/immutable/chunks/D6SGA0DW.js","_app/immutable/chunks/CCC-RRgI.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BgW8n8zj.js","_app/immutable/chunks/CYIa-GvR.js","_app/immutable/chunks/DkbkSKNp.js","_app/immutable/chunks/C0URif5T.js","_app/immutable/chunks/0BIyhPBJ.js","_app/immutable/chunks/DVkPCXg2.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-DNIbpYNk.js')),
			__memo(() => import('./1-6m0wM4Fd.js')),
			__memo(() => import('./2-TJ-am5sx.js')),
			__memo(() => import('./3-DreCRPab.js')),
			__memo(() => import('./4-Cc793h7u.js')),
			__memo(() => import('./5-DY9-pyXi.js')),
			__memo(() => import('./6-BJ8DiqGp.js')),
			__memo(() => import('./7-BTX77pIk.js')),
			__memo(() => import('./8-BVcZz-Kr.js')),
			__memo(() => import('./9-BxA70f0y.js')),
			__memo(() => import('./10-DcL3gBM4.js')),
			__memo(() => import('./11-B90YvpzY.js')),
			__memo(() => import('./12-CBBDqGva.js')),
			__memo(() => import('./13-CvIH4i4P.js')),
			__memo(() => import('./14-qdta86y9.js')),
			__memo(() => import('./15-CdD8b52T.js')),
			__memo(() => import('./16-CdS3hIAN.js')),
			__memo(() => import('./17-DYQW_uUN.js')),
			__memo(() => import('./18-B0Rim9u7.js')),
			__memo(() => import('./19-DwLKC7gA.js')),
			__memo(() => import('./20-BTlfUdUN.js')),
			__memo(() => import('./21-wC8f5Oie.js')),
			__memo(() => import('./22-CG9EfoRR.js')),
			__memo(() => import('./23-cMN-q6ZA.js')),
			__memo(() => import('./24-fsYbNNUq.js')),
			__memo(() => import('./25-DLYD5Xli.js')),
			__memo(() => import('./26-BgS_L2Z4.js'))
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
//# sourceMappingURL=manifest.js-D2BoSIIb.js.map
