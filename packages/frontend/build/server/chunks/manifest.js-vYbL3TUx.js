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
		client: {start:"_app/immutable/entry/start.Dkm2cgVU.js",app:"_app/immutable/entry/app.r2jg4zP3.js",imports:["_app/immutable/entry/start.Dkm2cgVU.js","_app/immutable/chunks/eF4_ngC_.js","_app/immutable/chunks/3RHX6JqA.js","_app/immutable/chunks/NUncyfbW.js","_app/immutable/chunks/Y81rXVUZ.js","_app/immutable/chunks/D7PgUhmG.js","_app/immutable/entry/app.r2jg4zP3.js","_app/immutable/chunks/U5uLDO8E.js","_app/immutable/chunks/3RHX6JqA.js","_app/immutable/chunks/Bg_LcmL0.js","_app/immutable/chunks/BsbooDs4.js","_app/immutable/chunks/D7PgUhmG.js","_app/immutable/chunks/DqKqML3T.js","_app/immutable/chunks/DXPx0FND.js","_app/immutable/chunks/BRyhJJkv.js","_app/immutable/chunks/BM_Qgp1F.js","_app/immutable/chunks/NUncyfbW.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-B10yFWkd.js')),
			__memo(() => import('./1-BYT8QfQ_.js')),
			__memo(() => import('./2-Dn_M5PZ1.js')),
			__memo(() => import('./3-BXQfU0g3.js')),
			__memo(() => import('./4-CLAgfenx.js')),
			__memo(() => import('./5-BJw6_ZoD.js')),
			__memo(() => import('./6-BOHmHg-T.js')),
			__memo(() => import('./7-BD91DsG7.js')),
			__memo(() => import('./8-CXRFfTsh.js')),
			__memo(() => import('./9-Zlm1ZS_r.js')),
			__memo(() => import('./10-CyNb_XIv.js')),
			__memo(() => import('./11-Bzy2olDF.js')),
			__memo(() => import('./12-BTyG_5Tr.js')),
			__memo(() => import('./13-DPyEFrgU.js')),
			__memo(() => import('./14-MnXRd9r8.js')),
			__memo(() => import('./15-B71GeIy6.js')),
			__memo(() => import('./16-q-1Fuc8u.js')),
			__memo(() => import('./17-we2Jf_DB.js')),
			__memo(() => import('./18-sqj9kQ8Z.js')),
			__memo(() => import('./19-CKC1lF6f.js')),
			__memo(() => import('./20-C94YF_Tt.js')),
			__memo(() => import('./21-BjfQ5dBA.js')),
			__memo(() => import('./22-D_iSQqy7.js')),
			__memo(() => import('./23-aaG5xhLn.js'))
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
				page: { layouts: [0,3,], errors: [1,,], leaf: 22 },
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
				id: "/(app)/presupuestos",
				pattern: /^\/presupuestos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/(app)/recibos",
				pattern: /^\/recibos\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/(app)/registro-rapido",
				pattern: /^\/registro-rapido\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/(app)/reportes",
				pattern: /^\/reportes\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/(app)/respaldo",
				pattern: /^\/respaldo\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(app)/suscripciones",
				pattern: /^\/suscripciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(app)/transacciones",
				pattern: /^\/transacciones\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/(app)/transferencias",
				pattern: /^\/transferencias\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
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
//# sourceMappingURL=manifest.js-vYbL3TUx.js.map
