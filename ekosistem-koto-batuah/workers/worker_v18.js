/**
 * KOTO BATUAH ECOSYSTEM v18.0.0 - GLOBAL FALLBACK ENGINE
 * Technology Partner: James (Jim Koto)
 * Principle: "Time is Precious Currency" - One Config for All Domains
 */

const CONFIG = {
  CSV_PUB_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vST8FRhHwsV9E96CIpQGGXqU86cbbTdTLX03yNzBBeu5pPnOpMtKGb7XccGc9V0ZcB5ALHaP4t9Yy40/pub?output=csv",
  DEFAULT_CONFIG_DOMAIN: "portaltangerangraya.com" // Pusat kendali AdSense/GA Anda
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const domain = url.hostname.toLowerCase().replace('www.', '');
    const path = url.pathname === "/" ? "home" : url.pathname.replace(/^\/|\/$/g, "");

    try {
      const res = await fetch(CONFIG.CSV_PUB_URL, { cf: { cacheTtl: 1 } });
      const csv = await res.text();
      const allData = parseCSV(csv);
      
      const siteData = allData.filter(d => d.domain.trim().toLowerCase() === domain);
      if (siteData.length === 0 && domain !== CONFIG.DEFAULT_CONFIG_DOMAIN) return new Response("Domain Not Registered", { status: 404 });

      // Fungsi pencari Config (Cari di domain sendiri, jika tidak ada cari di domain pusat)
      const getConfig = (slug) => {
        return allData.find(d => d.domain === domain && d.slug === slug) || 
               allData.find(d => d.domain === CONFIG.DEFAULT_CONFIG_DOMAIN && d.slug === slug);
      };

      // 1. ADS.TXT HANDLER
      if (path === "ads.txt") {
        const adsRecord = getConfig("_config_adsense");
        return new Response(adsRecord ? adsRecord.content : "", { headers: { 'Content-Type': 'text/plain' } });
      }

      // 2. SITEMAP XML
      if (path === "sitemap.xml") {
        return new Response(generateSitemap(siteData, url.origin), { headers: { 'Content-Type': 'application/xml' } });
      }

      // 3. BLOG INDEX
      if (path === "blog") {
        const posts = siteData.filter(d => d.type === 'post' && d.category === 'blog');
        return new Response(renderBlogIndex(posts, domain), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }

      // 4. PAGE ROUTING
      const page = siteData.find(d => d.slug === path);
      if (page) {
        const globalConfig = getConfig("_config_global");
        let html = page.html && page.html.trim().length > 50 ? decodeBase64(page.html) : renderFallback(page, domain);
        
        // Injeksi Global Scripts (GA/Ads) secara otomatis
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

// --- HELPERS ---
function generateSitemap(data, origin) {
  const urls = data.filter(d => !d.slug.startsWith('_')).map(d => `<url><loc>${origin}/${d.slug === 'home' ? '' : d.slug}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

function renderBlogIndex(posts, domain) {
  const list = posts.map(p => `<a href="/${p.slug}" style="display:block;padding:15px;border:1px solid #333;margin-bottom:10px;color:#4ade80;text-decoration:none;border-radius:10px"><h3>${p.title}</h3></a>`).join('');
  return `<!DOCTYPE html><html lang="id"><body style="background:#020617;color:white;font-family:sans-serif;padding:30px"><h1>Blog ${domain}</h1>${list}</body></html>`;
}

function renderFallback(p, d) {
  return `<!DOCTYPE html><html><body style="background:#020617;color:white;padding:50px"><h1>${p.title}</h1><p>${p.description || p.content}</p></body></html>`;
}

function decodeBase64(d){try{let b=atob(d.trim()),y=new Uint8Array(b.length);for(let i=0;i<b.length;i++)y[i]=b.charCodeAt(i);return new TextDecoder().decode(y)}catch(e){return d}}
function parseCSV(t){let r=[],o=[],c="",q=!1;for(let i=0;i<t.length;i++){let x=t[i],n=t[i+1];if(q&&x==='"'&&n==='"' ){c+='"';i++}else if(x==='"')q=!q;else if(x===","&&!q){o.push(c);c=""}else if((x==="\n"||x==="\r")&&!q){if(c!==""||o.length>0){o.push(c);r.push(o);o=[];c=""}}else c+=x}if(c!==""||o.length>0){o.push(c);r.push(o)}let h=r[0].map(s=>s.trim().toLowerCase());return r.slice(1).map(l=>{let a={};h.forEach((s,j)=>a[s]=l[j]||"");return a})}