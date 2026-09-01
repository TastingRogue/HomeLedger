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
		client: {start:"_app/immutable/entry/start.BLHBgx9T.js",app:"_app/immutable/entry/app.C_SZILhy.js",imports:["_app/immutable/entry/start.BLHBgx9T.js","_app/immutable/chunks/DkuS-r_I.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/CE9QMwI0.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/entry/app.C_SZILhy.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/B_uYsnB3.js","_app/immutable/chunks/77HFI_Vi.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/chunks/CWPryWmu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/Dk_ziTbZ.js","_app/immutable/chunks/DgfdodRS.js","_app/immutable/chunks/BMQssNym.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-C2B8ZKlG.js')),
			__memo(() => import('./1-DbxdRrIa.js')),
			__memo(() => import('./2-D4M8beWN.js')),
			__memo(() => import('./3-Bj-gF4yy.js')),
			__memo(() => import('./4-CIsucLQZ.js')),
			__memo(() => import('./5-Co5SqVcL.js')),
			__memo(() => import('./6-LZRZLzMK.js')),
			__memo(() => import('./7-ASDT08Gw.js')),
			__memo(() => import('./8-CsQQKJdj.js')),
			__memo(() => import('./9-D3oPhKrC.js')),
			__memo(() => import('./10-C97eXp3j.js')),
			__memo(() => import('./11-BJtH646v.js')),
			__memo(() => import('./12-CTS5XckJ.js')),
			__memo(() => import('./13-D-hg0048.js')),
			__memo(() => import('./14-BgSAIQZ1.js')),
			__memo(() => import('./15-Dr7ZhOep.js')),
			__memo(() => import('./16-YKG8tD0w.js')),
			__memo(() => import('./17-Bo9NeNcS.js')),
			__memo(() => import('./18-56f2dKHO.js')),
			__memo(() => import('./19-CmrSxQXE.js')),
			__memo(() => import('./20-Ck1RJZKl.js')),
			__memo(() => import('./21-LMpYF_gX.js')),
			__memo(() => import('./22-x2akWG_i.js')),
			__memo(() => import('./23-LeTma-VA.js')),
			__memo(() => import('./24-DLXkjSuT.js'))
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
//# sourceMappingURL=manifest.js-CNchMses.js.map
