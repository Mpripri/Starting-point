(() => {
  const list = document.getElementById('contact-list');
  const ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3l-4.5 1.2z"/><path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1.2-1.5-2-1-1 .7c-1-.4-2-1.4-2.4-2.4l.7-1-1-2L9 8.5z" fill="currentColor" stroke="none"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
  };

  function card(key, label, href, tapeClass) {
    const node = document.createElement(href ? 'a' : 'div');
    node.className = `contact-card note ${tapeClass}${href ? '' : ' is-off'}`;
    if (href) { node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    node.innerHTML = ICONS[key] + '<strong></strong><span></span>';
    node.querySelector('strong').textContent = label;
    node.querySelector('span').textContent = href ? 'Abrir em nova aba' : 'Em breve';
    const li = document.createElement('li');
    li.append(node);
    return li;
  }

  fetch('/api/config')
    .then((r) => r.json())
    .catch(() => ({}))
    .then((c) => {
      list.append(card('whatsapp', 'WhatsApp', c.whatsapp, 'tape'), card('instagram', 'Instagram', c.instagram, 'tape-r'));
    });
})();
