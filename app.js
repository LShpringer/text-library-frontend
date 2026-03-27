// ВАЖНО: здесь должен быть адрес твоего бекенда на Render
const API = 'https://text-library-backend.onrender.com';

// простой админ-ключ
let ADMIN_KEY = localStorage.getItem('admin_key') || '';

function ensureAdminKey() {
    if (!ADMIN_KEY) {
        const k = prompt('Введите админ-ключ:');
        if (!k) {
            alert('Без ключа нельзя редактировать.');
            throw new Error('No admin key');
        }
        ADMIN_KEY = k;
        localStorage.setItem('admin_key', ADMIN_KEY);
    }
}

let currentId = null;
let quill;
let currentView = 'texts'; // 'texts' или 'tags'
let currentTagFilter = ''; // для фильтра по тегу

function showTextsView() {
    currentView = 'texts';
    document.getElementById('texts-grid').classList.remove('hidden');
    document.getElementById('searchBar').classList.remove('hidden');
    document.getElementById('categoriesBar').classList.remove('hidden');
    document.getElementById('tagsView').classList.add('hidden');

    document.getElementById('navTexts').classList.add('active');
    document.getElementById('navTags').classList.remove('active');
}

function showTagsView() {
    currentView = 'tags';
    document.getElementById('texts-grid').classList.add('hidden');
    document.getElementById('searchBar').classList.add('hidden');
    document.getElementById('categoriesBar').classList.add('hidden');
    document.getElementById('tagsView').classList.remove('hidden');

    document.getElementById('navTexts').classList.remove('active');
    document.getElementById('navTags').classList.add('active');
}

async function loadTexts() {
    const search = document.getElementById('search').value;
    const category = document.getElementById('categoryFilter').value;

    let url = `${API}/texts?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (currentTagFilter) url += `tag=${encodeURIComponent(currentTagFilter)}`;

    const res = await fetch(url);
    const texts = await res.json();

    renderTexts(texts);
    updateCategories(texts);
    buildTagCloud(texts);
}

function renderTexts(texts) {
    const grid = document.getElementById('texts-grid');
    if (!texts || texts.length === 0) {
        grid.innerHTML = '<div class="empty">Текстов пока нет. Добавьте первый! ✍️</div>';
        return;
    }
    grid.innerHTML = texts.map(t => `
        <div class="card" onclick="openText(${t.id})">
            <div class="card-category">${t.category || ''}</div>
            <h2>${t.title}</h2>
            <div class="card-preview">${stripHtml(t.content)}</div>
            ${t.tags ? `<div class="card-tags">${
                t.tags.split(',').map(tag =>
                    `<span class="tag">${tag.trim()}</span>`
                ).join('')
            }</div>` : ''}
            <div class="card-date">${new Date(t.created_at).toLocaleDateString('ru-RU')}</div>
        </div>
    `).join('');
}

// убрать HTML-теги для превью
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || div.innerText || '';
}

function updateCategories(texts) {
    const select = document.getElementById('categoryFilter');
    const bar = document.getElementById('categoriesBar');
    const current = select.value;

    const cats = [...new Set(texts.map(t => t.category).filter(Boolean))];

    select.innerHTML = '<option value="">Все категории</option>' +
        cats.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');

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

function buildTagCloud(texts) {
    const container = document.getElementById('tagsView');
    const tagCounts = {};

    texts.forEach(t => {
        if (!t.tags) return;
        t.tags.split(',').forEach(raw => {
            const tag = raw.trim();
            if (!tag) return;
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const entries = Object.entries(tagCounts);
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty">Тегов пока нет.</div>';
        return;
    }

    const counts = entries.map(([, count]) => count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);

    const minSize = 0.8;
    const maxSize = 1.6;

    container.innerHTML = '';

    entries.forEach(([tag, count]) => {
        const weight = (count - min) / (max - min || 1);
        const size = minSize + (maxSize - minSize) * weight;

        const span = document.createElement('span');
        span.className = 'tag-cloud-item';
        span.textContent = tag;
        span.style.fontSize = `${size}rem`;
        span.addEventListener('click', () => filterByTag(tag));

        container.appendChild(span);
        container.appendChild(document.createTextNode(' '));
    });
}


function setCategoryFromChip(category) {
    const select = document.getElementById('categoryFilter');
    select.value = category;
    currentTagFilter = ''; // сбрасываем фильтр по тегу при выборе категории
    loadTexts();
}

async function openText(id) {
    currentId = id;
    const res = await fetch(`${API}/texts/${id}`);
    const t = await res.json();

    document.getElementById('viewContent').innerHTML = `
        <h2>${t.title}</h2>
        <div class="meta">${t.category || ''} · ${t.tags || ''} · ${new Date(t.created_at).toLocaleDateString('ru-RU')}</div>
        <div class="body">${t.content}</div>
    `;
    document.getElementById('viewModal').classList.remove('hidden');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.add('hidden');
    currentId = null;
}

function openModal(text = null) {
    try {
        ensureAdminKey();
    } catch {
        return;
    }
    document.getElementById('editId').value = text ? text.id : '';
    document.getElementById('editTitle').value = text ? text.title : '';
    document.getElementById('editCategory').value = text ? text.category : '';
    document.getElementById('editTags').value = text ? text.tags : '';
    document.getElementById('modalTitle').textContent = text ? 'Редактировать' : 'Новый текст';

    if (text && quill) {
        quill.root.innerHTML = text.content || '';
    } else if (quill) {
        quill.root.innerHTML = '';
    }

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
    try {
        ensureAdminKey();
    } catch {
        return;
    }
    await fetch(`${API}/texts/${currentId}`, {
        method: 'DELETE',
        headers: {
            'X-Admin-Key': ADMIN_KEY,
        },
    });
    closeViewModal();
    loadTexts();
}

async function saveText() {
    const id = document.getElementById('editId').value;
    const body = {
        title: document.getElementById('editTitle').value,
        category: document.getElementById('editCategory').value,
        tags: document.getElementById('editTags').value,
        content: quill ? quill.root.innerHTML : '',
    };

    const url = id ? `${API}/texts/${id}` : `${API}/texts/`;
    const method = id ? 'PUT' : 'POST';

    try {
        ensureAdminKey();
    } catch {
        return;
    }

    await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_KEY,
        },
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

// Инициализация редактора
function initEditor() {
    quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'],
                ['clean'],
            ]
        }
    });

    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', () => {
        const url = prompt('Вставьте ссылку на картинку (URL):');
        if (url) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url, 'user');
        }
    });
}

function filterByTag(tag) {
    currentTagFilter = tag;
    document.getElementById('search').value = '';
    showTextsView();
    loadTexts();
}

initEditor();
loadTexts();
