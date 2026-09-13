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
		client: {start:"_app/immutable/entry/start.qKvKXuYu.js",app:"_app/immutable/entry/app.BwS2clfI.js",imports:["_app/immutable/entry/start.qKvKXuYu.js","_app/immutable/chunks/CdvcJXf9.js","_app/immutable/chunks/BnPvwj35.js","_app/immutable/chunks/Dtxy3wED.js","_app/immutable/chunks/2S_yQgz_.js","_app/immutable/chunks/DAySRaas.js","_app/immutable/entry/app.BwS2clfI.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/BnPvwj35.js","_app/immutable/chunks/Dk2XBvnj.js","_app/immutable/chunks/D2GmUj5F.js","_app/immutable/chunks/DAySRaas.js","_app/immutable/chunks/3M5yl8Z3.js","_app/immutable/chunks/Dtxy3wED.js","_app/immutable/chunks/CwwQkM3E.js","_app/immutable/chunks/B34qhBaJ.js","_app/immutable/chunks/CrubcUYj.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-0C4SHVgq.js')),
			__memo(() => import('./1-s4zSBFpw.js')),
			__memo(() => import('./2-CPVmnhh2.js')),
			__memo(() => import('./3-DXebrkmG.js')),
			__memo(() => import('./4-afeKMlis.js')),
			__memo(() => import('./5-BBw2qidh.js')),
			__memo(() => import('./6-0lCve7WQ.js')),
			__memo(() => import('./7-CiY9xIrM.js')),
			__memo(() => import('./8-hwAKh-QU.js')),
			__memo(() => import('./9-DM-9Rmya.js')),
			__memo(() => import('./10-B7o4d8TJ.js')),
			__memo(() => import('./11-BW2EyrWS.js')),
			__memo(() => import('./12-BpMZWUsE.js')),
			__memo(() => import('./13-eD44-bBz.js')),
			__memo(() => import('./14-BQyfnYgK.js')),
			__memo(() => import('./15-B9Bp0S4p.js')),
			__memo(() => import('./16-BH4_zB7O.js')),
			__memo(() => import('./17-DUUNp1UJ.js')),
			__memo(() => import('./18-BBrydDmd.js')),
			__memo(() => import('./19-KOIlBDNc.js')),
			__memo(() => import('./20-CdnPZ4Gz.js')),
			__memo(() => import('./21-Bu9bgTjX.js')),
			__memo(() => import('./22-jDnWX3Zb.js')),
			__memo(() => import('./23-emb3qfGB.js')),
			__memo(() => import('./24-Csq_tJmW.js'))
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
//# sourceMappingURL=manifest.js-BcNmRfwQ.js.map
