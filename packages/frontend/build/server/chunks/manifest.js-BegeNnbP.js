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
		client: {start:"_app/immutable/entry/start.B5Mdefnh.js",app:"_app/immutable/entry/app.CaqdXeiU.js",imports:["_app/immutable/entry/start.B5Mdefnh.js","_app/immutable/chunks/JrD2-0Qe.js","_app/immutable/chunks/Dhcruou8.js","_app/immutable/chunks/CeHbSIxt.js","_app/immutable/chunks/C1tZ3oay.js","_app/immutable/chunks/Dl_Jd8A-.js","_app/immutable/entry/app.CaqdXeiU.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/Dhcruou8.js","_app/immutable/chunks/BcJSyWyd.js","_app/immutable/chunks/BJUDm4Ti.js","_app/immutable/chunks/Dl_Jd8A-.js","_app/immutable/chunks/BM71gQhJ.js","_app/immutable/chunks/CeHbSIxt.js","_app/immutable/chunks/C_qr-SCw.js","_app/immutable/chunks/DYS0CZta.js","_app/immutable/chunks/8HgQ5JT3.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-BiOxjRb6.js')),
			__memo(() => import('./1-D_mzSaGD.js')),
			__memo(() => import('./2-ChM3T1pf.js')),
			__memo(() => import('./3-ByMYZC0z.js')),
			__memo(() => import('./4-COeE51Xo.js')),
			__memo(() => import('./5-BWlCqsF9.js')),
			__memo(() => import('./6-B-ZiyWHj.js')),
			__memo(() => import('./7-PSEFgopb.js')),
			__memo(() => import('./8-DQ17OBbE.js')),
			__memo(() => import('./9-CU17gD5K.js')),
			__memo(() => import('./10-EEXdk6ol.js')),
			__memo(() => import('./11-dovrFhb8.js')),
			__memo(() => import('./12-BxhTgpCS.js')),
			__memo(() => import('./13-C9UQi8Qs.js')),
			__memo(() => import('./14-CqvYH2zV.js')),
			__memo(() => import('./15-BOQ5NYUt.js')),
			__memo(() => import('./16-wPRosjxk.js')),
			__memo(() => import('./17-D2zNJVUC.js')),
			__memo(() => import('./18-B9ttArH7.js')),
			__memo(() => import('./19-B7ZaUxvi.js')),
			__memo(() => import('./20-c_cpFXjj.js')),
			__memo(() => import('./21-DI9-c8Lc.js')),
			__memo(() => import('./22-D8vHBwyL.js')),
			__memo(() => import('./23-DGtmPG0p.js')),
			__memo(() => import('./24-Lck9PYKz.js')),
			__memo(() => import('./25-CnIUT7-d.js')),
			__memo(() => import('./26-C3AMPtGh.js'))
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
//# sourceMappingURL=manifest.js-BegeNnbP.js.map
