(function(){
  var form=document.getElementById('quiz'); if(!form) return;
  var shell=document.getElementById('testet'), qs=[].slice.call(form.querySelectorAll('.q'));
  var TIPS={"ORD": "Läs mycket och slå upp okända ord. Försök alltid gissa betydelsen från sammanhanget först.", "XYZ": "Gör om enheter och procent först, och kontrollera att svaret är rimligt innan du går vidare.", "KVA": "Testa flera värden (negativt, noll, bråk och ett) för att se om jämförelsen kan ändras.", "NOG": "Bedöm varje uppgift för sig först och därefter tillsammans. Du ska inte lösa uppgiften, bara avgöra om informationen räcker."};
  var N=qs.length, cur=0, score=0, chosen=[], done=[];
  var $=function(id){return document.getElementById(id)};
  var start=$('start'), topbar=$('topbar'), actions=$('actions'), act=$('act'), res=$('resultat');
  var pn=$('pl-n'), pc=$('pl-c'), fill=$('bar-fill');
  function state(s){shell.setAttribute('data-state',s)}
  function top(){var h=document.querySelector('.site-header'),off=(h&&getComputedStyle(h).position==='sticky')?h.offsetHeight+14:14,r=shell.getBoundingClientRect(); if(r.top<off-2||r.top>off+140) window.scrollTo({top:r.top+window.pageYOffset-off,behavior:'smooth'})}
  function progress(){
    var d=done.filter(Boolean).length; fill.style.width=(d/N*100)+'%';
    pn.textContent='Fråga '+(cur+1)+' av '+N; pc.textContent=qs[cur].getAttribute('data-code');
  }
  function show(i){
    cur=i; qs.forEach(function(q,k){q.classList.toggle('current',k===i)});
    progress();
    act.textContent='Kontrollera svar'; act.disabled=!qs[i].querySelector('input:checked');
    act.setAttribute('data-mode','check');
    if(done[i]){act.disabled=false; act.textContent=i<N-1?'Nästa fråga':'Se resultat'; act.setAttribute('data-mode','next')}
    top(); qs[i].focus({preventScroll:true});
  }
  function begin(){
    score=0; chosen=[]; done=[]; form.reset();
    qs.forEach(function(q){
      q.classList.remove('checked','correct','wrong');
      var v=q.querySelector('.verdict'); if(v) v.remove();
      q.querySelector('.expl').open=false;
      [].forEach.call(q.querySelectorAll('.opt'),function(o){o.classList.remove('is-right','is-wrong','sel');o.querySelector('input').disabled=false});
    });
    res.hidden=true; start.hidden=true; topbar.hidden=false; actions.hidden=false; state('run'); show(0);
  }
  function check(){
    var q=qs[cur], right=q.getAttribute('data-answer'), sel=q.querySelector('input:checked'); if(!sel) return;
    var val=sel.value, ok=val===right; chosen[cur]=val; done[cur]=true; if(ok) score++;
    q.classList.add('checked',ok?'correct':'wrong');
    [].forEach.call(q.querySelectorAll('.opt'),function(o){
      var v=o.querySelector('input').value; if(v===right) o.classList.add('is-right'); else if(v===val) o.classList.add('is-wrong');
      o.querySelector('input').disabled=true;
    });
    var vd=document.createElement('p'); vd.className='verdict '+(ok?'ok':'no'); vd.setAttribute('role','status');
    vd.textContent=ok?'Rätt!':'Inte riktigt – rätt svar är '+right+'.';
    q.querySelector('.expl').insertAdjacentElement('beforebegin',vd);
    q.querySelector('.expl').open=true; progress();
    act.textContent=cur<N-1?'Nästa fråga':'Se resultat'; act.setAttribute('data-mode','next'); act.focus({preventScroll:true});
    vd.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function finish(){
    var byCode={},order=[];
    qs.forEach(function(q,k){var c=q.getAttribute('data-code'); if(!byCode[c]){byCode[c]={ok:0,n:0};order.push(c)} byCode[c].n++; if(chosen[k]===q.getAttribute('data-answer')) byCode[c].ok++});
    $('res-score').textContent=score;
    var msg=score>=8?'Starkt resultat! Du klarade de flesta frågorna. Fortsätt med provpass på tid för att hålla tempot uppe.'
      :score>=5?'Bra grund. Du har en del att bygga vidare på – fokusera på delproven nedan så tar du stora kliv.'
      :'Bra att du testade – nu vet du var du ska börja. Börja med grunderna i delproven nedan och läs förklaringarna noga.';
    $('res-msg').textContent=msg;
    var codes=$('res-codes'); codes.innerHTML=''; var tips=$('res-tips'); tips.innerHTML=''; var weak=[];
    order.forEach(function(c){var li=document.createElement('li'),d=byCode[c]; li.className=d.ok===d.n?'good':'bad'; li.textContent=c+' '+d.ok+'/'+d.n+(d.ok===d.n?' ✓':''); codes.appendChild(li); if(d.ok<d.n) weak.push(c)});
    if(weak.length){var h=document.createElement('h3'); h.textContent='Träna mer på'; tips.appendChild(h); var ul=document.createElement('ul');
      weak.forEach(function(c){var li=document.createElement('li'); li.innerHTML='<strong>'+c+':</strong> '+TIPS[c]; ul.appendChild(li)}); tips.appendChild(ul)}
    var rv=$('res-review'); rv.innerHTML='';
    qs.forEach(function(q,k){var ok=chosen[k]===q.getAttribute('data-answer'), li=document.createElement('li'); li.className=ok?'ok':'bad';
      li.innerHTML='<span class="rc">'+q.getAttribute('data-code')+'</span><span class="rt">'+q.getAttribute('data-short')+'</span><span class="rm">'+(ok?'✓ Rätt':'✗ Du svarade '+chosen[k]+', rätt är '+q.getAttribute('data-answer'))+'</span>'; rv.appendChild(li)});
    topbar.hidden=true; actions.hidden=true; qs.forEach(function(q){q.classList.remove('current')});
    state('done'); res.hidden=false; res.focus({preventScroll:true}); top();
  }
  $('begin').addEventListener('click',begin);
  $('retry').addEventListener('click',begin);
  act.addEventListener('click',function(){
    if(act.getAttribute('data-mode')==='check') check();
    else if(cur<N-1) show(cur+1); else finish();
  });
  form.addEventListener('change',function(e){
    var q=e.target.closest('.q'); if(!q) return;
    [].forEach.call(q.querySelectorAll('.opt'),function(o){o.classList.toggle('sel',o.querySelector('input').checked)});
    if(!done[cur]) act.disabled=false;
  });
  form.addEventListener('submit',function(e){e.preventDefault()});
  if(location.hash==='#testet') begin();
  var m=/^#fraga-(\d+)$/.exec(location.hash);
  if(m){ begin(); var idx=Math.min(Math.max(parseInt(m[1],10)-1,0),N-1); show(idx); }
})();
