const state = { token: localStorage.getItem('token') || '', user: null, repos: [] };
const colors = { js: '#f1e05a', html: '#e34c26', css: '#563d7c', python: '#3572A5', ts: '#3178c6', other: '#8b949e' };
const $ = id => document.getElementById(id);
const toggle = (el, show) => el.classList.toggle('hidden', !show);
// Cache manager (10 mins)
const cache = (k, v) => {
  if (v) return localStorage.setItem(`gs_${k}`, JSON.stringify({ t: Date.now(), d: v }));
  const c = JSON.parse(localStorage.getItem(`gs_${k}`));
  return c && (Date.now() - c.t < 600000) ? c.d : null;
};
document.addEventListener('DOMContentLoaded', () => {
  if (state.token) $('tokenInput').value = state.token;
  $('tokenInput').oninput = e => localStorage.setItem('token', state.token = e.target.value.trim());
  $('searchForm').onsubmit = e => { e.preventDefault(); const u = $('usernameInput').value.trim(); if (u) search(u); };
  $('repoSearch').oninput = renderRepos;
  $('repoSort').onchange = renderRepos;
});
async function search(usr) {
  $('statusMessage').textContent = 'Analyzing...';
  toggle($('dashboard'), 0);
  toggle($('statusMessage'), 1);
  const cached = cache(usr.toLowerCase());
  if (cached) return display(cached.user, cached.repos);
  try {
    const headers = state.token ? { Authorization: `token ${state.token}` } : {};
    const resU = await fetch(`https://api.github.com/users/${usr}`, { headers });
    if (!resU.ok) throw new Error(resU.status === 404 ? 'User not found' : 'API error');
    
    const user = await resU.json();
    const resR = await fetch(`https://api.github.com/users/${usr}/repos?per_page=100`, { headers });
    const repos = resR.ok ? await resR.json() : [];
    
    cache(usr.toLowerCase(), { user, repos });
    display(user, repos);
  } catch (err) {
    $('statusMessage').textContent = `⚠️ ${err.message}`;
  }
}
function display(user, repos) {
  state.user = user; state.repos = repos;
  toggle($('statusMessage'), 0);
  toggle($('dashboard'), 1);
  $('userAvatar').src = user.avatar_url;
  $('userName').textContent = user.name || user.login;
  $('userLogin').textContent = `@${user.login}`;
  $('userLogin').href = user.html_url;
  $('userBio').textContent = user.bio || 'No biography.';
  $('metaLoc').textContent = user.location ? `📍 ${user.location}` : '';
  $('metaBlog').style.display = user.blog ? 'block' : 'none';
  if (user.blog) {
    $('blogLink').href = user.blog.startsWith('http') ? user.blog : `https://${user.blog}`;
    $('blogLink').textContent = user.blog;
  }
  $('metaJoined').textContent = `📅 Joined ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  const stars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const forks = repos.reduce((f, r) => f + r.forks_count, 0);
  $('statRepos').textContent = user.public_repos;
  $('statStars').textContent = stars;
  $('statForks').textContent = forks;
  $('statFollowers').textContent = user.followers;
  // Badges
  const badges = [
    stars >= 100 && '⭐ Star Magnet',
    forks >= 30 && '🌿 Fork Master',
    user.public_repos >= 30 && '📦 Builder',
    new Set(repos.map(r => r.language).filter(Boolean)).size >= 4 && '🚀 Polyglot',
    (Date.now() - new Date(user.created_at)) / 31557600000 >= 8 && '🎓 Veteran'
  ].filter(Boolean);
  $('achievementsList').innerHTML = (badges.length ? badges : ['🌱 Rising Star'])
    .map(b => `<span class="badge-tag">${b}</span>`).join('');
  // Languages Horizontal Bar Chart
  let total = 0;
  const langMap = {};
  repos.forEach(r => { if (r.language && r.size > 0) { langMap[r.language] = (langMap[r.language] || 0) + r.size; total += r.size; } });
  
  const sorted = Object.entries(langMap)
    .map(([name, size]) => ({ name, pct: (size / total) * 100 }))
    .sort((a, b) => b.pct - a.pct).slice(0, 5);
  $('langBar').innerHTML = total ? sorted.map(l => {
    const col = colors[l.name.toLowerCase()] || colors.other;
    return `<div class="lang-bar-segment" style="width: ${l.pct}%; background: ${col}" title="${l.name}: ${l.pct.toFixed(1)}%"></div>`;
  }).join('') : '<div style="width:100%; background:#333; height:100%"></div>';
  $('langLegend').innerHTML = total ? sorted.map(l => {
    const col = colors[l.name.toLowerCase()] || colors.other;
    return `<span class="legend-item"><span class="legend-dot" style="background:${col}"></span>${l.name} (${l.pct.toFixed(1)}%)</span>`;
  }).join('') : '<span>No language metrics found.</span>';
  renderRepos();
}
function renderRepos() {
  const searchVal = $('repoSearch').value.toLowerCase();
  const sortVal = $('repoSort').value;
  const list = state.repos
    .filter(r => r.name.toLowerCase().includes(searchVal))
    .sort((a, b) => {
      if (sortVal === 'stars') return b.stargazers_count - a.stargazers_count;
      if (sortVal === 'forks') return b.forks_count - a.forks_count;
      if (sortVal === 'size') return b.size - a.size;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  $('reposList').innerHTML = list.length ? list.slice(0, 30).map(r => `
    <div class="repo-item">
      <div class="repo-left">
        <h5><a href="${r.html_url}" target="_blank">${r.name}</a></h5>
        <p>${r.description || 'No description.'}</p>
      </div>
      <div class="repo-right">
        <span>⭐ ${r.stargazers_count}</span>
        <span>🍴 ${r.forks_count}</span>
        <span>${r.language || '—'}</span>
      </div>
    </div>
  `).join('') : '<p style="padding:10px 0; color:#666">No matching repositories.</p>';
}
