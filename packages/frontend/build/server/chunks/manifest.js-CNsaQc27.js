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
		client: {start:"_app/immutable/entry/start.CXAkMdG8.js",app:"_app/immutable/entry/app.W2ACm0sl.js",imports:["_app/immutable/entry/start.CXAkMdG8.js","_app/immutable/chunks/C5MV0WXE.js","_app/immutable/chunks/Dtv2tq0X.js","_app/immutable/chunks/MxTfdiDK.js","_app/immutable/chunks/CbX2-xZ0.js","_app/immutable/chunks/BiUix4gy.js","_app/immutable/entry/app.W2ACm0sl.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/Dtv2tq0X.js","_app/immutable/chunks/B5dj9aeq.js","_app/immutable/chunks/pBoUOFxT.js","_app/immutable/chunks/BiUix4gy.js","_app/immutable/chunks/1bIlVLOt.js","_app/immutable/chunks/Bki7R22e.js","_app/immutable/chunks/BoI3PumM.js","_app/immutable/chunks/4TrHahNV.js","_app/immutable/chunks/gOLrO-cZ.js","_app/immutable/chunks/MxTfdiDK.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-C_s8tCJh.js')),
			__memo(() => import('./1-BBFAVG-M.js')),
			__memo(() => import('./2-CaFoBv2-.js')),
			__memo(() => import('./3-D3gYRmZF.js')),
			__memo(() => import('./4-Btas3K3s.js')),
			__memo(() => import('./5-4kCMpStc.js')),
			__memo(() => import('./6-C4NX446v.js')),
			__memo(() => import('./7-Cf17_iMn.js')),
			__memo(() => import('./8-D_PRV5cZ.js')),
			__memo(() => import('./9-CNpYJi9S.js')),
			__memo(() => import('./10-BZ9bYo98.js')),
			__memo(() => import('./11-ivjZnHQc.js')),
			__memo(() => import('./12-C8itNvdp.js')),
			__memo(() => import('./13-DEPZkWeu.js')),
			__memo(() => import('./14-C1gEKqwG.js')),
			__memo(() => import('./15-DaAjWWK3.js')),
			__memo(() => import('./16-C9BG2yc4.js')),
			__memo(() => import('./17-BhTSChbH.js')),
			__memo(() => import('./18-Csp5K-0b.js')),
			__memo(() => import('./19-DSEj6NPu.js')),
			__memo(() => import('./20-BHmWquLr.js')),
			__memo(() => import('./21-b3aqyR6d.js')),
			__memo(() => import('./22-DvEcRjf0.js')),
			__memo(() => import('./23-CSQmIJo0.js'))
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
//# sourceMappingURL=manifest.js-CNsaQc27.js.map
