(() => {
  const YEARS = [
    { n: 1, id: 'primeiro-ano', name: 'Primeiro ano' },
    { n: 2, id: 'segundo-ano', name: 'Segundo ano' },
    { n: 3, id: 'terceiro-ano', name: 'Terceiro ano' },
  ];
  // Variações para o visual de mural (inclinação alterna direita/esquerda)
  const TILT = [3.2, 1.6, 2.6, 1.1, 3.8];
  const WIDTH = [250, 215, 270, 230, 245, 205];
  const RATIO = ['4 / 5', '1 / 1', '5 / 4', '4 / 5', '1 / 1', '3 / 4'];
  const DROP = [0, 22, 8, 30, 14, 4, 26];

  const album = document.getElementById('album');
  const viewer = document.getElementById('viewer');
  const els = {
    img: document.getElementById('viewer-img'),
    title: document.getElementById('viewer-title'),
    date: document.getElementById('viewer-date'),
    desc: document.getElementById('viewer-desc'),
    prev: document.getElementById('viewer-prev'),
    next: document.getElementById('viewer-next'),
    close: document.getElementById('viewer-close'),
  };
  let current = { list: [], index: 0, opener: null, buttons: [] };

  function el(tag, props = {}, children = []) {
    const node = Object.assign(document.createElement(tag), props);
    children.forEach((c) => node.append(c));
    return node;
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function buildPhoto(photo, i, list, buttons, delay) {
    const img = el('img', { src: photo.image_url, alt: `Foto: ${photo.title}`, loading: 'lazy', decoding: 'async' });
    const cap = el('span', { className: 'cap', textContent: photo.title });
    cap.setAttribute('aria-hidden', 'true');
    const btn = el('button', { type: 'button', className: `photo t${i % 4}` }, [img, cap]);
    btn.setAttribute('aria-haspopup', 'dialog');
    const s = btn.style;
    s.setProperty('--rot', ((i % 2 === 0 ? -1 : 1) * TILT[i % TILT.length]).toFixed(1));
    s.setProperty('--w', `${WIDTH[(i * 2 + 1) % WIDTH.length]}px`);
    s.setProperty('--ar', RATIO[(i * 3 + 1) % RATIO.length]);
    s.setProperty('--mt', `${DROP[(i * 2) % DROP.length]}px`);
    s.setProperty('--d', `${Math.min(delay, 700)}ms`);
    btn.addEventListener('click', () => open(list, i, btn, buttons));
    buttons.push(btn);
    return btn;
  }

  function render(photos) {
    album.replaceChildren();
    let delay = 0;
    YEARS.forEach((y) => {
      const list = photos.filter((p) => p.school_year === y.n);
      const heading = el('h2', { id: `${y.id}-titulo`, textContent: y.name });
      const label = el('div', { className: 'year-label torn-wrap' }, [el('div', { className: 'torn' }, [heading])]);
      const section = el('section', { id: y.id, className: 'year' }, [label]);
      section.setAttribute('aria-labelledby', heading.id);

      if (!list.length) {
        section.append(el('div', { className: 'empty note tape-r' }, [
          el('p', { textContent: 'Ainda não há fotografias neste ano. As lembranças aparecerão aqui em breve.' }),
        ]));
      } else {
        const board = el('div', { className: 'board' });
        const buttons = [];
        list.forEach((p, i) => board.append(buildPhoto(p, i, list, buttons, (delay += 70))));
        section.append(board);
      }
      album.append(section);
    });
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  }

  /* ----- Modal ----- */
  function fill() {
    const p = current.list[current.index];
    els.img.src = p.image_url;
    els.img.alt = `Foto: ${p.title}, em ${formatDate(p.taken_at)}`;
    els.title.textContent = p.title;
    els.date.textContent = formatDate(p.taken_at);
    els.date.dateTime = p.taken_at;
    els.desc.textContent = p.description || '';
    els.desc.hidden = !p.description;
    els.prev.disabled = current.index === 0;
    els.next.disabled = current.index === current.list.length - 1;
    viewer.querySelector('.viewer-card').scrollTop = 0;
  }

  function open(list, index, opener, buttons) {
    current = { list, index, opener, buttons };
    fill();
    document.body.classList.add('modal-open');
    viewer.showModal();
    els.close.focus();
  }

  function step(delta) {
    const next = current.index + delta;
    if (next < 0 || next >= current.list.length) return;
    current.index = next;
    current.opener = current.buttons[next];
    fill();
  }

  els.close.addEventListener('click', () => viewer.close());
  els.prev.addEventListener('click', () => step(-1));
  els.next.addEventListener('click', () => step(1));
  // clique fora do cartão (no fundo escuro) fecha
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  // fecha por botão, Esc ou fundo: volta ao mesmo ponto e à mesma foto
  viewer.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    current.opener?.focus({ preventScroll: true });
  });

  /* ----- Carregar fotos ----- */
  fetch('/api/photos')
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then(render)
    .catch(() => {
      album.replaceChildren(el('p', { className: 'status', textContent: 'Não foi possível abrir o álbum agora. Recarregue a página em instantes.' }));
    });
})();
