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
		client: {start:"_app/immutable/entry/start.CEELd73S.js",app:"_app/immutable/entry/app.DUmndZ_J.js",imports:["_app/immutable/entry/start.CEELd73S.js","_app/immutable/chunks/NBnJyuIg.js","_app/immutable/chunks/DL-bFAjm.js","_app/immutable/chunks/BVLcRTIc.js","_app/immutable/chunks/ByVOLRn1.js","_app/immutable/chunks/MXJBaBR-.js","_app/immutable/entry/app.DUmndZ_J.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/DL-bFAjm.js","_app/immutable/chunks/BvQ-_dmC.js","_app/immutable/chunks/DuqAtCx3.js","_app/immutable/chunks/MXJBaBR-.js","_app/immutable/chunks/DijbNBgN.js","_app/immutable/chunks/BVLcRTIc.js","_app/immutable/chunks/BFyylhx1.js","_app/immutable/chunks/Ceo5s92v.js","_app/immutable/chunks/CK4LIQ0y.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-nE9WG7Ox.js')),
			__memo(() => import('./1-DtsuafFb.js')),
			__memo(() => import('./2-BrLocHqW.js')),
			__memo(() => import('./3-Cksw-DZ2.js')),
			__memo(() => import('./4-Kxer4eu6.js')),
			__memo(() => import('./5-Bez33iUm.js')),
			__memo(() => import('./6-ZNkdXX3H.js')),
			__memo(() => import('./7-kMjoAjwF.js')),
			__memo(() => import('./8-BYvsj0lz.js')),
			__memo(() => import('./9-9N9h65uo.js')),
			__memo(() => import('./10-CaR8P_io.js')),
			__memo(() => import('./11-i1D_p_3T.js')),
			__memo(() => import('./12-DMqeX_3J.js')),
			__memo(() => import('./13-Ddi9Tw8e.js')),
			__memo(() => import('./14-CylDm1wC.js')),
			__memo(() => import('./15-QWyDqzVk.js')),
			__memo(() => import('./16-D_SVc3WE.js')),
			__memo(() => import('./17-BpFj-j6n.js')),
			__memo(() => import('./18-XWblR4ql.js')),
			__memo(() => import('./19-Dj02mfRY.js')),
			__memo(() => import('./20-BYu1VFkt.js')),
			__memo(() => import('./21-CVJGMz4u.js')),
			__memo(() => import('./22-DGVId4_Q.js')),
			__memo(() => import('./23-CnSQ6xAz.js')),
			__memo(() => import('./24-CjqdTtMk.js'))
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
//# sourceMappingURL=manifest.js-Cj7i73Tg.js.map
