const API = 'https://text-library-backend.onrender.com';

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
let currentView = 'texts';
let currentTagFilter = '';

function showTextsView() {
    currentView = 'texts';
    currentTagFilter = '';
    document.getElementById('texts-grid').classList.remove('hidden');
    document.getElementById('searchBar').classList.remove('hidden');
    document.getElementById('categoriesBar').classList.remove('hidden');
    document.getElementById('tagsView').classList.add('hidden');
    document.getElementById('tagResults').classList.add('hidden');

    document.getElementById('navTexts').classList.add('active');
    document.getElementById('navTags').classList.remove('active');

    loadTexts();
}

function showTagsView() {
    currentView = 'tags';
    currentTagFilter = '';
    document.getElementById('texts-grid').classList.add('hidden');
    document.getElementById('searchBar').classList.add('hidden');
    document.getElementById('categoriesBar').classList.add('hidden');
    document.getElementById('tagsView').classList.remove('hidden');
    document.getElementById('tagResults').classList.add('hidden');

    document.getElementById('navTexts').classList.remove('active');
    document.getElementById('navTags').classList.add('active');

    loadTexts();
}

async function loadTexts() {
    const search = document.getElementById('search') ? document.getElementById('search').value : '';
    const category = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : '';

    let url = `${API}/texts?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (currentTagFilter) url += `tag=${encodeURIComponent(currentTagFilter)}`;

    const res = await fetch(url);
    const texts = await res.json();

    if (currentView === 'tags') {
        // строим облако тегов только из всех текстов (без фильтра)
        if (!currentTagFilter) {
            buildTagCloud(texts);
            document.getElementById('tagResults').classList.add('hidden');
        } else {
            renderTagResults(texts);
        }
    } else {
        renderTexts(texts);
        updateCategories(texts);
        buildTagCloud(texts);
    }
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

// Рендер карточек прямо на странице тегов
function renderTagResults(texts) {
    const container = document.getElementById('tagResults');
    container.classList.remove('hidden');

    if (!texts || texts.length === 0) {
        container.innerHTML = `
            <div class="tag-results-header">
                <span>Тег: <strong>${currentTagFilter}</strong></span>
                <button onclick="clearTagFilter()">✕ Сбросить</button>
            </div>
            <div class="empty">Текстов с этим тегом не найдено.</div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="tag-results-header">
            <span>Тег: <strong>${currentTagFilter}</strong> — найдено: ${texts.length}</span>
            <button onclick="clearTagFilter()">✕ Сбросить</button>
        </div>
        <div class="tag-results-grid">
            ${texts.map(t => `
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
            `).join('')}
        </div>
    `;
}

function clearTagFilter() {
    currentTagFilter = '';
    document.getElementById('tagResults').classList.add('hidden');
    loadTexts();
}

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

    // оставляем только облако, без tagResults
    const cloud = document.createElement('div');
    cloud.id = 'tagCloud';

    if (entries.length === 0) {
        cloud.innerHTML = '<div class="empty">Тегов пока нет.</div>';
    } else {
        const counts = entries.map(([, count]) => count);
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const minSize = 0.8;
        const maxSize = 1.6;

        entries.forEach(([tag, count]) => {
            const weight = (count - min) / (max - min || 1);
            const size = minSize + (maxSize - minSize) * weight;

            const span = document.createElement('span');
            span.className = 'tag-cloud-item' + (tag === currentTagFilter ? ' active' : '');
            span.textContent = tag;
            span.style.fontSize = `${size}rem`;
            span.addEventListener('click', () => filterByTag(tag));
            cloud.appendChild(span);
            cloud.appendChild(document.createTextNode(' '));
        });
    }

    // заменяем только облако, не трогаем tagResults
    const existing = document.getElementById('tagCloud');
    if (existing) {
        container.replaceChild(cloud, existing);
    } else {
        container.insertBefore(cloud, container.firstChild);
    }
}

function setCategoryFromChip(category) {
    const select = document.getElementById('categoryFilter');
    select.value = category;
    currentTagFilter = '';
    loadTexts();
}

async function openText(id) {
    currentId = id;
    const res = await fetch(`${API}/texts/${id}`);
    const t =
