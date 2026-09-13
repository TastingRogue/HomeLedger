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
		client: {start:"_app/immutable/entry/start.CCE84CXt.js",app:"_app/immutable/entry/app.DTYNb9Vb.js",imports:["_app/immutable/entry/start.CCE84CXt.js","_app/immutable/chunks/CcxCzNHU.js","_app/immutable/chunks/ByIiucXd.js","_app/immutable/chunks/DHyv_Okd.js","_app/immutable/chunks/C9pcnDXT.js","_app/immutable/chunks/D2ePOI5C.js","_app/immutable/entry/app.DTYNb9Vb.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/ByIiucXd.js","_app/immutable/chunks/Dzdfy3Ra.js","_app/immutable/chunks/Vcurar1Q.js","_app/immutable/chunks/D2ePOI5C.js","_app/immutable/chunks/BS2UrdqA.js","_app/immutable/chunks/DHyv_Okd.js","_app/immutable/chunks/D30Rc-kS.js","_app/immutable/chunks/7JOXq6Y5.js","_app/immutable/chunks/Cx2Q_0G6.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-Nvjb0Ha9.js')),
			__memo(() => import('./1-BFmm58SN.js')),
			__memo(() => import('./2-CuFavv3r.js')),
			__memo(() => import('./3-mEr-pjZ4.js')),
			__memo(() => import('./4-Lhx9Ce8p.js')),
			__memo(() => import('./5-Nv-FbkTP.js')),
			__memo(() => import('./6-O0FGN705.js')),
			__memo(() => import('./7-3gV8NZPp.js')),
			__memo(() => import('./8-C_U795YA.js')),
			__memo(() => import('./9-CmXpDFs1.js')),
			__memo(() => import('./10-cDQ0VAL_.js')),
			__memo(() => import('./11-ClB9vUxT.js')),
			__memo(() => import('./12-C5h5IZ-L.js')),
			__memo(() => import('./13-Bmx657t-.js')),
			__memo(() => import('./14-COJl9_Ti.js')),
			__memo(() => import('./15-D1Yny3WX.js')),
			__memo(() => import('./16-w5j4wnsy.js')),
			__memo(() => import('./17-9y_RqKHO.js')),
			__memo(() => import('./18-wuJNt3B_.js')),
			__memo(() => import('./19-CAwnjOjo.js')),
			__memo(() => import('./20-3QaZXDts.js')),
			__memo(() => import('./21-D5f4-dqZ.js')),
			__memo(() => import('./22-DoN1xGWj.js')),
			__memo(() => import('./23-Dnc46kkS.js')),
			__memo(() => import('./24-BY0WhRm_.js')),
			__memo(() => import('./25-fJ5kt32w.js')),
			__memo(() => import('./26-s4tI6qMN.js'))
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
//# sourceMappingURL=manifest.js-ChzziF9s.js.map
