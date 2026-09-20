(function(){
  var form=document.getElementById('quiz'); if(!form) return;
  var qs=[].slice.call(form.querySelectorAll('.q'));
  var TIPS={"ORD": "Läs mycket och slå upp okända ord. Försök alltid gissa betydelsen från sammanhanget först.", "XYZ": "Gör om enheter och procent först, och kontrollera att svaret är rimligt innan du går vidare.", "KVA": "Testa flera värden (negativt, noll, bråk och ett) för att se om jämförelsen kan ändras.", "NOG": "Bedöm varje uppgift för sig först och därefter tillsammans. Du ska inte lösa uppgiften, bara avgöra om informationen räcker."};
  var N=qs.length, prog=document.getElementById('progress'), res=document.getElementById('resultat');
  function answered(){return qs.filter(function(q){return q.querySelector('input:checked')}).length}
  function upd(){prog.textContent=answered()+' av '+N+' besvarade'}
  form.addEventListener('change',upd);
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var score=0,byCode={},order=[],skipped=0;
    qs.forEach(function(q){
      var code=q.getAttribute('data-code'), right=q.getAttribute('data-answer');
      var sel=q.querySelector('input:checked'); var val=sel?sel.value:null;
      q.classList.remove('correct','wrong','skipped'); q.classList.add('checked');
      [].forEach.call(q.querySelectorAll('.opt'),function(o){
        var v=o.querySelector('input').value; o.classList.remove('is-right','is-wrong');
        if(v===right) o.classList.add('is-right'); else if(v===val) o.classList.add('is-wrong');
        o.querySelector('input').disabled=true;
      });
      var ok=val===right;
      if(ok) score++; else if(!val) skipped++;
      q.classList.add(ok?'correct':(val?'wrong':'skipped'));
      q.querySelector('.expl').open=!ok;
      if(!byCode[code]){byCode[code]={ok:0,n:0};order.push(code)}
      byCode[code].n++; if(ok) byCode[code].ok++;
    });
    document.getElementById('res-score').textContent=score;
    var msg=score>=8?'Starkt resultat! Du klarade de flesta frågorna. Fortsätt med provpass på tid för att hålla tempot uppe.'
      :score>=5?'Bra grund. Du har en del att bygga vidare på – fokusera på delproven nedan så tar du stora kliv.'
      :'Bra att du testade – nu vet du var du ska börja. Börja med grunderna i delproven nedan och läs förklaringarna noga.';
    if(skipped) msg+=' Du lämnade '+skipped+' fråga'+(skipped>1?'r':'')+' obesvarad'+(skipped>1?'e':'')+'.';
    document.getElementById('res-msg').textContent=msg;
    var codes=document.getElementById('res-codes'); codes.innerHTML='';
    var tips=document.getElementById('res-tips'); tips.innerHTML='';
    var weak=[];
    order.forEach(function(c){
      var li=document.createElement('li'), d=byCode[c];
      li.className=d.ok===d.n?'good':'bad'; li.textContent=c+' '+d.ok+'/'+d.n+(d.ok===d.n?' ✓':'');
      codes.appendChild(li); if(d.ok<d.n) weak.push(c);
    });
    if(weak.length){
      var h=document.createElement('h3'); h.textContent='Träna mer på'; tips.appendChild(h);
      var ul=document.createElement('ul');
      weak.forEach(function(c){var li=document.createElement('li'); li.innerHTML='<strong>'+c+':</strong> '+TIPS[c]; ul.appendChild(li)});
      tips.appendChild(ul);
    }
    res.hidden=false; res.focus(); res.scrollIntoView({behavior:'smooth',block:'start'});
    form.querySelector('button[type=submit]').disabled=true;
  });
  document.getElementById('retry').addEventListener('click',function(){
    form.reset();
    qs.forEach(function(q){
      q.classList.remove('checked','correct','wrong','skipped');
      q.querySelector('.expl').open=false;
      [].forEach.call(q.querySelectorAll('.opt'),function(o){o.classList.remove('is-right','is-wrong');o.querySelector('input').disabled=false});
    });
    form.querySelector('button[type=submit]').disabled=false;
    res.hidden=true; upd(); document.getElementById('testet').scrollIntoView({behavior:'smooth'});
  });
})();
