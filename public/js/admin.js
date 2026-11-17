(() => {
  const $ = (id) => document.getElementById(id);
  const YEAR = { 1: 'Primeiro ano', 2: 'Segundo ano', 3: 'Terceiro ano' };
  const MAX = 30 * 1024 * 1024;   // limite da foto original escolhida
const SEND_MAX = 4 * 1024 * 1024; // limite do servidor
  const form = $('photo-form');
  let photos = [];
  let editingId = null;

  async function api(path, options = {}) {
    const headers = { 'X-Requested-With': 'starting-point', ...(options.headers || {}) };
    const res = await fetch(path, { credentials: 'same-origin', ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/auth/login') { showLogin(); throw new Error(data.error || 'Sessão expirada.'); }
    if (!res.ok) throw new Error(data.error || 'Erro inesperado.');
    return data;
  }

  function say(text, isError = false) {
    const m = $('message');
    m.textContent = text;
    m.className = `message${isError ? ' error' : ''}`;
    m.hidden = !text;
  }

  function showLogin() {
    $('panel-view').hidden = true; $('bar-actions').hidden = true; $('login-view').hidden = false;
    $('login-form').elements.email.focus();
  }
  function showPanel() {
    $('login-view').hidden = true; $('panel-view').hidden = false; $('bar-actions').hidden = false;
    loadPhotos();
  }

  /* ----- Login / logout ----- */
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.elements.email.value, password: f.elements.password.value }),
      });
      f.reset(); say(''); showPanel();
    } catch (err) { say(err.message, true); }
  });
  $('logout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    say(''); showLogin();
  });

  /* ----- Lista ----- */
  async function loadPhotos() {
    try { photos = await api('/api/admin/photos'); renderList(); } catch (err) { say(err.message, true); }
  }

  function fmt(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

  function renderList() {
    const year = Number($('filter').value);
    const items = photos.filter((p) => !year || p.school_year === year);
    const ul = $('list');
    ul.replaceChildren();
    if (!items.length) {
      const li = document.createElement('li'); li.className = 'empty';
      li.textContent = 'Nenhuma fotografia cadastrada aqui ainda. Use o formulário para adicionar a primeira.';
      ul.append(li); return;
    }
    items.forEach((p) => {
      const li = document.createElement('li'); li.className = 'item';
      const img = Object.assign(document.createElement('img'), { src: p.image_url, alt: `Miniatura: ${p.title}`, loading: 'lazy' });
      const info = document.createElement('div');
      const h = document.createElement('h3'); h.textContent = p.title;
      const meta = document.createElement('p'); meta.textContent = `${YEAR[p.school_year]} · ${fmt(p.taken_at)}`;
      info.append(h, meta);
      const actions = document.createElement('div'); actions.className = 'actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Editar';
      edit.addEventListener('click', () => startEdit(p));
      const del = document.createElement('button'); del.type = 'button'; del.className = 'danger'; del.textContent = 'Excluir';
      del.addEventListener('click', () => remove(p));
      actions.append(edit, del);
      li.append(img, info, actions);
      ul.append(li);
    });
  }
  $('filter').addEventListener('change', renderList);

  /* ----- Formulário ----- */
  function resetForm() {
    editingId = null; form.reset();
    $('preview').hidden = true;
    $('form-title').textContent = 'Nova fotografia';
    $('save').textContent = 'Adicionar fotografia';
    $('cancel').hidden = true;
    form.elements.image.labels[0].firstChild.textContent = 'Imagem (JPG, PNG ou WebP)';
  }

  function startEdit(p) {
    editingId = p.id;
    form.elements.school_year.value = p.school_year;
    form.elements.title.value = p.title;
    form.elements.taken_at.value = p.taken_at;
    form.elements.description.value = p.description || '';
    form.elements.image.value = '';
    $('preview').src = p.image_url; $('preview').hidden = false;
    $('form-title').textContent = 'Editar fotografia';
    $('save').textContent = 'Salvar alterações';
    $('cancel').hidden = false;
    form.elements.image.labels[0].firstChild.textContent = 'Trocar imagem (opcional) ';
    say(''); form.scrollIntoView({ behavior: 'smooth' });
    form.elements.title.focus({ preventScroll: true });
  }
  $('cancel').addEventListener('click', resetForm);

  $('image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX) { say('A imagem passa de 30 MB.', true); e.target.value = ''; return; }
    $('preview').src = URL.createObjectURL(file); $('preview').hidden = false;
  });

  // Redimensiona (máx. 2000 px) e comprime em JPEG para caber no limite de envio
  async function shrink(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const q of [0.88, 0.78, 0.65]) {
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= SEND_MAX) return blob;
    }
    throw new Error('Não foi possível reduzir a imagem. Tente uma foto menor.');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    if (!editingId && !f.image.files[0]) return say('Selecione uma imagem.', true);
    if (!f.school_year.value || !f.title.value.trim() || !f.taken_at.value) return say('Preencha ano, título e data.', true);

    const save = $('save'); save.disabled = true;
    try {
      const body = new FormData(form);
      if (f.image.files[0]) body.set('image', await shrink(f.image.files[0]), 'foto.jpg');
      await api(editingId ? `/api/admin/photos/${editingId}` : '/api/admin/photos', { method: editingId ? 'PUT' : 'POST', body });
      say(editingId ? 'Alterações salvas.' : 'Fotografia adicionada.');
      resetForm(); await loadPhotos();
    } catch (err) { say(err.message, true); }
    finally { save.disabled = false; }
  });

  async function remove(p) {
    if (!confirm(`Excluir "${p.title}"? Isso não pode ser desfeito.`)) return;
    try {
      await api(`/api/admin/photos/${p.id}`, { method: 'DELETE' });
      if (editingId === p.id) resetForm();
      say('Fotografia excluída.'); await loadPhotos();
    } catch (err) { say(err.message, true); }
  }

  /* ----- Início ----- */
  api('/api/auth/me').then(showPanel).catch(showLogin);
})();
