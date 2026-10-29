const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.navigation');

menuButton?.addEventListener('click', () => {
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isExpanded));
    menuButton.setAttribute('aria-label', isExpanded ? 'Открыть меню' : 'Закрыть меню');
    navigation?.classList.toggle('is-open', !isExpanded);
});

navigation?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-label', 'Открыть меню');
        navigation.classList.remove('is-open');
    });
});

document.querySelector('#year').textContent = new Date().getFullYear();

const propertyGrid = document.querySelector('#property-grid');
const catalogState = document.querySelector('#catalog-state');
const caseGrid = document.querySelector('#case-grid');
const casesState = document.querySelector('#cases-state');
const renderApiUrl = document.querySelector('meta[name="realtor-api-url"]')?.content.trim();
const defaultApiUrl = 'https://realtor-bot-j6kl.onrender.com';
const apiUrl = (renderApiUrl || defaultApiUrl).replace(/\/$/, '');
const bookingForm = document.querySelector('#booking-form');
const formStatus = document.querySelector('#form-status');
const phoneInput = document.querySelector('#phone');

phoneInput?.addEventListener('input', (event) => {
    let digits = event.target.value.replace(/\D/g, '');
    if (!digits) {
        event.target.value = '';
        return;
    }

    if (digits[0] === '8') digits = `7${digits.slice(1)}`;
    if (digits[0] === '9') digits = `7${digits}`;
    if (digits[0] !== '7') digits = `7${digits}`;
    digits = digits.slice(0, 11);

    let formatted = '+7';
    if (digits.length > 1) formatted += ` (${digits.slice(1, 4)}`;
    if (digits.length >= 5) formatted += `) ${digits.slice(4, 7)}`;
    if (digits.length >= 8) formatted += `-${digits.slice(7, 9)}`;
    if (digits.length >= 10) formatted += `-${digits.slice(9, 11)}`;
    event.target.value = formatted;
});

bookingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;

    const submitButton = bookingForm.querySelector('.form-submit');
    const payload = {
        name: bookingForm.elements.name.value.trim(),
        phone: bookingForm.elements.phone.value.trim(),
        telegram: bookingForm.elements.telegram.value.trim() || 'Не указан',
        goal: bookingForm.elements.goal.value,
        contact: bookingForm.querySelector('input[name="contact"]:checked')?.value || 'Не выбран',
    };

    submitButton.disabled = true;
    submitButton.firstChild.textContent = 'Отправляю… ';
    formStatus.textContent = '';
    formStatus.className = 'form-status';

    try {
        const response = await fetch(`${apiUrl}/api/lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.status !== 'ok') {
            throw new Error(result.message || `Сервер вернул статус ${response.status}`);
        }

        bookingForm.reset();
        formStatus.textContent = 'Заявка отправлена! Я свяжусь с вами удобным способом.';
        formStatus.classList.add('is-success');
    } catch (error) {
        console.error('Не удалось отправить заявку:', error);
        formStatus.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз чуть позже.';
        formStatus.classList.add('is-error');
    } finally {
        submitButton.disabled = false;
        submitButton.firstChild.textContent = 'Отправить заявку ';
    }
});

function showCatalogState(title, message, retry = false) {
    if (!catalogState) return;

    catalogState.hidden = false;
    catalogState.querySelector('h3').textContent = title;
    catalogState.querySelector('p').textContent = message;
    catalogState.querySelector('.catalog-retry')?.remove();

    if (retry) {
        const button = document.createElement('button');
        button.className = 'catalog-retry';
        button.type = 'button';
        button.textContent = 'Попробовать ещё раз';
        button.addEventListener('click', loadProperties);
        catalogState.append(button);
    }
}

function createPropertyCard(property) {
    const card = document.createElement('article');
    card.className = 'property-card';

    const photoUrl = typeof property.photo_url === 'string' ? property.photo_url.trim() : '';
    if (photoUrl) {
        const image = document.createElement('img');
        image.className = 'property-photo';
        image.src = photoUrl.startsWith('/') ? `${apiUrl}${photoUrl}` : photoUrl;
        image.alt = property.title ? `Фотография: ${property.title}` : 'Фотография квартиры';
        image.loading = 'lazy';
        image.addEventListener('error', () => {
            const placeholder = document.createElement('div');
            placeholder.className = 'property-photo-placeholder';
            placeholder.setAttribute('aria-label', 'Фотография временно недоступна');
            placeholder.textContent = '⌂';
            image.replaceWith(placeholder);
        }, { once: true });
        card.append(image);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'property-photo-placeholder';
        placeholder.setAttribute('aria-label', 'Фотография не добавлена');
        placeholder.textContent = '⌂';
        card.append(placeholder);
    }

    const info = document.createElement('div');
    info.className = 'property-info';

    const addText = (tag, className, value) => {
        if (value === null || value === undefined || String(value).trim() === '') return;
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = String(value);
        info.append(element);
    };

    addText('p', 'property-price', property.price);
    addText('h3', 'property-title', property.title || 'Квартира в Мариуполе');
    addText('p', 'property-address', property.address);

    const details = [
        property.area && `Площадь: ${property.area}`,
        property.floor && `Этаж: ${property.floor}`,
        property.deadline && `Срок: ${property.deadline}`,
    ].filter(Boolean);

    if (details.length) {
        const detailList = document.createElement('div');
        detailList.className = 'property-details';
        details.forEach((detail) => {
            const item = document.createElement('span');
            item.textContent = detail;
            detailList.append(item);
        });
        info.append(detailList);
    }

    card.append(info);
    return card;
}

async function loadProperties() {
    if (!propertyGrid || !catalogState) return;

    propertyGrid.replaceChildren();
    catalogState.hidden = false;
    catalogState.querySelector('.catalog-retry')?.remove();
    catalogState.querySelector('h3').textContent = 'Загружаю предложения…';
    catalogState.querySelector('p').textContent = 'Получаю актуальные квартиры из каталога.';

    try {
        const response = await fetch(`${apiUrl}/api/properties`, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`API вернул статус ${response.status}`);

        const properties = await response.json();
        if (!Array.isArray(properties)) throw new Error('API вернул данные неожиданного формата');

        if (properties.length === 0) {
            showCatalogState('Пока нет опубликованных квартир', 'Новые предложения появятся здесь после добавления в каталог Telegram-бота.');
            return;
        }

        const cards = document.createDocumentFragment();
        properties.forEach((property) => cards.append(createPropertyCard(property)));
        propertyGrid.append(cards);
        catalogState.hidden = true;
    } catch (error) {
        console.error('Не удалось загрузить каталог квартир:', error);
        showCatalogState('Не удалось загрузить каталог', 'Сервис каталога пока недоступен. Проверьте подключение и попробуйте ещё раз.', true);
    }
}

function showCasesState(title, message, retry = false) {
    if (!casesState) return;
    casesState.hidden = false;
    casesState.querySelector('h3').textContent = title;
    casesState.querySelector('p').textContent = message;
    casesState.querySelector('.cases-retry')?.remove();
    if (retry) {
        const button = document.createElement('button');
        button.className = 'catalog-retry cases-retry';
        button.type = 'button';
        button.textContent = 'Попробовать ещё раз';
        button.addEventListener('click', loadCases);
        casesState.append(button);
    }
}

function createCaseCard(item) {
    const card = document.createElement('article');
    card.className = 'case-card';

    const photoUrl = typeof item.photo_url === 'string' ? item.photo_url.trim() : '';
    if (photoUrl) {
        const image = document.createElement('img');
        image.className = 'case-photo';
        image.src = photoUrl.startsWith('/') ? `${apiUrl}${photoUrl}` : photoUrl;
        image.alt = item.title ? `Фото: ${item.title}` : 'Фотография объекта из кейса';
        image.loading = 'lazy';
        image.addEventListener('error', () => {
            const placeholder = document.createElement('div');
            placeholder.className = 'case-photo-placeholder';
            placeholder.setAttribute('aria-label', 'Фотография временно недоступна');
            placeholder.textContent = '⌂';
            image.replaceWith(placeholder);
        }, { once: true });
        card.append(image);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'case-photo-placeholder';
        placeholder.setAttribute('aria-label', 'В кейсе нет фотографии');
        placeholder.textContent = '⌂';
        card.append(placeholder);
    }

    const content = document.createElement('div');
    content.className = 'case-content';
    const location = document.createElement('p');
    location.className = 'case-location';
    location.textContent = item.location || 'Мариуполь';
    content.append(location);
    const title = document.createElement('h3');
    title.textContent = item.title || 'История покупки квартиры';
    content.append(title);

    for (const [label, text] of [['Запрос', item.goal], ['История', item.story], ['Результат', item.result]]) {
        if (!text) continue;
        const detail = document.createElement('section');
        detail.className = 'case-detail';
        const heading = document.createElement('h4');
        heading.textContent = label;
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        detail.append(heading, paragraph);
        content.append(detail);
    }

    card.append(content);
    return card;
}

async function loadCases() {
    if (!caseGrid || !casesState) return;
    caseGrid.replaceChildren();
    casesState.hidden = false;
    casesState.querySelector('.cases-retry')?.remove();
    casesState.querySelector('h3').textContent = 'Загружаю кейсы…';
    casesState.querySelector('p').textContent = 'Публикую только истории без имён и личных данных.';

    try {
        const response = await fetch(`${apiUrl}/api/cases`, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`API вернул статус ${response.status}`);
        const cases = await response.json();
        if (!Array.isArray(cases)) throw new Error('API вернул данные неожиданного формата');
        if (cases.length === 0) {
            showCasesState('Истории скоро появятся', 'Кейсы покупателей будут опубликованы здесь без имён и личных данных.');
            return;
        }
        const cards = document.createDocumentFragment();
        cases.forEach((item) => cards.append(createCaseCard(item)));
        caseGrid.append(cards);
        casesState.hidden = true;
    } catch (error) {
        console.error('Не удалось загрузить кейсы:', error);
        showCasesState('Не удалось загрузить кейсы', 'Сервис кейсов пока недоступен. Попробуйте ещё раз.', true);
    }
}

loadProperties();
loadCases();
