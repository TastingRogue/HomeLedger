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
		client: {start:"_app/immutable/entry/start.DKhIQoHt.js",app:"_app/immutable/entry/app.CkTRFH6_.js",imports:["_app/immutable/entry/start.DKhIQoHt.js","_app/immutable/chunks/Bg1to4vJ.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/B4ENHeZL.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/entry/app.CkTRFH6_.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CgMrSBuu.js","_app/immutable/chunks/B_uYsnB3.js","_app/immutable/chunks/77HFI_Vi.js","_app/immutable/chunks/B7tBYC-A.js","_app/immutable/chunks/CWPryWmu.js","_app/immutable/chunks/BrCLlvBq.js","_app/immutable/chunks/Dk_ziTbZ.js","_app/immutable/chunks/DgfdodRS.js","_app/immutable/chunks/BMQssNym.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-CG5CzG4n.js')),
			__memo(() => import('./1-BV3Y9HVx.js')),
			__memo(() => import('./2-DgwH_tQr.js')),
			__memo(() => import('./3-Bj-gF4yy.js')),
			__memo(() => import('./4-CIsucLQZ.js')),
			__memo(() => import('./5-DJDUloiF.js')),
			__memo(() => import('./6-Bzu2VDx6.js')),
			__memo(() => import('./7-DE1kPL37.js')),
			__memo(() => import('./8-CDAozTIq.js')),
			__memo(() => import('./9-CWbSoiau.js')),
			__memo(() => import('./10-C9i3FaAc.js')),
			__memo(() => import('./11-CmPESPM-.js')),
			__memo(() => import('./12-euelUniU.js')),
			__memo(() => import('./13-BMqfyfK3.js')),
			__memo(() => import('./14-B1p--FMB.js')),
			__memo(() => import('./15-DnzjmYLC.js')),
			__memo(() => import('./16-JxLa6Iz0.js')),
			__memo(() => import('./17-D_f8Fxlm.js')),
			__memo(() => import('./18-jt6N6y_R.js')),
			__memo(() => import('./19-DVGW8Ti6.js')),
			__memo(() => import('./20-Bu_VsfiZ.js')),
			__memo(() => import('./21-ZCj0lMUe.js')),
			__memo(() => import('./22-Bhqlu7WL.js')),
			__memo(() => import('./23-BCNlRrEg.js')),
			__memo(() => import('./24-CXvWVkaY.js'))
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
//# sourceMappingURL=manifest.js-Yx4IujgV.js.map
