const TYPE_LABELS = {
  REVIEW: 'تجربه کاری',
  INTERVIEW: 'مصاحبه',
};

const STATUS_LABELS = {
  WORKING: 'در حال همکاری',
  NOT_WORKING: 'سابقه همکاری',
  ACCEPT: 'پذیرفته شده',
  REJECT: 'رد شده',
};

const STATUS_CLASS = {
  WORKING: 'badge-status-working',
  NOT_WORKING: 'badge-status-not-working',
  ACCEPT: 'badge-status-accept',
  REJECT: 'badge-status-reject',
};

let reviews = [];
let currentFilter = 'all';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toFaDigits(value) {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[d]);
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function formatCount(n) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function formatSalary(amount) {
  if (!amount) return null;
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

function escapeHtml(text) {
  const el = document.createElement('span');
  el.textContent = text;
  return el.innerHTML;
}

function renderStars(rate) {
  const filled = Math.round(rate);
  let html = '';
  for (let i = 0; i < filled; i++) {
    html += '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.77l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"/></svg>';
  }
  return `<span class="review-rate" aria-label="امتیاز ${toFaDigits(rate)} از ۵">${html}<span>${toFaDigits(rate)}/۵</span></span>`;
}

function needsReadMore(text) {
  return text && text.length > 320;
}

function sortByDateNewest(list) {
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function renderCard(review) {
  const date = formatDate(review.created_at);
  const salary = formatSalary(review.salary);
  const typeClass = review.review_type === 'INTERVIEW' ? 'badge-type-interview' : 'badge-type-review';
  const statusClass = STATUS_CLASS[review.review_status] || '';
  const showReadMore = needsReadMore(review.description);

  const metaParts = [];
  if (review.job_title) metaParts.push(`<span>${escapeHtml(review.job_title)}</span>`);
  if (salary) metaParts.push(`<span>${salary}</span>`);
  if (review.start_date) metaParts.push(`<span>شروع: ${formatDate(review.start_date)}</span>`);

  const badges = [
    `<span class="badge ${typeClass}">${TYPE_LABELS[review.review_type]}</span>`,
    `<span class="badge ${statusClass}">${STATUS_LABELS[review.review_status]}</span>`,
  ];

  if (review.sexual_harassment === 1) {
    badges.push('<span class="badge badge-warning">گزارش آزار</span>');
  }

  return `
    <article class="review-card" role="listitem" data-id="${review.id}">
      <div class="review-avatar" aria-hidden="true">ن</div>
      <div class="review-body">
        <div class="review-top">
          <span class="review-author">ناشناس</span>
          ${date ? `<time class="review-date" datetime="${review.created_at}">${date}</time>` : ''}
        </div>
        ${review.title ? `<h3 class="review-title">${escapeHtml(review.title)}</h3>` : ''}
        <p class="review-desc">${escapeHtml(review.description || '')}</p>
        ${showReadMore ? '<button class="read-more" type="button">نمایش بیشتر</button>' : ''}
        <div class="review-footer">
          ${renderStars(review.rate)}
          <div class="review-badges">${badges.join('')}</div>
        </div>
        ${metaParts.length ? `<div class="review-meta">${metaParts.join('')}</div>` : ''}
      </div>
    </article>
  `;
}

function filterReviews() {
  if (currentFilter === 'all') return reviews;
  return reviews.filter((r) => r.review_type === currentFilter);
}

function renderReviews() {
  const filtered = sortByDateNewest(filterReviews());
  const feed = document.getElementById('reviews-feed');
  const empty = document.getElementById('empty-state');
  const countEl = document.getElementById('reviews-count');
  const total = reviews.length;

  if (currentFilter === 'all') {
    countEl.textContent = `${formatCount(total)} نظر — مرتب‌شده از جدید به قدیم`;
  } else {
    const label = TYPE_LABELS[currentFilter];
    countEl.textContent = `${formatCount(filtered.length)} از ${formatCount(total)} نظر (${label})`;
  }

  if (filtered.length === 0) {
    feed.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  feed.innerHTML = filtered.map(renderCard).join('');

  feed.querySelectorAll('.read-more').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.review-card');
      const expanded = card.classList.toggle('expanded');
      btn.textContent = expanded ? 'نمایش کمتر' : 'نمایش بیشتر';
    });
  });
}

function renderHeroCount() {
  const total = reviews.length;
  const interviews = reviews.filter((r) => r.review_type === 'INTERVIEW').length;
  const workReviews = reviews.filter((r) => r.review_type === 'REVIEW').length;

  document.getElementById('hero-count').textContent =
    `${formatCount(total)} نظر ثبت‌شده · ${formatCount(workReviews)} تجربه کاری · ${formatCount(interviews)} مصاحبه`;
}

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentFilter = btn.dataset.filter;
      renderReviews();
    });
  });
}

async function init() {
  try {
    const res = await fetch('data/reviews.json');
    reviews = sortByDateNewest(await res.json());
    renderHeroCount();
    renderReviews();
    setupFilters();
  } catch {
    document.getElementById('reviews-feed').innerHTML =
      '<p class="empty-state">خطا در بارگذاری تجربه‌ها.</p>';
  }
}

init();
