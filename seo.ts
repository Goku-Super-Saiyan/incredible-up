// Search and sharing setup, applied at build time for whichever storefront VITE_BRAND picks.
// Adds the page description, social preview tags and structured data to index.html, a readable
// copy of the page for crawlers that don't run JavaScript, a Hindi home page at /hi/, the craft
// guide pages (/crafts/..., /odop/), robots.txt and sitemap.xml.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { brandFor } from "./src/brand/brand";
import { DISTRICTS } from "./src/data/districts";
import { CRAFT_PAGES, ODOP_INTRO, type CraftPage } from "./seo-pages";

type Env = Record<string, string | undefined>;
type Lang = "en" | "hi";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Only authenticup.in is indexed. Incredible UP shares the same pages, and two copies would
// split the ranking, so its build asks search engines to skip it unless VITE_SITE_URL is set.
const SITES = {
  authentic: { url: "https://www.authenticup.in", index: true },
  incredible: { url: "https://incredible-up.vercel.app", index: false },
};

const TEXT = {
  en: {
    title: (name: string) => `${name}: Banarasi Sarees, Bhadohi Carpets & Handicrafts of Uttar Pradesh`,
    description: "Handmade crafts of Uttar Pradesh, direct from the artisans: Banarasi silk sarees, Bhadohi carpets, Lucknow chikankari and One District One Product (ODOP) crafts from all 75 districts.",
    crafts: "Crafts of Uttar Pradesh", odop: "One District One Product: the craft of all 75 districts", contact: "Contact", enquire: "Send an enquiry",
    cats: { weave: "Textiles and weaves", craft: "Handicrafts", make: "Metal, leather and industry", food: "Food and fragrance" },
  },
  hi: {
    title: (name: string) => `${name}: बनारसी साड़ी, भदोही क़ालीन और उत्तर प्रदेश के हस्तशिल्प`,
    description: "उत्तर प्रदेश के हाथ से बने शिल्प, सीधे कारीगरों से: बनारसी सिल्क साड़ियाँ, भदोही के क़ालीन, लखनऊ की चिकनकारी और सभी 75 ज़िलों के 'एक ज़िला एक उत्पाद' (ODOP) शिल्प।",
    crafts: "उत्तर प्रदेश के शिल्प", odop: "एक ज़िला एक उत्पाद: सभी 75 ज़िलों के शिल्प", contact: "संपर्क", enquire: "पूछताछ भेजें",
    cats: { weave: "वस्त्र और बुनाई", craft: "हस्तशिल्प", make: "धातु, चमड़ा और उद्योग", food: "खान-पान और ख़ुशबू" },
  },
};

export function seo(env: Env): Plugin {
  const key = (env.VITE_BRAND || "").toLowerCase() === "authentic" ? "authentic" : "incredible";
  const brand = brandFor(key);
  const site = SITES[key];
  const url = (env.VITE_SITE_URL || site.url).replace(/\/$/, "");
  const index = site.index || !!env.VITE_SITE_URL;
  const name = env.VITE_BUSINESS_NAME || brand.name;
  const image = `${url}/og/${key}.jpg`;
  const logo = `${url}/og/logo-${key}.png`;
  const email = env.VITE_CONTACT_EMAIL;
  const phone = (env.VITE_PHONE || "").replace(/[^\d+]/g, "");
  const whatsapp = (env.VITE_WHATSAPP || "").replace(/\D/g, "");
  const address = env.VITE_BUSINESS_ADDRESS || "Varanasi, Uttar Pradesh, India";
  const social = (env.VITE_SOCIAL_LINKS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ga = env.VITE_GA_ID && /^G-[A-Z0-9]+$/.test(env.VITE_GA_ID) ? env.VITE_GA_ID : "";
  const home = (lang: Lang) => (lang === "hi" ? `${url}/hi/` : `${url}/`);
  const craftUrl = (c: CraftPage) => `${url}/crafts/${c.slug}/`;

  const store = {
    "@type": "Store",
    "@id": `${url}/#store`,
    name,
    alternateName: [brand.name, brand.hindi].filter((n) => n !== name),
    description: TEXT.en.description,
    url: `${url}/`,
    logo,
    image,
    ...(email && { email }),
    ...(phone && { telephone: phone }),
    address: { "@type": "PostalAddress", streetAddress: address.split(",")[0].trim(), addressLocality: "Varanasi", addressRegion: "Uttar Pradesh", addressCountry: "IN" },
    areaServed: { "@type": "Country", name: "India" },
    currenciesAccepted: "INR",
    knowsAbout: [...CRAFT_PAGES.map((c) => c.name), "One District One Product (ODOP)", "GI-tagged crafts of Uttar Pradesh"],
    ...(social.length && { sameAs: social }),
  };
  const ldJson = (graph: object[]) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;

  // Tags every page shares; each page adds its own title, description and address.
  const common = (p: { title: string; description: string; canonical: string; locale: string; alternates?: string }) => [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<meta name="robots" content="${index ? "index, follow, max-image-preview:large" : "noindex, follow"}" />`,
    `<link rel="canonical" href="${p.canonical}" />`,
    p.alternates || "",
    `<meta name="theme-color" content="#0E0720" />`,
    `<link rel="apple-touch-icon" href="/og/logo-${key}.png" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(name)}" />`,
    `<meta property="og:locale" content="${p.locale}" />`,
    `<meta property="og:url" content="${p.canonical}" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(`${name}, handmade crafts of Uttar Pradesh`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    env.VITE_GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${esc(env.VITE_GOOGLE_SITE_VERIFICATION)}" />` : "",
    env.VITE_BING_SITE_VERIFICATION ? `<meta name="msvalidate.01" content="${esc(env.VITE_BING_SITE_VERIFICATION)}" />` : "",
    ga ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>\n    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${ga}");</script>` : "",
  ].filter(Boolean);

  // The storefront's own head, in English (/) or Hindi (/hi/).
  const homeHead = (lang: Lang) => {
    const t = TEXT[lang];
    const shareTitle = lang === "en" && brand.slogan ? `${name} · ${brand.slogan}` : t.title(name);
    const alternates = [`<link rel="alternate" hreflang="en-IN" href="${home("en")}" />`, `<link rel="alternate" hreflang="hi-IN" href="${home("hi")}" />`, `<link rel="alternate" hreflang="x-default" href="${home("en")}" />`].join("\n    ");
    const website = { "@type": "WebSite", "@id": `${url}/#website`, url: `${url}/`, name, alternateName: [brand.name].filter((n) => n !== name), inLanguage: ["en-IN", "hi-IN"], publisher: { "@id": `${url}/#store` } };
    return [
      ...common({ title: t.title(name), description: t.description, canonical: home(lang), locale: lang === "hi" ? "hi_IN" : "en_IN", alternates })
        .map((tag) => (tag.startsWith("<meta property=\"og:title\"") || tag.startsWith("<meta name=\"twitter:title\"") ? tag.replace(esc(t.title(name)), esc(shareTitle)) : tag)),
      ldJson([store, website]),
    ].join("\n    ");
  };

  // What a crawler without JavaScript reads. React replaces it as soon as the app starts.
  const homeCopy = (lang: Lang) => {
    const t = TEXT[lang];
    const hi = lang === "hi";
    const byCat = (c: keyof typeof t.cats) => DISTRICTS.filter((d) => d.cat === c).map((d) => `<li>${esc(hi ? d.nameHi : d.name)}: ${esc(hi ? d.productHi : d.product)}</li>`).join("");
    const contact = [email && `<a href="mailto:${esc(email)}">${esc(email)}</a>`, phone && `<a href="tel:${phone}">${esc(phone)}</a>`, esc(address)].filter(Boolean).join(" · ");
    return `<div class="seo-copy">
      <h1>${esc(name)}${brand.slogan ? `: ${esc(brand.slogan)}` : ""}</h1>
      <p lang="hi">${esc(brand.hindi)}</p>
      <p>${esc(hi ? brand.hi.heroLine : brand.heroLine)}</p>
      <h2>${t.crafts}</h2>
      <ul>${CRAFT_PAGES.map((c) => `<li><a href="/crafts/${c.slug}/">${esc(hi ? c.hindi : c.name)}</a>, ${esc(c.place)}</li>`).join("")}</ul>
      <h2><a href="/odop/">${t.odop}</a></h2>
      ${(Object.keys(t.cats) as (keyof typeof t.cats)[]).map((c) => `<h3>${t.cats[c]}</h3><ul>${byCat(c)}</ul>`).join("\n      ")}
      <h2>${t.contact}</h2>
      <p>${contact}</p>
      <p><a href="/#enquire">${t.enquire}</a> · <a href="${hi ? "/" : "/hi/"}">${hi ? "English" : "हिन्दी"}</a> · <a href="/#privacy">Privacy</a> · <a href="/#terms">Terms</a> · <a href="/#shipping">Shipping</a> · <a href="/#returns">Returns</a></p>
    </div>`;
  };

  // A craft guide or ODOP page: plain HTML in the site's colours, with links back into the shop.
  const wa = (text: string) => (whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}` : "/#enquire");
  const guide = (p: { path: string; title: string; description: string; crumb: string; body: string; ask: string }) => {
    const canonical = `${url}${p.path}`;
    const crumbs = { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: name, item: `${url}/` }, { "@type": "ListItem", position: 2, name: p.crumb, item: canonical }] };
    const page = { "@type": "WebPage", "@id": canonical, url: canonical, name: p.title, description: p.description, inLanguage: "en-IN", isPartOf: { "@id": `${url}/#website` }, publisher: { "@id": `${url}/#store` } };
    const others = CRAFT_PAGES.filter((c) => `/crafts/${c.slug}/` !== p.path).map((c) => `<a href="/crafts/${c.slug}/">${esc(c.name)}</a>`).join("");
    return `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${common({ title: `${p.title} | ${name}`, description: p.description, canonical, locale: "en_IN" }).join("\n    ")}
    ${ldJson([page, crumbs, store])}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rozha+One&family=Mukta:wght@400;500;600&display=swap" />
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #0E0720; color: #FFF4E2; font: 17px/1.65 Mukta, system-ui, sans-serif; }
      a { color: #FFB627; }
      header, main, footer { max-width: 820px; margin: 0 auto; padding: 0 20px; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 18px; padding-bottom: 18px; border-bottom: 1px solid #ffffff1a; }
      header a.home { display: flex; align-items: center; gap: 10px; color: #FFF4E2; text-decoration: none; font: 26px "Rozha One", Georgia, serif; }
      header img { width: 34px; height: auto; }
      header nav a { font-weight: 600; text-decoration: none; }
      .crumb { margin-top: 28px; font-size: 14px; color: #B7A8CF; }
      .crumb a { color: #B7A8CF; }
      h1, h2, h3 { font-family: "Rozha One", Georgia, serif; font-weight: 400; line-height: 1.05; text-wrap: balance; }
      h1 { font-size: clamp(38px, 7vw, 64px); margin: 12px 0 6px; }
      .hindi { color: #FFB627; font-weight: 600; margin: 0; }
      h2 { font-size: clamp(28px, 4.5vw, 38px); color: #E7BE63; margin: 44px 0 10px; }
      h3 { font-size: 22px; color: #E7BE63; margin: 26px 0 6px; }
      ul { padding-left: 20px; }
      li { margin: 4px 0; }
      .marks { display: grid; gap: 14px; padding: 0; list-style: none; }
      .marks li { padding: 16px 18px; border: 1px solid #E7BE6333; border-radius: 14px; background: #1E0F3D; }
      .marks strong { display: block; color: #E7BE63; }
      .ctas { display: flex; flex-wrap: wrap; gap: 12px; margin: 30px 0; }
      .btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 22px; border-radius: 999px; font-weight: 600; text-decoration: none; }
      .btn.gold { background: linear-gradient(120deg, #FFE7A6, #E7BE63 45%, #B8862B); color: #0E0720; }
      .btn.line { border: 1px solid #E7BE6366; color: #FFF4E2; }
      .others { display: flex; flex-wrap: wrap; gap: 8px; }
      .others a { padding: 6px 14px; border: 1px solid #ffffff22; border-radius: 999px; text-decoration: none; color: #FFF4E2; font-size: 15px; }
      .cols { columns: 2 240px; }
      footer { margin-top: 64px; padding-top: 24px; padding-bottom: 48px; border-top: 1px solid #ffffff1a; color: #B7A8CF; font-size: 15px; }
    </style>
  </head>
  <body>
    <header><a class="home" href="/"><img src="/brand/${key === "authentic" ? "authentic-v3" : "v3"}/emblem-full.svg" alt="" />${esc(name)}</a><nav><a href="/#bazaar">Shop</a></nav></header>
    <main>
      <p class="crumb"><a href="/">${esc(name)}</a> › ${esc(p.crumb)}</p>
      ${p.body}
      <div class="ctas">
        <a class="btn gold" href="${wa(p.ask)}">Ask on WhatsApp</a>
        <a class="btn line" href="/#enquire">Send an enquiry</a>
        <a class="btn line" href="/#bazaar">See pieces in the bazaar</a>
      </div>
      <h2>More crafts of Uttar Pradesh</h2>
      <div class="others">${others}${p.path === "/odop/" ? "" : `<a href="/odop/">All 75 ODOP crafts</a>`}</div>
    </main>
    <footer>${esc(name)} · ${esc(brand.slogan || brand.footerLine)}<br />${[email && `<a href="mailto:${esc(email)}">${esc(email)}</a>`, phone && `<a href="tel:${phone}">${esc(phone)}</a>`, esc(address)].filter(Boolean).join(" · ")}</footer>
  </body>
</html>
`;
  };

  const craftBody = (c: CraftPage) => `<h1>${esc(c.name)}</h1>
      <p class="hindi" lang="hi">${esc(c.hindi)} · ${esc(c.place)}</p>
      ${c.intro.map((t) => `<p>${esc(t)}</p>`).join("\n      ")}
      ${c.kinds ? `<h2>Kinds you can order</h2><ul>${c.kinds.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>` : ""}
      <h2>How to tell it is real</h2>
      <ul class="marks">${c.marks.map(([h, t]) => `<li><strong>${esc(h)}</strong>${esc(t)}</li>`).join("")}</ul>
      <h2>Buying from ${esc(name)}</h2>
      <p>Every piece we list names the ${esc(c.place)} family or collective that made it, and is sent to you by them. Tell us the colour, size, budget and date you need it by, and we will confirm the piece, price and making time before you pay. Registered GI: ${esc(c.gi)}.</p>`;

  const odopBody = () => `<h1>One District One Product (ODOP) crafts of Uttar Pradesh</h1>
      <p class="hindi" lang="hi">एक ज़िला एक उत्पाद · 75 ज़िले</p>
      ${ODOP_INTRO.map((t) => `<p>${esc(t)}</p>`).join("\n      ")}
      ${(Object.keys(TEXT.en.cats) as (keyof typeof TEXT.en.cats)[]).map((cat) => `<h2>${TEXT.en.cats[cat]}</h2><ul class="cols">${DISTRICTS.filter((d) => d.cat === cat).map((d) => `<li><strong>${esc(d.name)}</strong>: ${esc(d.product)}</li>`).join("")}</ul>`).join("\n      ")}`;

  const pages = [
    ...CRAFT_PAGES.map((c) => ({ path: `/crafts/${c.slug}/`, html: guide({ path: `/crafts/${c.slug}/`, title: c.title, description: c.description, crumb: c.name, body: craftBody(c), ask: `Namaste, I'm looking for ${c.name} from ${c.place}.` }) })),
    { path: "/odop/", html: guide({ path: "/odop/", title: "ODOP Products of All 75 Districts of Uttar Pradesh", description: "The One District One Product (ODOP) craft of every district of Uttar Pradesh, from Agra leather to Varanasi silk, and how to buy direct from the makers.", crumb: "ODOP crafts of 75 districts", body: odopBody(), ask: "Namaste, I'm looking for an ODOP product from Uttar Pradesh." }) },
  ];

  let outDir = "dist";
  const today = new Date().toISOString().slice(0, 10);
  const sitemapUrl = (loc: string, priority: string, extra = "") => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>${extra}\n  </url>`;
  const homeAlternates = `\n    <xhtml:link rel="alternate" hreflang="en-IN" href="${home("en")}" />\n    <xhtml:link rel="alternate" hreflang="hi-IN" href="${home("hi")}" />\n    <image:image><image:loc>${image}</image:loc></image:image>`;

  return {
    name: "seo",
    configResolved: (c) => { outDir = c.build.outDir; },
    transformIndexHtml: (html) =>
      html
        .replace(/<title>[^<]*<\/title>/, `<!--seo-head-->\n    ${homeHead("en")}\n    <!--/seo-head-->`)
        .replace('<div id="root"></div>', `<div id="root"><!--seo-copy-->${homeCopy("en")}<!--/seo-copy--></div>`),
    closeBundle() {
      const dir = (p: string) => { mkdirSync(join(outDir, p), { recursive: true }); return join(outDir, p); };
      // /hi/ is the same app with Hindi head and copy; asset links become absolute so they work one folder down.
      const built = readFileSync(join(outDir, "index.html"), "utf8");
      const hi = built
        .replace('<html lang="en-IN">', '<html lang="hi">')
        .replace(/<!--seo-head-->[\s\S]*<!--\/seo-head-->/, `<!--seo-head-->\n    ${homeHead("hi")}\n    <!--/seo-head-->`)
        .replace(/<!--seo-copy-->[\s\S]*<!--\/seo-copy-->/, `<!--seo-copy-->${homeCopy("hi")}<!--/seo-copy-->`)
        .replace(/(src|href)="\.\//g, '$1="/');
      writeFileSync(join(dir("hi"), "index.html"), hi);
      for (const p of pages) writeFileSync(join(dir(p.path), "index.html"), p.html);

      writeFileSync(join(outDir, "robots.txt"), index ? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${url}/sitemap.xml\n` : "User-agent: *\nAllow: /\n");
      if (index) writeFileSync(join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[
  sitemapUrl(home("en"), "1.0", homeAlternates),
  sitemapUrl(home("hi"), "0.9", homeAlternates),
  ...CRAFT_PAGES.map((c) => sitemapUrl(craftUrl(c), "0.8")),
  sitemapUrl(`${url}/odop/`, "0.8"),
].join("\n")}
</urlset>
`);
    },
  };
}
