import { appearanceBootstrap } from '$lib/themes/bootstrap';
export function GET() {
  return new Response(appearanceBootstrap.replace(/^<script>/, '').replace(/<\/script>$/, ''), {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' },
  });
}
