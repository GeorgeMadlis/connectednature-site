import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRootCandidates = [
  process.env.CONNECTED_ESTONIAN_SOURCE,
  path.join(root, "connected_estonian"),
  path.join(root, "connectednature_estonian"),
  "/Users/server/projects/uploaded_artifacts/connectednature_estonian",
].filter(Boolean);
const sourceRoot = sourceRootCandidates.find((candidate) => fs.existsSync(candidate));
const siteRoot = path.join(root, "site");
const etRoot = path.join(siteRoot, "et");
const etPostsRoot = path.join(etRoot, "posts");

if (!sourceRoot) {
  throw new Error(`Could not find Estonian source files. Checked: ${sourceRootCandidates.join(", ")}`);
}

fs.mkdirSync(etPostsRoot, { recursive: true });

const posts = [
  {
    slug: "complexity-threshold",
    source: "posts/complexity-threshold.et.md",
    label: "Esimene uurimus",
    enTitle: "Civilization Complexity Threshold",
    lastUpdated: "15. aprill 2026",
  },
  {
    slug: "ecological-limits-in-transactions",
    source: "posts/ecological-limits-in-transactions.et.md",
    label: "Teine uurimus",
    enTitle: "Ecological Limits in Transactions",
    lastUpdated: "21. aprill 2026",
  },
  {
    slug: "ancient-traditions-quantum-field",
    source: "posts/ancient-traditions-quantum-field.et.md",
    label: "Kolmas uurimus",
    enTitle: "Ancient Traditions And The Quantum Field",
    lastUpdated: "2. mai 2026",
  },
];

function readSource(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value) {
  let output = escapeHtml(value);
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  return output;
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { data: {}, body: markdown };
  }

  const data = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    data[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return { data, body: markdown.slice(match[0].length) };
}

function cleanArticleMarkdown(markdown) {
  const { data, body } = frontmatter(markdown);
  const cleanedLines = [];
  let skippingPostList = false;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "# Töös olev artikkel") continue;
    if (trimmed === "Avaleht | Lähemalt | Meetod") continue;
    if (trimmed === "Postitused:") {
      skippingPostList = true;
      continue;
    }
    if (skippingPostList && trimmed.startsWith("- ")) continue;
    if (skippingPostList && trimmed === "") {
      skippingPostList = false;
      continue;
    }

    cleanedLines.push(line);
  }

  return { data, body: cleanedLines.join("\n").trim() };
}

function blocksToHtml(markdown) {
  const lines = markdown.split("\n");
  const parts = [];
  let paragraph = [];
  let list = null;
  let quote = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    parts.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    const className = list.type === "ol" ? ' class="process-list process-list-numbered"' : "";
    parts.push(`<${list.type}${className}>\n${list.items.map((item) => `  <li>${inlineMarkdown(item)}</li>`).join("\n")}\n</${list.type}>`);
    list = null;
  }

  function flushQuote() {
    if (!quote.length) return;
    parts.push(`<p class="statement-block">${inlineMarkdown(quote.join(" "))}</p>`);
    quote = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      quote.push(trimmed.slice(2));
      continue;
    }

    const unordered = trimmed.match(/^- (.*)$/);
    if (unordered) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = trimmed.match(/^[1-9]\.\s+([A-ZÕÄÖÜ].*)$/);
    if (ordered) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return parts.join("\n");
}

function articleBody(markdown, fallbackLabel) {
  const { data, body } = cleanArticleMarkdown(markdown);
  const lines = body.split("\n");
  const labelIndex = lines.findIndex((line) => /^#{1,2}\s+/.test(line.trim()));
  const label = labelIndex >= 0 ? lines[labelIndex].replace(/^#{1,2}\s+/, "").trim() : fallbackLabel;
  const titleIndex = lines.findIndex((line, index) => index > labelIndex && line.trim().startsWith("# "));
  const title = data.title || (titleIndex >= 0 ? lines[titleIndex].replace(/^#\s+/, "").trim() : "");

  const remainder = lines.slice(titleIndex + 1).join("\n").trim();
  const firstSectionIndex = remainder.search(/\n##\s+/);
  const leadMarkdown = firstSectionIndex >= 0 ? remainder.slice(0, firstSectionIndex).trim() : "";
  const sectionMarkdown = firstSectionIndex >= 0 ? remainder.slice(firstSectionIndex + 1).trim() : remainder;

  const sections = [];
  for (const chunk of sectionMarkdown.split(/\n(?=##\s+)/)) {
    const clean = chunk.trim();
    if (!clean.startsWith("## ")) continue;
    const [headingLine, ...contentLines] = clean.split("\n");
    const heading = headingLine.replace(/^##\s+/, "").trim();
    sections.push(`<section class="article-section">\n  <h2>${inlineMarkdown(heading)}</h2>\n${blocksToHtml(contentLines.join("\n")).split("\n").map((line) => `  ${line}`).join("\n")}\n</section>`);
  }

  return {
    label,
    title,
    leadHtml: blocksToHtml(leadMarkdown),
    sectionsHtml: sections.join("\n\n"),
  };
}

function navEt(current, depth = 0) {
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  const currentAttr = (page) => (current === page ? ' aria-current="page"' : "");
  return `<nav class="site-nav" aria-label="Peamine">
        <a${currentAttr("home")} href="${prefix}index.html">Avaleht</a>
        <a${currentAttr("about")} href="${prefix}about.html">Lähemalt</a>
        <a${currentAttr("method")} href="${prefix}method.html">Meetod</a>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle${current === "posts" ? " active" : ""}">Postitused ▾</button>
          <div class="nav-dropdown-menu">
            <a href="${prefix}posts/complexity-threshold.html">Tsivilisatsiooni keerukuse lävi</a>
            <a href="${prefix}posts/ecological-limits-in-transactions.html">Ökoloogilised piirid tehingutes</a>
            <a href="${prefix}posts/ancient-traditions-quantum-field.html">Muistsed traditsioonid ja kvantväli</a>
          </div>
        </div>
        <div class="language-switch" aria-label="Keel">
          <a href="${englishPath(current, depth)}">EN</a>
          <a class="is-active" href="${currentEtPath(current, depth)}" aria-current="true">ET</a>
        </div>
      </nav>`;
}

function englishPath(current, depth) {
  if (current === "home") return depth === 0 ? "../index.html" : "../../index.html";
  if (current === "about") return "../about.html";
  if (current === "method") return "../method.html";
  return `../../posts/${currentPostSlug}.html`;
}

let currentPostSlug = "";

function currentEtPath(current, depth) {
  if (current === "posts") return `${currentPostSlug}.html`;
  return current === "home" ? "index.html" : `${current}.html`;
}

function pageTemplate({ title, description, current, depth = 0, main, footerNote }) {
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  const sitePrefix = depth === 0 ? "../" : "../../";
  const enHref = englishPath(current, depth);
  const etHref = current === "posts" ? `${currentPostSlug}.html` : `${current === "home" ? "index" : current}.html`;

  return `<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ConnectedNature</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="alternate" hreflang="en" href="${enHref}">
  <link rel="alternate" hreflang="et" href="${etHref}">
  <link rel="stylesheet" href="${sitePrefix}style.css">
</head>
<body>
  <a class="skip-link" href="#main">Liigu sisu juurde</a>
  <header class="site-header">
    <div class="wrap site-header-inner">
      <div class="brand-block">
        <p class="eyebrow">Eksperimentaalne uurimiskeskkond</p>
        <a class="site-title" href="${prefix}index.html">ConnectedNature</a>
      </div>
      ${navEt(current, depth)}
    </div>
  </header>

${main}

  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div>
        <p class="eyebrow">ConnectedNature</p>
        <p class="footer-note">${footerNote}</p>
      </div>
      <nav class="footer-nav" aria-label="Jalus">
        <a href="${prefix}index.html">Avaleht</a>
        <a href="${prefix}about.html">Lähemalt</a>
        <a href="${prefix}method.html">Meetod</a>
        <a href="${prefix}posts/complexity-threshold.html">Tsivilisatsiooni keerukuse lävi</a>
        <a href="${prefix}posts/ecological-limits-in-transactions.html">Ökoloogilised piirid tehingutes</a>
        <a href="${prefix}posts/ancient-traditions-quantum-field.html">Muistsed traditsioonid ja kvantväli</a>
      </nav>
    </div>
  </footer>
</body>
</html>
`;
}

function write(file, content) {
  fs.writeFileSync(path.join(siteRoot, file), content);
}

function homePage() {
  return pageTemplate({
    title: "ConnectedNature",
    description: "ConnectedNature on eksperimentaalne tehisintellekti toel toimiv uurimiskeskkond seotuse uurimiseks looduse, ökoloogia, ühiskonna, teadmiste ja ajaloo lõikes.",
    current: "home",
    footerNote: "Rahulik avalik uurimisjälg seotusest looduslike, sotsiaalsete ja ajalooliste süsteemide lõikes.",
    main: `  <main id="main">
    <section class="hero">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">Tehisintellekti toel uurimus seotusest</p>
          <h1>Eksperimentaalne leht, mis uurib, kuidas ökoloogilised, sotsiaalsed ja ajaloolised süsteemid omavahel seostuvad.</h1>
          <p class="lead">ConnectedNature uurib seotust looduse, ökoloogia, ühiskonna, teadmiste, ajaloo ja inimlike süsteemide lõikes. Iga artikkel algab väitest või küsimusest ning liigub seejärel tõendite, allikate hindamise ja sünteesi kaudu.</p>
          <ul class="hero-points" aria-label="Kuidas leht töötab">
            <li>Algab lähteväitest või küsimusest</li>
            <li>Kontrollib seda allikate ja konkureerivate tõlgenduste suhtes</li>
            <li>Eristab lähteväidet uurimistööl põhinevast järeldusest</li>
          </ul>
        </div>

        <aside class="hero-note" aria-label="Kuidas ConnectedNature uurimusi avaldab">
          <p class="eyebrow">Kuidas lehte lugeda</p>
          <div class="note-block">
            <p class="note-label">Lähteväide</p>
            <p class="note-text">Avaosas esitatud väide on uuritav propositsioon.</p>
          </div>
          <div class="note-block">
            <p class="note-label">Uurimistööl põhinev järeldus</p>
            <p class="note-text">Järeldus kirjutatakse alles pärast tõendite kogumist ja kontrollimist.</p>
          </div>
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="wrap intro-grid">
        <article class="panel">
          <p class="eyebrow">Meetod lühidalt</p>
          <h2>Väitest sünteesini</h2>
          <p>Leht algab väite või küsimusega, mis on uurimiseks piisavalt täpne. Seejärel kogutakse asjakohane materjal, hinnatakse, mida iga allikas tegelikult toetada suudab, võrreldakse tõsiseltvõetavaid tõlgendusi ning lõpetatakse sünteesiga.</p>
        </article>

        <article class="panel">
          <p class="eyebrow">ConnectedNature ja COIN</p>
          <h2>Avalik kirjutamine, mida toetab nähtav uurimistöö voog</h2>
          <p>ConnectedNature on tehisintellekti toel tehtava uurimistöö avalik leht. COIN on selle taga olev uurimistöö ja päritolu jälgimise töövoog.</p>
          <p>Tehisintellekt võib aidata otsingu, võrdluse ja mustandite koostamisega, kuid tõlgendus jääb inimliku kriitilise juhtimise alla.</p>
        </article>
      </div>
    </section>

    <section class="section section-tinted">
      <div class="wrap">
        <div class="section-heading">
          <p class="eyebrow">Esiletõstetud postitused</p>
          <h2>Kolm uurimust seotuse, piiride ja tähenduse kohta</h2>
          <p class="section-intro">Iga artikkel käsitleb algset väidet uuritava propositsioonina, mitte teesina, mida lihtsalt korrata.</p>
        </div>

        ${featureCard("complexity-threshold", "On olemas keerukuse lävi, mida ükski tsivilisatsioon pole kunagi üle elanud", "Esimene artikkel küsib, kas ajaloolised ühiskonnad seisavad korduvalt silmitsi haldusliku, energeetilise, informatsioonilise või ökoloogilise keerukuse lävedega.", "On olemas keerukuse lävi, mida ükski tsivilisatsioon pole kunagi üle elanud.", "Ajaloolised juhtumid, ökoloogilised piirid, allikate hindamine ja konkureerivad käsitlused.", "Tõendusrajale vastav uurimistööl põhinev järeldus.")}
        ${featureCard("ecological-limits-in-transactions", "Ökoloogilised piirid jäävad poliitiliselt nõrgaks, kuni need ehitatakse tehingutesse endisse", "Teine artikkel kontrollib väidet, et keskkonnapiiranguid ei saa muuta püsivaks üksnes maksude, standardite või aruandluse kaudu.", "Ökoloogilised piirid jäävad poliitiliselt nõrgaks, kuni need ehitatakse tehingutesse endisse.", "ELi heitkogustega kauplemise süsteemi kogemus, mehhanismidisain ja valitsemise stressitestimine.", "Süntees, mis kitsendab väidet, ilma et heidaks kõrvale selle struktuurset taipamist.")}
        ${featureCard("ancient-traditions-quantum-field", "Kas muistsed traditsioonid kirjeldasid kvantvälja?", "Kolmas artikkel eristab tegelikku filosoofilist kõla ajalooliselt ja teaduslikult põhjendamata samasusväidetest.", "Muistsed traditsioonid olid juba kaardistanud territooriumi, kuhu füüsika alles nüüd sisenes.", "Kvantväljateooria, mõõtmine, muistsed allikad ja füüsikute kronoloogia.", "Süntees, mis säilitab kõla, kuid lükkab tagasi ülepingutatud tõendusväited.")}
      </div>
    </section>

    <section class="section section-trail">
      <div class="wrap trail-grid">
        <div>
          <p class="eyebrow">Uurimisjälg</p>
          <h2>Avalikud lehed jäävad seotuks oma tööandmestikuga</h2>
          <p>GitHubi kasutatakse siin loetava uurimisjäljena, mitte tehnilise vitriinina. Lugeja peaks saama liikuda avalikust artiklist selle aluseks oleva andmestikuni.</p>
        </div>

        <ul class="trail-list">
          <li><a href="https://github.com/GeorgeMadlis/coin/tree/main/research/complexity-of-civilizations" target="_blank" rel="noopener noreferrer">Küsimuse kaust GitHubis</a></li>
          <li><a href="https://github.com/GeorgeMadlis/coin/blob/main/research/complexity-of-civilizations/authors.md" target="_blank" rel="noopener noreferrer">Autori- ja teose märkmed GitHubis</a></li>
          <li><a href="https://github.com/GeorgeMadlis/coin/blob/main/research/complexity-of-civilizations/critical-overview.md" target="_blank" rel="noopener noreferrer">Kriitiline ülevaade GitHubis</a></li>
        </ul>
      </div>
    </section>
  </main>`,
  });
}

function featureCard(slug, title, summary, statement, pathText, follows) {
  return `<article class="feature-card">
          <div class="feature-copy">
            <p class="meta">Töös olev artikkel</p>
            <h3><a href="posts/${slug}.html">${title}</a></h3>
            <p>${summary}</p>
          </div>
          <div class="feature-tags" aria-label="Postituse struktuur">
            <div class="feature-tag-group">
              <p class="feature-tag-label">Lähteväide</p>
              <p>${statement}</p>
            </div>
            <div class="feature-tag-group">
              <p class="feature-tag-label">Uurimistee</p>
              <p>${pathText}</p>
            </div>
            <div class="feature-tag-group">
              <p class="feature-tag-label">Mis järgneb</p>
              <p>${follows}</p>
            </div>
          </div>
        </article>`;
}

function aboutPage() {
  return pageTemplate({
    title: "Lähemalt",
    description: "Lähemalt ConnectedNature'ist, selle uurimisküsimustest ja COINi rollist avaliku uurimistöö voos.",
    current: "about",
    footerNote: "Uurimus avalikuks tehtud hoolika sõnastuse, tõendite, hindamise ja sünteesi kaudu.",
    main: `  <main id="main" class="page-main">
    <div class="wrap page-intro">
      <p class="eyebrow">Lähemalt</p>
      <h1>ConnectedNature on avalik uurimisjälg seotuse kohta.</h1>
      <p class="lead">Leht uurib, kuidas süsteemid suhestuvad: ökoloogilised võrgustikud, sotsiaalne koordineerimine, ajalooline muutus, teadmise kujunemine, taristu ning tingimused, mille all seotusest saab vastupanuvõime, haprus, läbipaistmatus või lagunemine.</p>
    </div>

    <div class="wrap page-grid">
      <section class="panel">
        <h2>Mis ConnectedNature on</h2>
        <p>ConnectedNature on eksperimentaalne veebileht valitud väidete ja ideede tehisintellekti toel valideerimiseks. See avaldab hoolikalt struktureeritud lehti, mitte kiiret kommentaari.</p>
        <p>Leht huvitub suhetest, mitte isoleeritud faktidest: kuidas ökoloogilised ja inimlikud süsteemid kattuvad, kuidas institutsioonid vahendavad keerukust ning kuidas teadmisi korraldatakse.</p>
      </section>

      <section class="panel">
        <h2>Milliseid küsimusi see uurib</h2>
        <p>Tüüpilised küsimused on piisavalt laiad, et olla olulised, ja piisavalt kitsad, et neid uurida. Need võivad küsida, kas korduv muster ilmneb tsivilisatsioonide lõikes või kas levinud väide peab ajaloolisele kontrollile vastu.</p>
        <p>Erilist tähelepanu saavad läveväited, süsteemitasandi seletused, kategooriavead ja argumendid, mis liiguvad metafoorist järelduseni liiga kiiresti.</p>
      </section>

      <section class="panel">
        <h2>Miks lehed algavad väitest või küsimusest</h2>
        <p>Uurimus vajab lähtekohta. Väide või küsimus annab lehele suuna ja laseb lugejal täpselt näha, mida kontrollitakse.</p>
        <p>ConnectedNature'is ei käsitleta avaväidet kindla tõena. See on ajend tõendite kogumiseks ja hindamiseks.</p>
      </section>

      <section class="panel">
        <h2>Kuidas tehisintellekti kasutatakse</h2>
        <p>Tehisintellekt võib aidata otsingu, võrdluse, struktureerimise, kokkuvõtete või mustanditega, kuid ainult inimliku kriitilise juhtimise all.</p>
        <p>Eesmärk ei ole mõtlemist automatiseerida. Eesmärk on muuta uurimistöö osad paremini nähtavaks, jättes vastutuse tõlgenduse eest selgelt inimesele.</p>
      </section>

      <section class="panel panel-wide">
        <h2>Kuidas COIN seostub avaliku veebilehega</h2>
        <p>COIN on ConnectedNature'i taga olev uurimismootor ja päritolu jälgimise töövoog. Avalik leht on koht, kus töö muutub loetavaks; COIN on koht, kus tööjälg jääb kontrollitavaks.</p>
        <p>Praktikas tähendab see, et avalik artikkel saab viidata GitHubis olevale uurimisjäljele: küsimuselogidele, allikaregistritele, hindamismärkmetele ja muudatuste ajaloole.</p>
      </section>
    </div>
  </main>`,
  });
}

function methodPage() {
  return pageTemplate({
    title: "Meetod",
    description: "ConnectedNature'i meetod: kuidas väidetest saavad uuritud artiklid tõendite kogumise, allikate hindamise, sünteesi ja GitHubi-põhise päritolujälje kaudu.",
    current: "method",
    footerNote: "Avalik meetod seotuse uurimiseks ilma päritolujälge peitmata.",
    main: `  <main id="main" class="page-main">
    <div class="wrap page-intro">
      <p class="eyebrow">Meetod</p>
      <h1>Kuidas väitest saab uuritud artikkel</h1>
      <p class="lead">ConnectedNature kasutab lihtsat, kuid distsiplineeritud töövoogu: sõnasta väide, kogu tõendeid, hinda allikaid, kontrolli konkureerivaid tõlgendusi ja kirjuta süntees, mis jääb oma piiride suhtes ausaks.</p>
    </div>

    <div class="wrap method-layout">
      <section class="panel panel-wide">
        <h2>Väitest artikliks</h2>
        <ol class="process-list process-list-numbered">
          <li><strong>Lähteväide või küsimus.</strong> Uurimus algab millegi piisavalt täpsega, mida saab kontrollida.</li>
          <li><strong>Tõendite kogumine.</strong> Asjakohane materjal kogutakse esmastest allikatest, teadustööst, ajaloolistest juhtumitest, ökoloogilistest uuringutest ning vajadusel tehnilistest või institutsionaalsetest dokumentidest.</li>
          <li><strong>Allikate hindamine.</strong> Iga allikat loetakse meetodi, ulatuse, usaldusväärsuse, konteksti ja võimalike pimealade suhtes.</li>
          <li><strong>Konkureerivad tõlgendused.</strong> Leht nimetab mitu tõsiseltvõetavat seletust, kui tõendid seda võimaldavad.</li>
          <li><strong>Kriitiline süntees.</strong> Artikkel ütleb, mida tõendid toetavad, mida need ainult viitavad ja mis jääb lahendamata.</li>
        </ol>
      </section>

      <section class="panel">
        <h2>Mis loeb tõendiks</h2>
        <p>Tõendiks võivad olla ajaloolised dokumendid, ökoloogilised vaatlused, eelretsenseeritud teadustöö, võrdlevad andmestikud, arhiivimaterjal ja hoolikalt piiritletud teoreetiline töö.</p>
      </section>

      <section class="panel">
        <h2>Miks allikate hindamine loeb</h2>
        <p>Allikad ei kanna sama kaalu. Elav juhtumiuuring võib valgustada mehhanismi, jäädes samas ebatüüpiliseks. Laiahaardeline teooria võib pakkuda seletusjõudu, peites ebakindlust.</p>
      </section>

      <section class="panel">
        <h2>Miks süntees erineb arvamusest</h2>
        <p>Arvamus algab eelistusest ja korraldab materjali selle ümber. Süntees algab tõendusrajast ja püüab kirjeldada seda, mida andmestik kanda suudab.</p>
      </section>

      <section class="panel panel-wide">
        <h2>Kuidas uurimisjälg GitHubiga seostub</h2>
        <p>ConnectedNature'i artikkel on avalik proosa. Selle uurimisjälg on tööandmestik. GitHubi kasutatakse, et teha see jälg nähtavaks versioonitud märkmete, allikaregistrite, küsimuse ajaloo ja paranduste kaudu.</p>
        <ul class="trail-list compact-trail-list">
          <li><a href="https://github.com/GeorgeMadlis/coin/tree/main/research/complexity-of-civilizations" target="_blank" rel="noopener noreferrer">Näidis-uurimiskaust</a></li>
          <li><a href="https://github.com/GeorgeMadlis/coin/blob/main/research/complexity-of-civilizations/claims.md" target="_blank" rel="noopener noreferrer">Näidis-väidete register</a></li>
          <li><a href="https://github.com/GeorgeMadlis/coin/blob/main/research/complexity-of-civilizations/critical-overview.md" target="_blank" rel="noopener noreferrer">Näidis-paranduste jälg</a></li>
        </ul>
      </section>
    </div>
  </main>`,
  });
}

write("et/index.html", homePage());
write("et/about.html", aboutPage());
write("et/method.html", methodPage());

for (const post of posts) {
  currentPostSlug = post.slug;
  const article = articleBody(readSource(post.source), post.label);
  const main = `  <main id="main" class="page-main article-main">
    <article class="wrap article">
      <header class="article-header">
        <p class="eyebrow">${article.label}</p>
        <h1>${inlineMarkdown(article.title)}</h1>
        ${article.leadHtml.split("\n").map((line) => `        ${line}`).join("\n")}
      </header>

${article.sectionsHtml.split("\n").map((line) => `      ${line}`).join("\n")}
    </article>
  </main>`;

  write(`et/posts/${post.slug}.html`, pageTemplate({
    title: article.title,
    description: `${article.title} - ConnectedNature'i eestikeelne uurimus.`,
    current: "posts",
    depth: 1,
    footerNote: "Avalik süntees, mis on seotud oma tööjäljega.",
    main,
  }));
}
