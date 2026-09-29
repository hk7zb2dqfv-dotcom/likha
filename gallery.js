import { clubLinks } from "./supabase.js";
import { dateLabel, emptyState, escapeHtml as e, safeUrl } from "./utils.js";

const image = (url, alt, extra = "") => url
  ? `<img src="${e(safeUrl(url))}" alt="${e(alt)}" loading="lazy" decoding="async" ${extra}>`
  : `<div class="image-missing" role="img" aria-label="Image coming soon">Image coming soon</div>`;

export function header(profile, site, current) {
  const logo = site?.logo_url || "assets/likha-logo.png";
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="#/" aria-label="LIKHA Arts Club home"><span class="brand-image">${image(logo, "LIKHA Arts Club logo")}</span><span>LIKHA <small>NU CEBU</small></span></a>
    <button class="menu-toggle icon-button" type="button" aria-expanded="false" aria-controls="main-nav" data-action="menu" aria-label="Open navigation">☰</button>
    <nav id="main-nav" class="main-nav" aria-label="Main navigation">
      ${[["/atelier", "Atelier"], ["/artists", "Artists"], ["/about", "About"]].map(([path, label]) => `<a href="#${path}"${current === path ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      <a href="#/join"${current === "/join" ? ' aria-current="page"' : ""}>Join LIKHA</a>
      <a href="#/chat" class="nav-chat"${current === "/chat" ? ' aria-current="page"' : ""}>Open chat</a>
      ${profile ? `<a class="nav-account" href="#/account">${e(profile.display_name || profile.full_name || "Account")}</a>` : `<a class="nav-account" href="#/login">Sign in</a>`}
      ${profile?.role === "main_admin" || profile?.role === "sub_admin" ? `<a class="nav-admin" href="#/admin">Dashboard</a>` : ""}
    </nav>
  </div></header>`;
}

export function footer(site) {
  const logo = site?.logo_url || "assets/likha-logo.png";
  const links = site?.social_links || clubLinks;
  return `<footer class="site-footer"><div class="footer-inner">
    <div class="footer-brand"><a class="brand" href="#/"><span class="brand-image">${image(logo, "LIKHA Arts Club logo")}</span><span>LIKHA <small>NU CEBU</small></span></a><p>Create. Express. Belong.</p></div>
    <div><h2>Explore</h2><a href="#/atelier">Atelier</a><a href="#/artists">Artists</a><a href="#/join">Join the club</a><a href="#/chat">Open chat</a></div>
    <div><h2>Find us</h2>${external(links.facebook, "Facebook")}${external(links.instagram, "Instagram")}${external(links.messenger, "Messenger community")}</div>
    <div class="footer-note"><p>Arts club of National University Cebu.</p><small>© ${new Date().getFullYear()} LIKHA Arts Club</small></div>
  </div></footer>`;
}

function external(url, label) {
  const link = safeUrl(url);
  return link ? `<a href="${e(link)}" target="_blank" rel="noopener noreferrer">${e(label)} <span aria-hidden="true">↗</span></a>` : "";
}

export function artworkCard(work, artistMap, atelierMap, size = "") {
  const artist = artistMap.get(work.artist_id);
  const atelier = atelierMap.get(work.atelier_id);
  return `<article class="work-card ${size}">
    <button class="work-image" type="button" data-action="artwork" data-id="${e(work.id)}" aria-label="View ${e(work.title)} by ${e(artist?.name || "LIKHA member")}">
      ${image(work.image_url, `${work.title}${artist ? ` by ${artist.name}` : ""}`)}
      <span class="work-view">View artwork <span aria-hidden="true">↗</span></span>
    </button>
    <div class="work-caption"><div><h3><button type="button" class="text-link" data-action="artwork" data-id="${e(work.id)}">${e(work.title)}</button></h3>
      <p>${artist ? `<a href="#/artist/${e(artist.id)}">${e(artist.name)}</a>` : "LIKHA member"}${atelier ? ` <span>· ${e(atelier.name)}</span>` : ""}</p>
    </div>${work.created_at ? `<time datetime="${e(work.created_at)}">${e(dateLabel(work.created_at))}</time>` : ""}</div>
    ${work.caption ? `<p class="work-description">${e(work.caption)}</p>` : ""}
  </article>`;
}

export function renderHome({ site, home, artworks, artists, ateliers, announcements }) {
  const artistMap = new Map(artists.map(item => [item.id, item]));
  const atelierMap = new Map(ateliers.map(item => [item.id, item]));
  const featured = artworks.filter(work => work.featured).slice(0, 3);
  const latest = artworks.slice(0, 4);
  const heroCover = site.cover_url || "assets/likha-official-cover.png";
  const heroArt = site.hero_art_url || "assets/studio-study.jpg";
  return `<main id="main" tabindex="-1">
    <section class="hero-cover-page"><h1 class="sr-only">LIKHA Arts Club</h1><img class="hero-cover-image" src="${e(safeUrl(heroCover))}" alt="Official LIKHA Arts Club cover page" fetchpriority="high"></section>
    <section class="hero-details"><div class="hero-details-inner"><div><p class="eyebrow">National University Cebu · Arts Club</p><p class="hero-details-copy">${e(home.intro)}</p></div><div class="hero-actions"><a class="button button-primary" href="#/atelier">Explore the Atelier <span aria-hidden="true">↗</span></a><a class="button button-outline-dark" href="#/join">Join the club</a></div></div></section>
    <section class="statement-band"><p>${e(home.subtitle)}</p><span>LIKHA / 01</span></section>
    ${announcements.length ? `<section class="announcement-strip wrap"><p class="eyebrow">From the club</p>${announcements.map(post => `<article><div><h2>${e(post.title)}</h2><p>${e(post.body)}</p></div>${post.link_url ? `<a class="text-link" href="${e(safeUrl(post.link_url))}" target="_blank" rel="noopener noreferrer">Details ↗</a>` : ""}</article>`).join("")}</section>` : ""}
    <section class="section wrap intro-section"><div><p class="eyebrow">A little about us</p><h2>${e(home.about_title)}</h2></div><div><p class="section-lede">${e(home.about_body)}</p><a class="text-link" href="#/about">Read about LIKHA <span aria-hidden="true">↗</span></a></div></section>
    <section class="art-feature"><div class="art-feature-image">${image(heroArt, "Colorful flower painting from the supplied LIKHA reference")}</div><div class="art-feature-copy"><p class="eyebrow">Many ways to create</p><h2>Make something<br>that only you can.</h2><p>Drawing, design, writing, craft and every practice in between. Find your people in the ateliers.</p><a class="button button-light" href="#/atelier">See what members make</a></div></section>
    <section class="section wrap gallery-preview"><div class="section-heading"><div><p class="eyebrow">Selected from the Atelier</p><h2>Recent work</h2></div><a class="text-link" href="#/atelier">All artworks <span aria-hidden="true">↗</span></a></div>
      ${featured.length ? `<div class="work-grid work-grid-featured">${featured.map((work, index) => artworkCard(work, artistMap, atelierMap, index === 0 ? "work-card-tall" : "")).join("")}</div>` : emptyState("The gallery is taking shape", "Member artwork will appear here once the club publishes its first pieces.", `<a class="text-link" href="#/join">Join LIKHA <span aria-hidden="true">↗</span></a>`)}
      ${latest.length ? `<h3 class="subheading">Latest creations</h3><div class="work-grid">${latest.map(work => artworkCard(work, artistMap, atelierMap)).join("")}</div>` : ""}
    </section>
    <section class="section artists-preview"><div class="wrap"><div class="section-heading"><div><p class="eyebrow">The people behind the work</p><h2>Meet the artists</h2></div><a class="text-link" href="#/artists">All artists <span aria-hidden="true">↗</span></a></div>
      ${artists.length ? `<div class="artist-grid">${artists.slice(0, 4).map(artist => artistCard(artist, artworks)).join("")}</div>` : emptyState("Artists will be introduced here", "Artist profiles appear as members and moderators add them to the Atelier.")}
    </div></section>
    <section class="join-band"><div class="wrap join-band-inner"><div><p class="eyebrow">Your next idea starts somewhere</p><h2>Come make with us.</h2><p>${e(home.join_copy)}</p></div><div class="join-band-actions"><a class="button button-gold" href="#/join">Register for LIKHA</a><a class="button button-outline" href="#/chat">Meet the community</a></div></div></section>
  </main>`;
}

function artistCard(artist, artworks) {
  const count = artworks.filter(work => work.artist_id === artist.id).length;
  return `<a class="artist-card" href="#/artist/${e(artist.id)}"><div class="artist-photo">${image(artist.profile_image_url, `Portrait of ${artist.name}`)}</div><div><h3>${e(artist.name)}</h3><p>${e(artist.program || artist.community_type || "LIKHA artist")}</p><small>${count} ${count === 1 ? "work" : "works"}</small></div><span aria-hidden="true">↗</span></a>`;
}

export function renderAtelier({ artworks, artists, ateliers, selected = "" }) {
  const artistMap = new Map(artists.map(item => [item.id, item]));
  const atelierMap = new Map(ateliers.map(item => [item.id, item]));
  const room = ateliers.find(item => item.slug === selected || item.id === selected);
  const filtered = room ? artworks.filter(work => work.atelier_id === room.id) : artworks;
  return `<main id="main" tabindex="-1"><section class="page-heading"><div class="wrap"><p class="eyebrow">LIKHA members' work</p><h1>Atelier</h1><p>Collected work from across the club's creative practices.</p></div></section>
    <section class="section wrap atelier-page"><div class="atelier-filters" role="group" aria-label="Filter artworks by atelier"><a href="#/atelier"${!room ? ' aria-current="page"' : ""}>All work <span>${artworks.length}</span></a>${ateliers.map(item => `<a href="#/atelier/${e(item.slug || item.id)}"${room?.id === item.id ? ' aria-current="page"' : ""}>${e(item.name)}</a>`).join("")}</div>
      ${filtered.length ? `<div class="work-grid work-grid-masonry">${filtered.map(work => artworkCard(work, artistMap, atelierMap)).join("")}</div>` : emptyState(room ? `Nothing in ${room.name} yet` : "The Atelier is waiting for its first work", "New creations from LIKHA members will be added here.", room ? `<a class="text-link" href="#/atelier">See all work</a>` : "")}
    </section></main>`;
}

export function renderArtists({ artists, artworks }) {
  return `<main id="main" tabindex="-1"><section class="page-heading"><div class="wrap"><p class="eyebrow">Meet the makers</p><h1>Artists</h1><p>People, practices and work from the LIKHA community.</p></div></section>
    <section class="section wrap"><label class="search-field"><span>Find an artist</span><input type="search" placeholder="Search by name or practice" data-action="artist-search"></label>
      <div class="artist-grid artist-grid-list" id="artist-list">${artists.length ? artists.map(artist => artistCard(artist, artworks)).join("") : emptyState("Artist profiles are on the way", "Check back as members join the Atelier.")}</div></section></main>`;
}

export function renderArtist({ artist, artworks, artists, ateliers }) {
  if (!artist) return `<main id="main" tabindex="-1">${emptyState("Artist not found", "This profile may have been removed or the link has changed.", '<a class="text-link" href="#/artists">Browse artists</a>')}</main>`;
  const artistMap = new Map(artists.map(item => [item.id, item]));
  const atelierMap = new Map(ateliers.map(item => [item.id, item]));
  return `<main id="main" tabindex="-1"><section class="artist-profile wrap section"><a class="back-link" href="#/artists">← All artists</a><div class="artist-profile-head"><div class="artist-profile-photo">${image(artist.profile_image_url, `Portrait of ${artist.name}`)}</div><div><p class="eyebrow">LIKHA artist</p><h1>${e(artist.name)}</h1>${artist.program ? `<p class="artist-program">${e(artist.program)}</p>` : ""}<p class="section-lede">${e(artist.bio || "Artist biography coming soon.")}</p>${artist.interests?.length ? `<ul class="interest-list">${artist.interests.map(item => `<li>${e(item)}</li>`).join("")}</ul>` : ""}</div></div>
    <div class="section-heading"><div><p class="eyebrow">Portfolio</p><h2>Work by ${e(artist.name)}</h2></div><span class="count-label">${artworks.length} ${artworks.length === 1 ? "piece" : "pieces"}</span></div>
    ${artworks.length ? `<div class="work-grid">${artworks.map(work => artworkCard(work, artistMap, atelierMap)).join("")}</div>` : emptyState("No published work yet", "New pieces from this artist will show up here.")}</section></main>`;
}

export function renderArtworkDialog(work, artist, atelier) {
  const dialog = document.querySelector("#global-dialog");
  dialog.innerHTML = `<section class="artwork-dialog"><button type="button" class="icon-button dialog-x" data-dialog-close aria-label="Close artwork">×</button>${image(work.image_url, work.title)}<div class="artwork-dialog-copy"><p class="eyebrow">${e(atelier?.name || "LIKHA Atelier")}</p><h2 id="dialog-title">${e(work.title)}</h2><p>${artist ? `<a href="#/artist/${e(artist.id)}" data-dialog-navigate>${e(artist.name)}</a>` : "LIKHA member"}${work.created_at ? ` · ${e(dateLabel(work.created_at))}` : ""}</p>${work.caption ? `<p class="section-lede">${e(work.caption)}</p>` : ""}${work.description ? `<p>${e(work.description)}</p>` : ""}</div></section>`;
  dialog.querySelector("[data-dialog-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-dialog-navigate]")?.addEventListener("click", () => dialog.close());
  dialog.showModal();
}

export function renderAbout(home, ateliers) {
  return `<main id="main" tabindex="-1"><section class="page-heading"><div class="wrap"><p class="eyebrow">NU Cebu Arts Club</p><h1>About LIKHA</h1><p>To likha is to make something through imagination, skill and care.</p></div></section>
    <section class="section wrap about-content"><div><p class="eyebrow">Our name</p><h2>${e(home.about_title)}</h2></div><div><p class="section-lede">${e(home.about_body)}</p><p>We make space for different ways of working, from visual art and design to writing, fashion, craft and cultural practice.</p></div></section>
    <section class="section wrap ateliers-about"><div class="section-heading"><div><p class="eyebrow">Find your practice</p><h2>Our ateliers</h2></div></div>${ateliers.length ? `<ul>${ateliers.map(item => `<li><a href="#/atelier/${e(item.slug || item.id)}"><span>${e(item.name)}</span><span aria-hidden="true">↗</span></a></li>`).join("")}</ul>` : emptyState("Ateliers are being organized", "Check back as the club adds its creative groups.")}</section>
    <section class="join-band"><div class="wrap join-band-inner"><div><p class="eyebrow">Make room for your ideas</p><h2>There's a place for you.</h2></div><a class="button button-gold" href="#/join">Join LIKHA</a></div></section></main>`;
}

export function renderJoin(site, profile) {
  if (profile) return `<main id="main" tabindex="-1"><section class="page-heading"><div class="wrap"><p class="eyebrow">LIKHA membership</p><h1>You're part of the community.</h1><p>Your membership gives you access to the open chat and member updates.</p><a class="button button-gold" href="#/chat">Enter open chat</a></div></section></main>`;
  return `<main id="main" tabindex="-1"><section class="page-heading"><div class="wrap"><p class="eyebrow">Membership registration</p><h1>Join LIKHA</h1><p>Tell us a little about yourself. We only ask for information that helps us welcome you and support your creative practice.</p></div></section>
    <section class="section wrap form-layout"><form class="form-panel" data-form="register" novalidate>
      <div class="form-grid"><label>Full name<input name="full_name" autocomplete="name" required maxlength="100"></label><label>School email<input name="email" type="email" autocomplete="email" required maxlength="254" ${site.school_email_domain ? `pattern=".+@${e(site.school_email_domain)}"` : ""}><small>${site.school_email_domain ? `Use your @${e(site.school_email_domain)} address.` : "Use the email you check for school updates."}</small></label>
      <label>I'm a<select name="community_type" required><option value="">Choose one</option><option value="student">Student</option><option value="faculty">Faculty</option><option value="staff">Staff</option></select></label><label>Course or department <span class="optional">Optional</span><input name="course" maxlength="100"></label>
      <label>Year level <span class="optional">Optional</span><select name="year_level"><option value="">Not applicable</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>5th year</option><option>Graduate</option></select></label><label>Contact detail <span class="optional">Optional</span><input name="contact_info" autocomplete="tel" maxlength="60" placeholder="Phone number or preferred contact"></label>
      <label class="field-span">Artistic interests <span class="optional">Optional</span><input name="interests" maxlength="250" placeholder="Drawing, writing, photography..."></label>
      <label class="field-span">Password<input name="password" type="password" autocomplete="new-password" required minlength="10"><small>Use at least 10 characters.</small></label>
      <label class="consent field-span"><input type="checkbox" name="consent" required><span>I agree to be contacted about LIKHA membership and understand that my details are visible only to authorized club administrators.</span></label>
      </div><p class="form-error" data-form-error role="alert"></p><button class="button button-primary" type="submit">Create my LIKHA account</button><p class="form-footnote">Already registered? <a href="#/login">Sign in</a></p>
    </form><aside class="form-aside"><p class="eyebrow">What happens next</p><h2>One small step into a bigger community.</h2><p>We'll ask you to verify your school email. Once you're signed in, the open chat is ready for you.</p><p>Membership is open to students, faculty and staff at NU Cebu.</p></aside></section></main>`;
}

export function renderCommunity(profile, site) {
  const links = site?.social_links || clubLinks;
  return `<main id="main" tabindex="-1"><section class="page-heading"><div class="wrap"><p class="eyebrow">The LIKHA community</p><h1>Make it together.</h1><p>Meet members, share an idea and stay close to what's happening around the club.</p></div></section>
    <section class="section wrap community-grid"><article><p class="eyebrow">Open chat</p><h2>Talk with the community</h2><p>Share a note, an image from your practice, or a little encouragement.</p><a class="button button-primary" href="#/chat">${profile ? "Enter open chat" : "Sign in to chat"}</a></article>
    <article><p class="eyebrow">Stay in touch</p><h2>Find us around campus</h2><div class="community-links">${external(links.facebook, "Facebook")}${external(links.instagram, "Instagram")}${external(links.messenger, "Messenger community")}</div><a href="#/join" class="text-link">New to LIKHA? Join the club <span aria-hidden="true">↗</span></a></article></section></main>`;
}
