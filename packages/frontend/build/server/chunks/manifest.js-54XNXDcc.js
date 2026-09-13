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
		client: {start:"_app/immutable/entry/start.Xjh5k6dc.js",app:"_app/immutable/entry/app.DbCt5TqJ.js",imports:["_app/immutable/entry/start.Xjh5k6dc.js","_app/immutable/chunks/8U0usPey.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/M57GLq2w.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/entry/app.DbCt5TqJ.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/B_uYsnB3.js","_app/immutable/chunks/77HFI_Vi.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/chunks/CWPryWmu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/Dk_ziTbZ.js","_app/immutable/chunks/DgfdodRS.js","_app/immutable/chunks/BMQssNym.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-BCgdVCC0.js')),
			__memo(() => import('./1-D46sn96F.js')),
			__memo(() => import('./2-Dqly_8w9.js')),
			__memo(() => import('./3-Bj-gF4yy.js')),
			__memo(() => import('./4-CIsucLQZ.js')),
			__memo(() => import('./5-C4k6GsXm.js')),
			__memo(() => import('./6-D8N2fxT4.js')),
			__memo(() => import('./7-B3bjgxon.js')),
			__memo(() => import('./8-2WQZo9Rj.js')),
			__memo(() => import('./9-U2j_QeTV.js')),
			__memo(() => import('./10-BF791rKT.js')),
			__memo(() => import('./11-bubzFQms.js')),
			__memo(() => import('./12-DvqUEkq3.js')),
			__memo(() => import('./13-C4XvBT8h.js')),
			__memo(() => import('./14-DsCfps1s.js')),
			__memo(() => import('./15-6x2bQZhl.js')),
			__memo(() => import('./16-jeWi62ki.js')),
			__memo(() => import('./17-BwC5KPB4.js')),
			__memo(() => import('./18-B0Am8Cr-.js')),
			__memo(() => import('./19-B19zXZlx.js')),
			__memo(() => import('./20-uOQ3p2oZ.js')),
			__memo(() => import('./21-DW8Tsd2v.js')),
			__memo(() => import('./22-IKK05i4f.js')),
			__memo(() => import('./23-BVEiC79-.js')),
			__memo(() => import('./24-DyYF_IN0.js'))
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
//# sourceMappingURL=manifest.js-54XNXDcc.js.map
