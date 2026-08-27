/* Production page enhancements: dedicated streaming hub and linked home sections. */
const baseSection=section,baseLivescore=livescore;
section=function(title,html,klass=''){
  const routes={'Live Stream Bola':'/livescore?tab=live','Prediksi':'/prediksi','Klasemen':'/klasemen','Berita Olahraga':'/berita'};
  const label=routes[title]?`<a class="section-title" href="${routes[title]}">${title} ›</a>`:`<span class="section-title">${title} ›</span>`;
  return `<section class="section">${label}<div class="${klass}">${html}</div></section>`;
};

function streamState(x){
  const s=String(x.match_status||x.status||'').toLowerCase();
  if(['live','1h','2h','ht','et','p'].includes(s))return 'live';
  const kick=Number(x.match_time||x.timestamp||0)*1000;
  return kick&&kick<Date.now()?'finished':'scheduled';
}
function hubStreamCard(x){
  const t=streamTeams(x),mid=x.match_id||x.id||x.slug||encodeURIComponent(`${t.home.name}-vs-${t.away.name}`),status=streamState(x),kick=Number(x.match_time||x.timestamp||0)*1000;
  return `<a class="live-hub-card" data-stream-status="${status}" href="/match/${esc(mid)}"><div class="live-ribbon ${status}">${status==='live'?'● LIVE':status==='finished'?'BERAKHIR':'AKAN DATANG'}</div><div class="live-league">${esc(x.league_name||x.league||'Sepak Bola')}</div><div class="live-hub-teams">${team(t.home)}<strong>${status==='live'?esc((x.homeTeamScore??x.home_score??0)+' : '+(x.awayTeamScore??x.away_score??0)):'VS'}</strong>${team(t.away)}</div><div class="live-watch">${status==='live'?'▣ Nonton Sekarang':kick?`Mulai ${fmtDate(kick)} • ${fmtTime(kick)}`:'Buka pertandingan'}</div></a>`;
}
async function liveStreamHub(){
  app.innerHTML='<div class="loading"><span></span> Memuat pertandingan live...</div>';
  try{
    const streams=await loadStreams();state.streams=streams;
    app.innerHTML=`<div class="container live-hub"><div class="live-hub-heading"><div><small>LIVE STREAMING</small><h1>Live Stream Bola</h1><p>Pilih pertandingan untuk membuka pemutar, server alternatif, dan komentar member.</p></div><a class="btn" href="/livescore">Lihat Semua Skor</a></div><div class="live-hub-filters"><input id="liveSearch" placeholder="🔍 Cari tim atau liga..."><button class="filter-active" data-live-filter="all">Semua (${streams.length})</button><button data-live-filter="live">Live (${streams.filter(x=>streamState(x)==='live').length})</button><button data-live-filter="scheduled">Dijadwalkan</button><button data-live-filter="finished">Berakhir</button></div><div id="liveGrid" class="live-hub-grid">${streams.map(hubStreamCard).join('')||'<div class="service-empty"><img src="/favicon.svg"><div><b>Belum ada pertandingan streaming</b><span>Jadwal akan muncul otomatis saat penyedia mengirim data.</span></div></div>'}</div></div>`;
    const apply=()=>{const q=(document.querySelector('#liveSearch')?.value||'').toLowerCase(),f=document.querySelector('[data-live-filter].filter-active')?.dataset.liveFilter||'all';document.querySelectorAll('.live-hub-card').forEach(c=>c.hidden=!(c.textContent.toLowerCase().includes(q)&&(f==='all'||c.dataset.streamStatus===f)))};
    document.querySelector('#liveSearch')?.addEventListener('input',apply);
    document.querySelectorAll('[data-live-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-live-filter]').forEach(x=>x.classList.remove('filter-active'));b.classList.add('filter-active');apply()});
  }catch(e){app.innerHTML=`<div class="container live-hub">${configError({message:friendlyApiError(e.message,'stream')})}</div>`}
}

async function liveSideStandings(){
  const box=document.querySelector('.livescore-page .standings');if(!box)return;
  try{const d=await api('/api/football/standings?league=39&season='+new Date().getFullYear()),rows=d.response?.[0]?.league?.standings?.[0]||[];box.innerHTML=`<h3>Premier League</h3><small>KLASEMEN TERKINI</small><table class="side-table"><thead><tr><th>#</th><th>Tim</th><th>PL</th><th>PTS</th></tr></thead><tbody>${rows.slice(0,20).map(r=>`<tr><td>${r.rank}</td><td><img src="${esc(r.team.logo)}">${esc(r.team.name)}</td><td>${r.all.played}</td><td><b>${r.points}</b></td></tr>`).join('')}</tbody></table><a class="btn standings-more" href="/klasemen?league=39">Klasemen Lengkap</a>`}catch{}
}
livescore=async function(){
  if(new URLSearchParams(location.search).get('tab')==='live')return liveStreamHub();
  await baseLivescore();liveSideStandings();
};
