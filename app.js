const API = 'https://text-library-backend.onrender.com';
let currentId = null;

async function loadTexts() {
    const search = document.getElementById('search').value;
    const category = document.getElementById('categoryFilter').value;

    let url = `${API}/texts?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}`;

    const res = await fetch(url);
    const texts = await res.json();

    renderTexts(texts);
    updateCategories(texts);
}

function renderTexts(texts) {
    const grid = document.getElementById('texts-grid');
    if (texts.length === 0) {
        grid.innerHTML = '<div class="empty">Текстов пока нет. Добавьте первый! ✍️</div>';
        return;
    }
    grid.innerHTML = texts.map(t => `
        <div class="card" onclick="openText(${t.id})">
            <div class="card-category">${t.category || ''}</div>
            <h2>${t.title}</h2>
            <div class="card-preview">${t.content}</div>
            ${t.tags ? `<div class="card-tags">${t.tags.split(',').map(tag =>
                `<span class="tag">${tag.trim()}</span>`).join('')}</div>` : ''}
            <div class="card-date">${new Date(t.created_at).toLocaleDateString('ru-RU')}</div>
        </div>
    `).join('');
}

function updateCategories(texts) {
    const select = document.getElementById('categoryFilter');
    const bar = document.getElementById('categoriesBar');
    const current = select.value;

    const cats = [...new Set(texts.map(t => t.category).filter(Boolean))];

    // Обновляем select
    select.innerHTML = '<option value="">Все категории</option>' +
        cats.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');

    // Обновляем кнопки-категории
    bar.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.textContent = 'Все';
    allBtn.className = 'category-chip' + (current === '' ? ' active' : '');
    allBtn.onclick = () => setCategoryFromChip('');
    bar.appendChild(allBtn);

    cats.forEach(c => {
        const btn = document.createElement('button');
        btn.textContent = c;
        btn.className = 'category-chip' + (c === current ? ' active' : '');
        btn.onclick = () => setCategoryFromChip(c);
        bar.appendChild(btn);
    });
}

function setCategoryFromChip(category) {
    const select = document.getElementById('categoryFilter');
    select.value = category;
    loadTexts();
}


async function openText(id) {
    currentId = id;
    const res = await fetch(`${API}/texts/${id}`);
    const t = await res.json();

    document.getElementById('viewContent').innerHTML = `
        <h2>${t.title}</h2>
        <div class="meta">${t.category} · ${t.tags} · ${new Date(t.created_at).toLocaleDateString('ru-RU')}</div>
        <div class="body">${marked.parse(t.content)}</div>
    `;
    document.getElementById('viewModal').classList.remove('hidden');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.add('hidden');
    currentId = null;
}

function openModal(text = null) {
    document.getElementById('editId').value = text ? text.id : '';
    document.getElementById('editTitle').value = text ? text.title : '';
    document.getElementById('editCategory').value = text ? text.category : '';
    document.getElementById('editTags').value = text ? text.tags : '';
    document.getElementById('editContent').value = text ? text.content : '';
    document.getElementById('modalTitle').textContent = text ? 'Редактировать' : 'Новый текст';
    document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('editModal').classList.add('hidden');
}

async function editFromView() {
    const res = await fetch(`${API}/texts/${currentId}`);
    const text = await res.json();
    closeViewModal();
    openModal(text);
}

async function deleteFromView() {
    if (!confirm('Удалить этот текст?')) return;
    await fetch(`${API}/texts/${currentId}`, { method: 'DELETE' });
    closeViewModal();
    loadTexts();
}

async function saveText() {
    const id = document.getElementById('editId').value;
    const body = {
        title: document.getElementById('editTitle').value,
        category: document.getElementById('editCategory').value,
        tags: document.getElementById('editTags').value,
        content: document.getElementById('editContent').value,
    };

    const url = id ? `${API}/texts/${id}` : `${API}/texts/`;
    const method = id ? 'PUT' : 'POST';

    await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    closeModal();
    loadTexts();
}

// Закрытие по клику на фон
document.getElementById('viewModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeViewModal();
});
document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
});

loadTexts();
