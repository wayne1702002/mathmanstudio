import * as params from '@params';

const resList = document.getElementById('searchResults');
const sInput = document.getElementById('searchInput');
const searchBox = document.getElementById('searchbox');

let fuse;
let currentElement = null;
let firstResult = null;
let lastResult = null;

const defaultFuseOptions = {
    distance: 100,
    threshold: 0.4,
    ignoreLocation: true,
    keys: ['title', 'permalink', 'summary', 'content']
};

const buildFuseOptions = () => {
    if (!params.fuseOpts) {
        return defaultFuseOptions;
    }

    return {
        isCaseSensitive: params.fuseOpts.iscasesensitive ?? false,
        includeScore: params.fuseOpts.includescore ?? false,
        includeMatches: params.fuseOpts.includematches ?? false,
        minMatchCharLength: params.fuseOpts.minmatchcharlength ?? 1,
        shouldSort: params.fuseOpts.shouldsort ?? true,
        findAllMatches: params.fuseOpts.findallmatches ?? false,
        keys: params.fuseOpts.keys ?? defaultFuseOptions.keys,
        location: params.fuseOpts.location ?? 0,
        threshold: params.fuseOpts.threshold ?? defaultFuseOptions.threshold,
        distance: params.fuseOpts.distance ?? defaultFuseOptions.distance,
        ignoreLocation: params.fuseOpts.ignorelocation ?? defaultFuseOptions.ignoreLocation
    };
};

const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(...args), delay);
    };
};

const reset = () => {
    currentElement = null;
    firstResult = null;
    lastResult = null;
    resList.innerHTML = '';
    sInput.value = '';
    sInput.focus();
};

const setActiveResult = (element) => {
    document.querySelectorAll('.focus').forEach((item) => item.classList.remove('focus'));

    if (!element) {
        return;
    }

    element.focus();
    element.parentElement?.classList.add('focus');
    currentElement = element;
};

const cleanText = (html = '') => {

    const temp = document.createElement('div');

    temp.innerHTML = html;

    let text = temp.textContent || temp.innerText || '';

    text = text

        .replace(/\$\$[\s\S]*?\$\$/g, ' ')

        .replace(/\$[^$]*\$/g, ' ')

        .replace(/\\\[[\s\S]*?\\\]/g, ' ')

        .replace(/\\\([\s\S]*?\\\)/g, ' ')

        .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ')

        .replace(/\s+/g, ' ')

        .trim();

    return text;

};
const highlightText = (text, keywords) => {
    const fragment = document.createDocumentFragment();

    const pattern = new RegExp(
        `(${keywords
            .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')})`,
        'gi'
    );

    const parts = text.split(pattern);

    parts.forEach(part => {
        if (keywords.some(k => part.toLowerCase() === k.toLowerCase())) {
            const mark = document.createElement('mark');
            mark.textContent = part;
            mark.style.background = '#ffeb3b';
            mark.style.padding = '0 2px';
            mark.style.borderRadius = '3px';
            mark.style.fontWeight = '700';
            fragment.appendChild(mark);
        } else {
            fragment.appendChild(document.createTextNode(part));
        }
    });

    return fragment;
};
const makeSnippet = (text, query) => {
    const clean = cleanText(text);
    const lower = clean.toLowerCase();
    const q = query.toLowerCase();

    const index = lower.indexOf(q);

    if (index === -1) {
        return clean.length > 120
            ? clean.slice(0, 120) + '...'
            : clean;
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(clean.length, index + q.length + 70);

    return (
        (start > 0 ? '...' : '') +
        clean.slice(start, end) +
        (end < clean.length ? '...' : '')
    );
};

const renderResults = (results) => {
    if (!Array.isArray(results) || results.length === 0) {
        resList.innerHTML = '';
        firstResult = lastResult = currentElement = null;
        return;
    }

    const query = sInput.value.trim().toLowerCase();

    const rankedResults = [...results].sort((a, b) => {
        const aTitle = (a.item.title || '').toLowerCase();
        const bTitle = (b.item.title || '').toLowerCase();

        const aBody = (
            (a.item.summary || '') + ' ' +
            (a.item.content || '')
        ).toLowerCase();

        const bBody = (
            (b.item.summary || '') + ' ' +
            (b.item.content || '')
        ).toLowerCase();

        const rank = (title, body) => {
            if (title.includes(query)) return 0;
            if (body.includes(query)) return 1;
            return 2;
        };

        return rank(aTitle, aBody) - rank(bTitle, bBody);
    });

    const fragment = document.createDocumentFragment();

    for (const result of rankedResults) {
        const li = document.createElement('li');

        const title = result.item.title || '';
        const titleLower = title.toLowerCase();

        const body =
            (result.item.summary || '') + ' ' +
            (result.item.content || '');

        const bodyLower = body.toLowerCase();

        const keywords = query.match(/[0-9]+|[\u4e00-\u9fff]+|[a-zA-Z]+/g) || [query];

const titleMatch = keywords.every(keyword =>
    titleLower.includes(keyword.toLowerCase())
);

const bodyMatch = keywords.every(keyword =>
    bodyLower.includes(keyword.toLowerCase())
);

const combinedMatch = keywords.every(keyword =>
    (titleLower + ' ' + bodyLower).includes(keyword.toLowerCase())
);

if (!combinedMatch) {
    continue;
}

        const badge = document.createElement('div');
badge.style.fontSize = '12px';
badge.style.opacity = '0.6';
badge.style.marginBottom = '6px';

if (titleMatch) {

    badge.textContent = '標題符合';

} else {

    badge.textContent = '內文符合';

}

const titleText = document.createElement('div');
titleText.appendChild(highlightText(title, keywords));
titleText.style.fontWeight = '600';
titleText.style.fontSize = '17px';
titleText.style.lineHeight = '1.5';

li.style.display = 'block';
li.style.position = 'relative';

li.appendChild(badge);
li.appendChild(titleText);

        if (!titleMatch && bodyMatch) {
            const snippet = document.createElement('div');
         const snippetText = makeSnippet(body, query);

snippet.appendChild(highlightText(snippetText, keywords));
            snippet.style.fontSize = '14px';
            snippet.style.opacity = '0.7';
            snippet.style.marginTop = '7px';
            snippet.style.lineHeight = '1.6';

            li.appendChild(snippet);
        }

        const svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        );

        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.classList.add('feather', 'feather-chevrons-right');

        svg.innerHTML =
            '<polyline points="13 17 18 12 13 7"></polyline>' +
            '<polyline points="6 17 11 12 6 7"></polyline>';

        const link = document.createElement('a');
        link.className = 'entry-link';
        link.href = result.item.permalink;
        link.setAttribute('aria-label', title);

        li.appendChild(svg);
        li.appendChild(link);

        fragment.appendChild(li);
    }

    resList.innerHTML = '';
    resList.appendChild(fragment);

    firstResult = resList.firstElementChild;
    lastResult = resList.lastElementChild;
};

const performSearch = () => {
    if (!fuse) {
        return;
    }

    const query = sInput.value.trim();
    if (!query) {
        renderResults([]);
        return;
    }

    const searchOptions = params.fuseOpts?.limit ? { limit: params.fuseOpts.limit } : undefined;
    const results = searchOptions ? fuse.search(query, searchOptions) : fuse.search(query);
    renderResults(results);
};

const initSearch = async () => {
    if (!sInput || !resList) {
        return;
    }

    sInput.disabled = false;
    sInput.focus();

    try {
        const response = await fetch('../index.json');
        if (!response.ok) {
            throw new Error(`Search index load failed: ${response.status}`);
        }

        const data = await response.json();
        if (data) {
            fuse = new Fuse(data, buildFuseOptions());
        }
    } catch (error) {
        console.error(error);
    }
};

window.addEventListener('load', initSearch);

sInput?.addEventListener('input', debounce(performSearch, 150));

sInput?.addEventListener('search', () => {
    if (!sInput.value) {
        reset();
    }
});

document.addEventListener('keydown', (event) => {
    const { key } = event;
    const active = document.activeElement;
    const isInSearchBox = searchBox?.contains(active);

    if (key === 'Escape') {
        reset();
        return;
    }

    if (!firstResult || !isInSearchBox) {
        return;
    }

    if (key === 'ArrowDown') {
        event.preventDefault();

        if (active === sInput) {
            setActiveResult(firstResult.querySelector('.entry-link'));
        } else if (active?.parentElement !== lastResult) {
            setActiveResult(active?.parentElement?.nextElementSibling?.querySelector('.entry-link'));
        }
    } else if (key === 'ArrowUp') {
        event.preventDefault();

        if (active?.parentElement === firstResult) {
            setActiveResult(sInput);
        } else if (active !== sInput) {
            setActiveResult(active?.parentElement?.previousElementSibling?.querySelector('.entry-link'));
        }
    } else if (key === 'ArrowRight') {
        if (active?.matches?.('.entry-link')) {
            active.click();
        }
    }
});
