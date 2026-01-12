/**
 * KOTO BATUAH ECOSYSTEM v18.0.1 - ASSETS & GLOBAL ENGINE
 * Technology Partner: James (Jim Koto)
 * Fixed: Automatic Assets Fetching from GitHub
 */

const CONFIG = {
  CSV_PUB_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vST8FRhHwsV9E96CIpQGGXqU86cbbTdTLX03yNzBBeu5pPnOpMtKGb7XccGc9V0ZcB5ALHaP4t9Yy40/pub?output=csv",
  GITHUB_BASE: "https://raw.githubusercontent.com/jimtok/jimtok/main/ekosistem-koto-batuah/",
  DEFAULT_CONFIG_DOMAIN: "portaltangerangraya.com"
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const domain = url.hostname.toLowerCase().replace('www.', '');
    const path = url.pathname === "/" ? "home" : url.pathname.replace(/^\/|\/$/g, "");

    // 1. HANDLER UNTUK ASET (GAMBAR DARI GITHUB)
    if (url.pathname.includes("/assets/")) {
      const githubAssetUrl = CONFIG.GITHUB_BASE + url.pathname.replace(/^\//, "");
      const assetRes = await fetch(githubAssetUrl);
      
      if (assetRes.ok) {
        // Teruskan file dengan header asli (image/jpg, dsb)
        return new Response(assetRes.body, {
          headers: { 
            'Content-Type': assetRes.headers.get('Content-Type'),
            'Cache-Control': 'public, max-age=86400' 
          }
        });
      }
    }

    try {
      const res = await fetch(CONFIG.CSV_PUB_URL, { cf: { cacheTtl: 1 } });
      const csv = await res.text();
      const allData = parseCSV(csv);
      
      const siteData = allData.filter(d => d.domain.trim().toLowerCase() === domain);
      if (siteData.length === 0 && domain !== CONFIG.DEFAULT_CONFIG_DOMAIN) return new Response("Domain Not Registered", { status: 404 });

      const getConfig = (slug) => {
        return allData.find(d => d.domain === domain && d.slug === slug) || 
               allData.find(d => d.domain === CONFIG.DEFAULT_CONFIG_DOMAIN && d.slug === slug);
      };

      // ADS.TXT & SITEMAP
      if (path === "ads.txt") {
        const adsRecord = getConfig("_config_adsense");
        return new Response(adsRecord ? adsRecord.content : "", { headers: { 'Content-Type': 'text/plain' } });
      }
      if (path === "sitemap.xml") return new Response(generateSitemap(siteData, url.origin), { headers: { 'Content-Type': 'application/xml' } });

      // PAGE ROUTING
      const page = siteData.find(d => d.slug === path);
      if (page) {
        const globalConfig = getConfig("_config_global");
        let html = page.html && page.html.trim().length > 50 ? decodeBase64(page.html) : renderFallback(page, domain);
        
        if (globalConfig && globalConfig.html && globalConfig.html.trim() !== "-") {
           html = html.replace('</head>', `${globalConfig.html}</head>`);
        }
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }

      return Response.redirect(url.origin + '/', 302);
    } catch (e) {
      return new Response("System Optimizing...");
    }
  }
};

// --- HELPERS (Tetap Sama) ---
function generateSitemap(data, origin) {
  const urls = data.filter(d => !d.slug.startsWith('_')).map(d => `<url><loc>${origin}/${d.slug === 'home' ? '' : d.slug}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
function renderFallback(p, d) {
  return `<!DOCTYPE html><html><body style="background:#020617;color:white;padding:50px"><h1>${p.title}</h1><p>${p.description || p.content}</p></body></html>`;
}
function decodeBase64(d){try{let b=atob(d.trim()),y=new Uint8Array(b.length);for(let i=0;i<b.length;i++)y[i]=b.charCodeAt(i);return new TextDecoder().decode(y)}catch(e){return d}}
function parseCSV(t){let r=[],o=[],c="",q=!1;for(let i=0;i<t.length;i++){let x=t[i],n=t[i+1];if(q&&x==='"'&&n==='"' ){c+='"';i++}else if(x==='"')q=!q;else if(x===","&&!q){o.push(c);c=""}else if((x==="\n"||x==="\r")&&!q){if(c!==""||o.length>0){o.push(c);r.push(o);o=[];c=""}}else c+=x}if(c!==""||o.length>0){o.push(c);r.push(o)}let h=r[0].map(s=>s.trim().toLowerCase());return r.slice(1).map(l=>{let a={};h.forEach((s,j)=>a[s]=l[j]||"");return a})}