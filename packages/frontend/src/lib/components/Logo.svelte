<script lang="ts">
  // HomeLedger brand mark: a house (blue roof + green apex dot) enclosing an "H"
  // (blue columns + white beam), with a dark $ badge ringed in green. Scalable
  // inline SVG so it stays crisp from favicon size up to hero/logo size.
  let { size = 48, rounded = true }: { size?: number; rounded?: boolean } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 512 512"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="HomeLedger"
>
  <defs>
    <linearGradient id="hl-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#131a24" />
      <stop offset="1" stop-color="#0b1118" />
    </linearGradient>
    <linearGradient id="hl-blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b9bff" />
      <stop offset="1" stop-color="#3b82f6" />
    </linearGradient>
  </defs>

  {#if rounded}
    <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#hl-bg)" />
    <rect x="16.5" y="16.5" width="479" height="479" rx="112" fill="none" stroke="#ffffff" stroke-opacity="0.06" />
  {/if}

  <!-- roof -->
  <path d="M256 118 L392 232" fill="none" stroke="url(#hl-blue)" stroke-width="34" stroke-linecap="round" />
  <path d="M256 118 L120 232" fill="none" stroke="url(#hl-blue)" stroke-width="34" stroke-linecap="round" />
  <circle cx="256" cy="118" r="18" fill="#22c55e" />

  <!-- H -->
  <rect x="158" y="214" width="60" height="176" rx="18" fill="url(#hl-blue)" />
  <rect x="294" y="214" width="60" height="176" rx="18" fill="url(#hl-blue)" />
  <rect x="158" y="284" width="196" height="40" rx="16" fill="#f4f7fb" />

  <!-- $ badge: dark fill, green ring + green glyph -->
  <circle cx="372" cy="372" r="58" fill="#0b1118" stroke="#22c55e" stroke-width="6" />
  <text
    x="372"
    y="376"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Segoe UI, Helvetica, Arial, sans-serif"
    font-size="74"
    font-weight="800"
    fill="#22c55e">$</text>
</svg>
