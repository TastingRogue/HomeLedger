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
		client: {start:"_app/immutable/entry/start.D71RPxvG.js",app:"_app/immutable/entry/app.Ckjx2Us0.js",imports:["_app/immutable/entry/start.D71RPxvG.js","_app/immutable/chunks/DQos3j6m.js","_app/immutable/chunks/DpjAua_h.js","_app/immutable/chunks/VEO9Ut5g.js","_app/immutable/chunks/CSrHxxjr.js","_app/immutable/chunks/Rgd9JknB.js","_app/immutable/entry/app.Ckjx2Us0.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/DpjAua_h.js","_app/immutable/chunks/BxY8RmDA.js","_app/immutable/chunks/NcXan4Rb.js","_app/immutable/chunks/Rgd9JknB.js","_app/immutable/chunks/B3b9Wj6o.js","_app/immutable/chunks/VEO9Ut5g.js","_app/immutable/chunks/Cx4fkSGO.js","_app/immutable/chunks/Bog4ZYX1.js","_app/immutable/chunks/Q9TgP7MV.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-DIu_Db95.js')),
			__memo(() => import('./1-BrfqJfmb.js')),
			__memo(() => import('./2-CqOPYtlp.js')),
			__memo(() => import('./3-MtS3cc1-.js')),
			__memo(() => import('./4-DghYH4JZ.js')),
			__memo(() => import('./5-BsdIcgfP.js')),
			__memo(() => import('./6-B-tZykGw.js')),
			__memo(() => import('./7-DmZjUrZS.js')),
			__memo(() => import('./8-CnKucWgJ.js')),
			__memo(() => import('./9-BxD51WGc.js')),
			__memo(() => import('./10-BG3cJy_x.js')),
			__memo(() => import('./11-B9FASYlI.js')),
			__memo(() => import('./12-CseDAYRG.js')),
			__memo(() => import('./13-BXX_VzfD.js')),
			__memo(() => import('./14-CFrNHi15.js')),
			__memo(() => import('./15-KgMtGJux.js')),
			__memo(() => import('./16-BWriIBPV.js')),
			__memo(() => import('./17-cXWRstlu.js')),
			__memo(() => import('./18-BfZTP4rt.js')),
			__memo(() => import('./19-CINHTbtA.js')),
			__memo(() => import('./20-DbREZzX7.js')),
			__memo(() => import('./21-J7kN6i_z.js')),
			__memo(() => import('./22-DnWhrsJx.js')),
			__memo(() => import('./23-BzeuIVxn.js')),
			__memo(() => import('./24-JVsYBFyM.js'))
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
//# sourceMappingURL=manifest.js-D0v_oDrF.js.map
