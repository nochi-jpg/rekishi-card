// 歴史カードバトル：アイコン（SVG。色は currentColor）
(function () {
  const P = {
    battle: '<path d="M4 20 15 9M15 9l3-5 2 2-5 3M9 4l11 11M20 20l-3-1-1-3M4 4l3 1 1 3M7 17l-3 3"/>',
    shop: '<path d="M4 9h16l-1.5 11h-13zM8 9V7a4 4 0 0 1 8 0v2"/><circle cx="12" cy="14.5" r="2"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7M8 11h7"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M6 4a2 2 0 0 0-2 2v1h3M9 9h7M9 13h7M9 17h4"/>',
    castle: '<path d="M3 21h18M5 21V10l3 2V8l4-4 4 4v4l3-2v11M10 21v-4h4v4M9 10h6"/>',
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
    puzzle: '<path d="M10 3h4v2a2 2 0 1 0 4 0V3h3v7h-2a2 2 0 1 0 0 4h2v7h-7v-2a2 2 0 1 0-4 0v2H3v-7h2a2 2 0 1 0 0-4H3V3h7z"/>',
    friends: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 20a4 4 0 0 1 8.5-1"/>',
    cpu: '<rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/><circle cx="12" cy="3" r="1"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    cards: '<rect x="3" y="6" width="11" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 18l6-5 4 3 3-2 5 4"/>',
    send: '<path d="M3 11l18-8-7 18-3-7z"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    full: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-1 1-2s-.2-2.2 1.2-2.2H17a4 4 0 0 0 4-4C21 7 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
    label: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.3"/>',
    home: '<path d="M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9C9 9 7 4 9.5 4S12 9 12 9zM12 9c3 0 5-5 2.5-5S12 9 12 9z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    run: '<path d="M14 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 21l3-6 3 2v5M10 15l1-5 4 3h4M11 10 7 11l-2 3"/>',
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>',
    retry: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    coin: '<circle cx="12" cy="12" r="9"/><rect x="9.5" y="9.5" width="5" height="5"/>'
  };
  window.RC_ICON = (name, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  // data-ico="名前" のついた要素にアイコンを入れる（HTMLに直接書いたボタン用）
  window.RC_ICON_FILL = (root) => (root || document).querySelectorAll('[data-ico]').forEach(el => { if (!el.querySelector(':scope > .ico')) el.insertAdjacentHTML('afterbegin', window.RC_ICON(el.dataset.ico)); });
})();
// 画面に [data-ico] が追加されたら自動でアイコンを入れる
(function () {
  const run = () => window.RC_ICON_FILL(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  new MutationObserver(() => run()).observe(document.documentElement, { childList: true, subtree: true });
})();
