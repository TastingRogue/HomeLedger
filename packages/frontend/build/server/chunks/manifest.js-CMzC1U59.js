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
		client: {start:"_app/immutable/entry/start.7SQ0TZgJ.js",app:"_app/immutable/entry/app.C1aT1v4R.js",imports:["_app/immutable/entry/start.7SQ0TZgJ.js","_app/immutable/chunks/CzcCF3gT.js","_app/immutable/chunks/ByIiucXd.js","_app/immutable/chunks/DHyv_Okd.js","_app/immutable/chunks/BomwF39r.js","_app/immutable/chunks/D2ePOI5C.js","_app/immutable/entry/app.C1aT1v4R.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/ByIiucXd.js","_app/immutable/chunks/Dzdfy3Ra.js","_app/immutable/chunks/Vcurar1Q.js","_app/immutable/chunks/D2ePOI5C.js","_app/immutable/chunks/BS2UrdqA.js","_app/immutable/chunks/DHyv_Okd.js","_app/immutable/chunks/D30Rc-kS.js","_app/immutable/chunks/7JOXq6Y5.js","_app/immutable/chunks/Cx2Q_0G6.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-vFCg_0DX.js')),
			__memo(() => import('./1-ohWnR88W.js')),
			__memo(() => import('./2-7uA8C50A.js')),
			__memo(() => import('./3-mEr-pjZ4.js')),
			__memo(() => import('./4-Lhx9Ce8p.js')),
			__memo(() => import('./5-Pe4PtzAP.js')),
			__memo(() => import('./6-DaNX3gww.js')),
			__memo(() => import('./7-B8_FbooL.js')),
			__memo(() => import('./8-DpX0eLUr.js')),
			__memo(() => import('./9-CZMc5S3H.js')),
			__memo(() => import('./10-CByLKRqf.js')),
			__memo(() => import('./11-CnUKQduB.js')),
			__memo(() => import('./12-e5BxTett.js')),
			__memo(() => import('./13-COnoqeR7.js')),
			__memo(() => import('./14-DV7l4dVn.js')),
			__memo(() => import('./15-m4Ng2say.js')),
			__memo(() => import('./16-C8E7k9Tb.js')),
			__memo(() => import('./17-CuL7i4QT.js')),
			__memo(() => import('./18-C1d-8k2s.js')),
			__memo(() => import('./19-osU8FUyL.js')),
			__memo(() => import('./20-B3Ku7woI.js')),
			__memo(() => import('./21-DlunKBie.js')),
			__memo(() => import('./22-OBGqReo7.js')),
			__memo(() => import('./23-pQorJua6.js')),
			__memo(() => import('./24-DMFM2-eR.js')),
			__memo(() => import('./25-Vzo4v6Be.js')),
			__memo(() => import('./26-BOTifDgu.js'))
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
//# sourceMappingURL=manifest.js-CMzC1U59.js.map
