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
		client: {start:"_app/immutable/entry/start.C_Z45uFS.js",app:"_app/immutable/entry/app.scqBCuUi.js",imports:["_app/immutable/entry/start.C_Z45uFS.js","_app/immutable/chunks/DpfIarXv.js","_app/immutable/chunks/CtFg-CuC.js","_app/immutable/chunks/CYIa-GvR.js","_app/immutable/entry/app.scqBCuUi.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CtFg-CuC.js","_app/immutable/chunks/D6SGA0DW.js","_app/immutable/chunks/CCC-RRgI.js","_app/immutable/chunks/B6HIK-gZ.js","_app/immutable/chunks/BgW8n8zj.js","_app/immutable/chunks/CYIa-GvR.js","_app/immutable/chunks/DkbkSKNp.js","_app/immutable/chunks/C0URif5T.js","_app/immutable/chunks/0BIyhPBJ.js","_app/immutable/chunks/DVkPCXg2.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-cI5F4ZYv.js')),
			__memo(() => import('./1-DmuEsaAv.js')),
			__memo(() => import('./2-Bt8sSzds.js')),
			__memo(() => import('./3-D8EOwDHr.js')),
			__memo(() => import('./4-BOVzHoRM.js')),
			__memo(() => import('./5-CCmG655m.js')),
			__memo(() => import('./6-CiLjjvoh.js')),
			__memo(() => import('./7-5FQ_oHCC.js')),
			__memo(() => import('./8-DOlNH-3_.js')),
			__memo(() => import('./9-ZsWWaqYW.js')),
			__memo(() => import('./10-UFnTA82U.js')),
			__memo(() => import('./11-BccO8RDV.js')),
			__memo(() => import('./12-BBx7dw4Y.js')),
			__memo(() => import('./13-B_ccsOWL.js')),
			__memo(() => import('./14-DeEf_wiX.js')),
			__memo(() => import('./15-Br_LC2Sw.js')),
			__memo(() => import('./16-BO_svbV4.js')),
			__memo(() => import('./17-K0xZXERd.js')),
			__memo(() => import('./18-BfPvd7I7.js')),
			__memo(() => import('./19-q0F4PzkS.js')),
			__memo(() => import('./20-DlvJ3YoZ.js')),
			__memo(() => import('./21-D8ihBlUH.js')),
			__memo(() => import('./22-D3PVstU7.js')),
			__memo(() => import('./23-ngITgMzJ.js')),
			__memo(() => import('./24-GjNLkCbt.js')),
			__memo(() => import('./25-D58ydJeT.js')),
			__memo(() => import('./26-WW-V-nV2.js'))
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
//# sourceMappingURL=manifest.js-BZPxJx0O.js.map
