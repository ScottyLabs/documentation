/**
 * ScottyLabs mdbook theme additions:
 *  - Replaces the browser-tab favicon (mdbook hard-codes GitHub Octocat for git-repository-url)
 *  - Injects ScottyLabs logo at the top of the sidebar
 *  - Adds Codeberg + GitHub org icon buttons to the top-bar right-buttons area
 *  - Injects a per-page "View source" link for whichever project the current page belongs to
 */
(function () {
  // ── SVG icon strings ────────────────────────────────────────────────────────

  // GitHub Octocat (Font Awesome, viewBox 0 0 496 512)
  var GH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 390.7 8 244.8 8z"/></svg>';

  // Codeberg logo (Simple Icons, viewBox 0 0 24 24) — iceberg/mountain shape
  var CB_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.955.49A12 12 0 0 0 0 12.49a12 12 0 0 0 1.832 6.373L11.838 5.928a.187.14 0 0 1 .324 0l10.006 12.935A12 12 0 0 0 24 12.49a12 12 0 0 0-12-12 12 12 0 0 0-.045 0zm.375 6.467l4.416 16.553a12 12 0 0 0 5.137-4.213z"/></svg>';

  function makeIconBtn(href, title, svgHtml) {
    var a = document.createElement('a');
    a.href = href;
    a.title = title;
    a.setAttribute('aria-label', title);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    var span = document.createElement('span');
    span.className = 'fa-svg';
    span.innerHTML = svgHtml;
    a.appendChild(span);
    return a;
  }

  function run() {
    // ── Path-to-root (count ../ in first stylesheet href) ──────────────────
    var firstSheet = document.querySelector('link[rel="stylesheet"]');
    var sheetHref = firstSheet ? (firstSheet.getAttribute('href') || '') : '';
    var depth = (sheetHref.match(/\.\.\//g) || []).length;
    var pathToRoot = '../'.repeat(depth);

    // ── Favicon override ──────────────────────────────────────────────────
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
      .forEach(function (el) { el.parentNode.removeChild(el); });
    var icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/x-icon';
    icon.href = pathToRoot + 'favicon.ico';
    document.head.appendChild(icon);

    // ── Sidebar logo ──────────────────────────────────────────────────────
    var sidebar = document.getElementById('mdbook-sidebar');
    if (sidebar && !document.getElementById('sidebar-logo')) {
      var scrollbox = sidebar.querySelector('mdbook-sidebar-scrollbox, .sidebar-scrollbox');
      if (scrollbox) {
        var logo = document.createElement('a');
        logo.id = 'sidebar-logo';
        logo.href = pathToRoot + 'index.html';
        logo.setAttribute('aria-label', 'ScottyLabs Docs home');
        var img = document.createElement('img');
        img.src = 'https://codeberg.org/ScottyLabs.png?size=64';
        img.alt = 'ScottyLabs';
        img.width = 32;
        img.height = 32;
        var label = document.createElement('span');
        label.textContent = 'ScottyLabs Docs';
        logo.appendChild(img);
        logo.appendChild(label);
        scrollbox.insertBefore(logo, scrollbox.firstChild);
      }
    }

    // ── Top-bar repo links ────────────────────────────────────────────────
    var rightBtns = document.querySelector('.right-buttons');

    if (depth === 0) {
      // Root pages (Home, Getting Started): show org-level links only
      if (rightBtns && !document.getElementById('sl-org-links')) {
        var wrap = document.createElement('span');
        wrap.id = 'sl-org-links';
        wrap.appendChild(makeIconBtn('https://codeberg.org/ScottyLabs', 'ScottyLabs on Codeberg', CB_SVG));
        wrap.appendChild(makeIconBtn('https://github.com/ScottyLabs', 'ScottyLabs on GitHub', GH_SVG));
        rightBtns.insertBefore(wrap, rightBtns.firstChild);
      }
    } else {
      // Project pages: show only the per-project repo link
      var pagePath = window.location.pathname;
      var slug = pagePath.split('/').filter(Boolean)[0] || '';
      if (slug && slug !== 'index.html' && rightBtns && !document.getElementById('sl-project-repo')) {
        fetch(pathToRoot + 'repos.json')
          .then(function (r) { return r.json(); })
          .then(function (repos) {
            var repoUrl = repos[slug];
            if (!repoUrl) return;
            var isGitHub = repoUrl.indexOf('github.com') !== -1;
            var btn = makeIconBtn(
              repoUrl,
              'View project source (' + (isGitHub ? 'GitHub' : 'Codeberg') + ')',
              isGitHub ? GH_SVG : CB_SVG
            );
            btn.id = 'sl-project-repo';
            rightBtns.insertBefore(btn, rightBtns.firstChild);
          })
          .catch(function () {});
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
