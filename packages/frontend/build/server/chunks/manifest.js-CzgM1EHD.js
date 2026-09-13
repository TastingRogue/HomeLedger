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
		client: {start:"_app/immutable/entry/start.CMHMRbLH.js",app:"_app/immutable/entry/app.dx_QOET8.js",imports:["_app/immutable/entry/start.CMHMRbLH.js","_app/immutable/chunks/DU0ddVd3.js","_app/immutable/chunks/Dhcruou8.js","_app/immutable/chunks/CeHbSIxt.js","_app/immutable/chunks/BLV7P4-k.js","_app/immutable/chunks/Dl_Jd8A-.js","_app/immutable/entry/app.dx_QOET8.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/Dhcruou8.js","_app/immutable/chunks/BcJSyWyd.js","_app/immutable/chunks/BJUDm4Ti.js","_app/immutable/chunks/Dl_Jd8A-.js","_app/immutable/chunks/BM71gQhJ.js","_app/immutable/chunks/CeHbSIxt.js","_app/immutable/chunks/C_qr-SCw.js","_app/immutable/chunks/DYS0CZta.js","_app/immutable/chunks/8HgQ5JT3.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-D883SiXC.js')),
			__memo(() => import('./1-Dj6l--Z-.js')),
			__memo(() => import('./2-41SL-plX.js')),
			__memo(() => import('./3-ByMYZC0z.js')),
			__memo(() => import('./4-COeE51Xo.js')),
			__memo(() => import('./5-CUXMa9Mw.js')),
			__memo(() => import('./6-CGUTgqB7.js')),
			__memo(() => import('./7-DRp91D_N.js')),
			__memo(() => import('./8-CSjRdo-t.js')),
			__memo(() => import('./9-CBNj8QFc.js')),
			__memo(() => import('./10-8QWBoSu5.js')),
			__memo(() => import('./11-EsJ8TYDS.js')),
			__memo(() => import('./12-Dbah2hTu.js')),
			__memo(() => import('./13-BWvUc9T8.js')),
			__memo(() => import('./14-DaPtn4ZM.js')),
			__memo(() => import('./15-COsXm9om.js')),
			__memo(() => import('./16-_f7sxGd1.js')),
			__memo(() => import('./17-Cay_ynmp.js')),
			__memo(() => import('./18-B0BT0PA4.js')),
			__memo(() => import('./19-CEDL6zCZ.js')),
			__memo(() => import('./20-CxV9vEXh.js')),
			__memo(() => import('./21-C4sOYU1u.js')),
			__memo(() => import('./22-BtLp0JU2.js')),
			__memo(() => import('./23-CGoXRdRr.js')),
			__memo(() => import('./24-HXelX6gj.js')),
			__memo(() => import('./25-CBuW-HnI.js')),
			__memo(() => import('./26-BCIBf1cY.js'))
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
//# sourceMappingURL=manifest.js-CzgM1EHD.js.map
