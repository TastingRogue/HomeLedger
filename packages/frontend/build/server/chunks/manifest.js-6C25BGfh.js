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
		client: {start:"_app/immutable/entry/start.BvI2eejM.js",app:"_app/immutable/entry/app.DHdeLFK7.js",imports:["_app/immutable/entry/start.BvI2eejM.js","_app/immutable/chunks/BWjmJEDz.js","_app/immutable/chunks/BJaGh-3h.js","_app/immutable/chunks/BjWu0oiN.js","_app/immutable/chunks/CZ-8b9I-.js","_app/immutable/chunks/DlCAZZvz.js","_app/immutable/entry/app.DHdeLFK7.js","_app/immutable/chunks/UO4PAnpL.js","_app/immutable/chunks/BJaGh-3h.js","_app/immutable/chunks/hsXu0ge5.js","_app/immutable/chunks/CIOBE-NU.js","_app/immutable/chunks/DlCAZZvz.js","_app/immutable/chunks/DukcwL12.js","_app/immutable/chunks/BjWu0oiN.js","_app/immutable/chunks/CUBKauz4.js","_app/immutable/chunks/C96OBYOI.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-CgPaqcGn.js')),
			__memo(() => import('./1-D38n4pDb.js')),
			__memo(() => import('./2-D5EQnMf4.js')),
			__memo(() => import('./3-CQspx2JQ.js')),
			__memo(() => import('./4-BUozMWA0.js')),
			__memo(() => import('./5-Bs6S1S_m.js')),
			__memo(() => import('./6-r11jG4DK.js')),
			__memo(() => import('./7-JIFAvcdC.js')),
			__memo(() => import('./8-5rvLbYw4.js')),
			__memo(() => import('./9-CWe9u0bg.js')),
			__memo(() => import('./10-BwD5zg8f.js')),
			__memo(() => import('./11-DcLT-khX.js')),
			__memo(() => import('./12-NEQ1S9-h.js')),
			__memo(() => import('./13-DdAmt6FR.js')),
			__memo(() => import('./14-CfLZ5g1m.js')),
			__memo(() => import('./15-Cx77sMTD.js')),
			__memo(() => import('./16-B3L9zu8W.js')),
			__memo(() => import('./17-BBlwCcJJ.js')),
			__memo(() => import('./18-CuKw65yn.js')),
			__memo(() => import('./19-DSj4_Gbt.js')),
			__memo(() => import('./20-DkZc0AkL.js')),
			__memo(() => import('./21-Drmd35V8.js')),
			__memo(() => import('./22-DUFELe-U.js')),
			__memo(() => import('./23-mTSHFKBc.js')),
			__memo(() => import('./24-BTvjdg_i.js'))
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
//# sourceMappingURL=manifest.js-6C25BGfh.js.map
