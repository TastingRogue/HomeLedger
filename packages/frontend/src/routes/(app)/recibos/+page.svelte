<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, getAccessToken } from '$lib/api/client';
  import { analyzeAttachment, listReceipts, updateReceipt, type ReceiptAnalysis } from '$lib/api/receipts';
  import { formatCurrency, formatDateShort } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  interface Attachment { id:number; transactionId:number|null; originalName:string|null; mimeType:string; size:number; createdAt:string; }
  let receipts = $state<ReceiptAnalysis[]>([]); let attachments = $state<Attachment[]>([]); let loading=$state(true); let analyzing=$state<number|null>(null); let error=$state(''); let selected=$state<ReceiptAnalysis|null>(null); let search=$state(''); let previewUrl=$state('');
  // Manual edit state for correcting/completing OCR output.
  let editing=$state(false); let saving=$state(false);
  let form=$state<{merchant:string;receiptDate:string;subtotal:string;tax:string;total:string;issuerRfc:string;uuid:string}>({merchant:'',receiptDate:'',subtotal:'',tax:'',total:'',issuerRfc:'',uuid:''});
  function startEdit(){ if(!selected)return; form={ merchant:selected.merchant??'', receiptDate:selected.receiptDate?selected.receiptDate.slice(0,10):'', subtotal:selected.subtotal!=null?String(selected.subtotal):'', tax:selected.tax!=null?String(selected.tax):'', total:selected.total!=null?String(selected.total):'', issuerRfc:selected.rfc??'', uuid:selected.uuid??'' }; editing=true; }
  function cancelEdit(){ editing=false; }
  async function saveEdit(){
    if(!selected)return; saving=true; error='';
    try{
      const updated=await updateReceipt(selected.id,{ merchant:form.merchant||null, receiptDate:form.receiptDate||null, subtotal:form.subtotal===''?null:Number(form.subtotal), tax:form.tax===''?null:Number(form.tax), total:form.total===''?null:Number(form.total), issuerRfc:form.issuerRfc||null, uuid:form.uuid||null });
      receipts=receipts.map(x=>x.id===updated.id?updated:x); selected=updated; editing=false;
    }catch(e){ error=e instanceof Error?e.message:'No se pudo guardar'; }finally{ saving=false; }
  }
  const filtered = $derived(attachments.filter(a => { const r=receipts.find(x=>x.attachmentId===a.id); const q=search.trim().toLowerCase(); return !q || !!r && [r.merchant,r.rfc,r.filename,r.transactionName,r.uuid].some(v=>v?.toLowerCase().includes(q)); }));
  // True when the analyzed total and the linked transaction amount differ beyond a 1-cent rounding tolerance.
  const mismatch = $derived(!!selected && selected.total !== null && selected.transactionAmount !== null && Math.abs(Math.abs(selected.total) - Math.abs(selected.transactionAmount)) > 0.01);
  onMount(load);
  async function load(){ loading=true; error=''; try { const [r,a]=await Promise.all([listReceipts(),apiGet<Attachment[]>('/attachments')]); receipts=r; attachments=a; } catch(e){ error=e instanceof Error?e.message:'No se pudieron cargar los documentos'; } finally{loading=false;} }
  async function analyze(id:number){ analyzing=id; error=''; try{ const r=await analyzeAttachment(id); receipts=[r,...receipts.filter(x=>x.id!==r.id)]; selected=r; await preview(r); }catch(e){error=e instanceof Error?e.message:'No se pudo analizar el archivo';}finally{analyzing=null;} }
  async function preview(r:ReceiptAnalysis){ if(previewUrl)URL.revokeObjectURL(previewUrl); previewUrl=''; const token=getAccessToken(); if(!token)return; try{const res=await fetch(`/api/v1/attachments/${r.attachmentId}/download`,{headers:{Authorization:`Bearer ${token}`}});if(res.ok)previewUrl=URL.createObjectURL(await res.blob());}catch{} }
  async function open(r:ReceiptAnalysis){selected=r;editing=false;await preview(r);} function close(){selected=null;editing=false;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';}
  const status=(s:string)=>s==='completed'?'Analizado':s==='failed'?'Error':s==='processing'?'Procesando':'Pendiente'; const source=(s:string)=>s==='cfdi_xml'?'CFDI XML':s==='ocr'?'OCR (imagen)':s==='pdf_text'?'PDF (texto)':'—';
</script>
<svelte:head><title>Recibos y facturas · HomeLedger</title></svelte:head>
<div class="page"><header class="header"><div><p class="eyebrow">DOCUMENTOS</p><h1>Recibos y facturas</h1><p class="subtitle">Analiza comprobantes localmente y relaciona sus datos con tus compras.</p></div><div class="stats"><span>{receipts.length} analizados</span><span>{attachments.length} adjuntos</span></div></header>
<div class="toolbar"><input bind:value={search} placeholder="Buscar comercio, RFC, archivo..."/><button class="secondary" onclick={load} disabled={loading}>Actualizar</button></div>
{#if error}<div class="error">{error}</div>{/if}
<section class="table-card">{#if loading}<div class="empty">Cargando documentos...</div>{:else if attachments.length===0}<div class="empty"><strong>No hay documentos adjuntos</strong><span>Adjunta un ticket o factura desde una transacción para analizarlo.</span></div>{:else}<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Comercio</th><th>Archivo</th><th>Total</th><th>Transacción</th><th>Origen</th><th>Estado</th><th></th></tr></thead><tbody>{#each filtered as a (a.id)}{@const r=receipts.find(x=>x.attachmentId===a.id)}<tr class:clickable={!!r} onclick={()=>r&&open(r)}><td>{r?.receiptDate?formatDateShort(r.receiptDate):formatDateShort(a.createdAt)}</td><td class="merchant">{r?.merchant??'Sin analizar'}</td><td class="filename">{a.originalName??'Archivo'}</td><td class="amount">{r?.total!==null&&r?.total!==undefined?formatCurrency(r.total):'—'}</td><td>{r?.transactionName??(a.transactionId?`#${a.transactionId}`:'—')}</td><td>{r?source(r.sourceType):'—'}</td><td>{#if r}<span class="status" class:ok={r.status==='completed'} class:bad={r.status==='failed'}>{status(r.status)}</span>{:else}<span class="status">Pendiente</span>{/if}</td><td>{#if !r||r.status==='failed'}<button class="analyze" onclick={(e)=>{e.stopPropagation();analyze(a.id)}} disabled={analyzing===a.id}>{analyzing===a.id?'Analizando…':'Analizar'}</button>{:else}<button class="view" onclick={(e)=>{e.stopPropagation();open(r)}}>Ver</button>{/if}</td></tr>{/each}</tbody></table></div>{/if}</section></div>
{#if selected}
<div class="overlay" role="presentation" onclick={close}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e)=>e.stopPropagation()}>
    <div class="detail-head">
      <div><p class="eyebrow">COMPROBANTE</p><h2>{selected.merchant??selected.filename}</h2><span class="muted">{selected.filename}</span></div>
      <div class="detail-head-actions">
        {#if editing}
          <button class="reanalyze" onclick={saveEdit} disabled={saving}>{saving?$t('receipts.saving'):$t('receipts.save')}</button>
          <button class="ghost" onclick={cancelEdit} disabled={saving}>{$t('receipts.cancel')}</button>
        {:else}
          <button class="ghost" onclick={startEdit}>{$t('receipts.edit')}</button>
          <button class="reanalyze" onclick={()=>analyze(selected!.attachmentId)} disabled={analyzing===selected.attachmentId}>{analyzing===selected.attachmentId?$t('receipts.analyzing'):$t('receipts.reanalyze')}</button>
        {/if}
        <button class="close" onclick={close}>×</button>
      </div>
    </div>
    {#if selected.error}<div class="error">{selected.error}</div>{/if}
    <div class="detail-body">
      <div class="detail-info">
        {#if selected.transactionName && !editing}
          {#if mismatch}
            <div class="alert-mismatch">⚠ {$t('receipts.amount_mismatch', { receipt: selected.total!==null?formatCurrency(selected.total):'—', transaction: selected.transactionAmount!==null?formatCurrency(selected.transactionAmount):'—' })}</div>
          {:else}
            <div class="alert-match">✓ {$t('receipts.amount_match')}</div>
          {/if}
        {/if}
        {#if editing}
          <div class="edit-grid">
            <label>Comercio<input type="text" bind:value={form.merchant} /></label>
            <label>Fecha<input type="date" bind:value={form.receiptDate} /></label>
            <label>Subtotal<input type="number" step="0.01" bind:value={form.subtotal} /></label>
            <label>Impuestos<input type="number" step="0.01" bind:value={form.tax} /></label>
            <label>Total<input type="number" step="0.01" bind:value={form.total} /></label>
            <label>RFC<input type="text" bind:value={form.issuerRfc} /></label>
            <label class="full">UUID<input type="text" bind:value={form.uuid} /></label>
          </div>
        {:else}
          <div class="detail-grid">
            <div><span>Fecha</span><strong>{selected.receiptDate?formatDateShort(selected.receiptDate):'—'}</strong></div>
            <div><span>Total</span><strong class:bad-value={mismatch}>{selected.total!==null?formatCurrency(selected.total):'—'}</strong></div>
            <div><span>Subtotal</span><strong>{selected.subtotal!==null?formatCurrency(selected.subtotal):'—'}</strong></div>
            <div><span>Impuestos</span><strong>{selected.tax!==null?formatCurrency(selected.tax):'—'}</strong></div>
            <div><span>RFC</span><strong>{selected.rfc??'—'}</strong></div>
            <div><span>UUID</span><strong class="mono">{selected.uuid??'—'}</strong></div>
            <div><span>Origen</span><strong>{source(selected.sourceType)}</strong></div>
            <div><span>Confianza</span><strong>{Math.round(selected.confidence*100)}%</strong></div>
          </div>
          {#if selected.transactionName}<div class="match" class:match-bad={mismatch}><span>Transacción relacionada</span><strong>{selected.transactionName} · {selected.transactionAmount!==null?formatCurrency(selected.transactionAmount):''}</strong></div>{/if}
          {#if selected.items.length}<section class="items"><h3>Conceptos</h3>{#each selected.items as item}<div class="item"><span>{item.description}</span><strong>{item.total!==null?formatCurrency(item.total):'—'}</strong></div>{/each}</section>{/if}
        {/if}
      </div>
      <div class="detail-preview">
        <h3>Archivo</h3>
        {#if previewUrl&&selected.mimeType.startsWith('image/')}<img src={previewUrl} alt="Vista previa del comprobante"/>{:else if previewUrl&&selected.mimeType==='application/pdf'}<iframe src={previewUrl} title="Vista previa del PDF"></iframe>{:else}<div class="preview-empty">Vista previa no disponible</div>{/if}
      </div>
    </div>
  </div>
</div>
{/if}
<style>
.page{max-width:1400px;margin:0 auto}.header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.25rem}.eyebrow{margin:0 0 .25rem;font-size:.65rem;letter-spacing:.1em;font-weight:700;color:var(--accent-green)}h1{margin:0;font-size:1.45rem;color:var(--text-primary)}h2{margin:.1rem 0;font-size:1.05rem;color:var(--text-primary)}h3{font-size:.78rem;color:var(--text-secondary);margin:0 0 .65rem;text-transform:uppercase;letter-spacing:.05em}.subtitle,.muted{margin:.25rem 0 0;color:var(--text-muted);font-size:.78rem}.stats{display:flex;gap:.5rem;flex-wrap:wrap}.stats span{background:var(--bg-surface);border:1px solid var(--border-default);padding:.45rem .65rem;border-radius:var(--radius-md);font-size:.7rem;color:var(--text-secondary)}.toolbar{display:flex;gap:.5rem;margin-bottom:.75rem}input{flex:1;max-width:420px;background:var(--bg-surface);border:1px solid var(--border-default);color:var(--text-primary);border-radius:var(--radius-md);padding:.55rem .7rem;outline:none}button{border:1px solid var(--border-default);border-radius:var(--radius-md);padding:.5rem .7rem;font-size:.72rem;cursor:pointer}button:disabled{opacity:.5}.secondary,.view{background:var(--bg-surface);color:var(--text-secondary)}.analyze{background:rgba(59,130,246,.12);color:#93c5fd;border-color:rgba(59,130,246,.3)}.table-card{background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-lg);overflow:hidden}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:980px}th{text-align:left;padding:.65rem .8rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);background:var(--bg-surface);border-bottom:1px solid var(--border-default)}td{padding:.7rem .8rem;border-bottom:1px solid var(--border-subtle);color:var(--text-secondary);font-size:.72rem;white-space:nowrap}tr:last-child td{border-bottom:0}tr.clickable{cursor:pointer}tr.clickable:hover td{background:var(--bg-hover)}.merchant{color:var(--text-primary);font-weight:600}.filename{max-width:220px;overflow:hidden;text-overflow:ellipsis}.amount{color:var(--text-primary)}.status{display:inline-flex;padding:.22rem .42rem;border-radius:999px;background:rgba(148,163,184,.1);color:var(--text-muted);font-size:.6rem}.status.ok{color:#86efac;background:rgba(34,197,94,.1)}.status.bad{color:#fca5a5;background:rgba(239,68,68,.1)}.empty{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35rem;color:var(--text-muted);font-size:.75rem}.empty strong{color:var(--text-secondary);font-size:.85rem}.error{margin:.6rem 0;padding:.65rem .75rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#fca5a5;border-radius:var(--radius-md);font-size:.72rem}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:250;display:flex;align-items:center;justify-content:center;padding:1.5rem}.modal{position:relative;z-index:260;width:min(1040px,100%);max-height:calc(100vh - 3rem);overflow:auto;background:var(--bg-default);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:1.25rem;box-shadow:0 24px 70px rgba(0,0,0,.45)}.detail-head{display:flex;justify-content:space-between;gap:1rem;margin-bottom:1rem}.detail-head-actions{display:flex;align-items:flex-start;gap:.4rem}.reanalyze{background:rgba(59,130,246,.12);color:#93c5fd;border:1px solid rgba(59,130,246,.3);border-radius:var(--radius-md);padding:.4rem .7rem;font-size:.72rem;cursor:pointer;white-space:nowrap;height:fit-content}.reanalyze:disabled{opacity:.5;cursor:default}.ghost{background:var(--bg-surface);color:var(--text-secondary);white-space:nowrap;height:fit-content}
.detail-body{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;align-items:start}.detail-info{min-width:0}.detail-preview{min-width:0}
.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.5rem}.edit-grid label{display:flex;flex-direction:column;gap:.25rem;font-size:.6rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted)}.edit-grid label.full{grid-column:1 / -1}.edit-grid input{background:var(--bg-surface);border:1px solid var(--border-default);color:var(--text-primary);border-radius:var(--radius-md);padding:.45rem .55rem;font-size:.8rem;outline:none;max-width:none}
@media (max-width:820px){.detail-body{grid-template-columns:1fr}}
.alert-mismatch{display:flex;gap:.4rem;align-items:flex-start;padding:.6rem .75rem;margin-bottom:.85rem;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:var(--radius-md);color:#fca5a5;font-size:.72rem;line-height:1.4}
.alert-match{display:flex;gap:.4rem;align-items:center;padding:.5rem .75rem;margin-bottom:.85rem;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:var(--radius-md);color:#86efac;font-size:.72rem}
.bad-value{color:#fca5a5!important}.match-bad{background:rgba(239,68,68,.07)!important;border-color:rgba(239,68,68,.2)!important}.match-bad strong{color:#fca5a5!important}.close{background:transparent;border:0;color:var(--text-muted);font-size:1.5rem}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.8rem}.detail-grid>div{background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:.65rem}.detail-grid span{display:block;color:var(--text-muted);font-size:.6rem;text-transform:uppercase;margin-bottom:.2rem}.detail-grid strong{color:var(--text-primary);font-size:.75rem;word-break:break-word}.mono{font-family:monospace;font-size:.62rem!important}.match{padding:.7rem;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.15);border-radius:var(--radius-md);margin-bottom:1rem}.match span{display:block;color:var(--text-muted);font-size:.6rem;text-transform:uppercase}.match strong{color:#86efac;font-size:.72rem}.items{margin:1rem 0}.item{display:flex;justify-content:space-between;gap:1rem;padding:.5rem 0;border-bottom:1px solid var(--border-subtle);font-size:.72rem;color:var(--text-secondary)}.item strong{color:var(--text-primary)}.detail-preview img,.detail-preview iframe{width:100%;max-height:70vh;border:1px solid var(--border-default);border-radius:var(--radius-md);background:#fff;object-fit:contain}.detail-preview iframe{height:70vh}.preview-empty{min-height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--border-default);border-radius:var(--radius-md);color:var(--text-muted);font-size:.7rem}
</style>
