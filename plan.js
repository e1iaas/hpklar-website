(function(){
  var form=document.getElementById('planform'); if(!form) return;
  var out=document.getElementById('plan'), err=document.getElementById('planerr');
  var TIPS={"ORD": "Läs mycket och slå upp okända ord. Försök alltid gissa betydelsen från sammanhanget innan du kollar facit.", "MEK": "Läs hela meningen, hitta signalord som ”trots”, ”eftersom” och ”däremot”, och pröva alternativen ett i taget.", "LÄS": "Läs frågorna innan du läser hela texten i detalj, och gå tillbaka till texten för att belägga varje svar – gissa inte från minnet.", "ELF": "Läs frågan först, leta upp stället i texten och håll utkik efter signalord som however och but.", "XYZ": "Gör om enheter och procent först, och kontrollera att svaret är rimligt innan du går vidare.", "KVA": "Testa flera värden (negativt, noll, bråk och ett) för att se om jämförelsen kan ändras.", "NOG": "Bedöm varje uppgift för sig först och därefter tillsammans. Du ska inte lösa uppgiften, bara avgöra om informationen räcker.", "DTK": "Läs titel, enheter och axlar noga innan du svarar, och räkna på startvärdet vid procentändringar."};
  var RHYTHM={
    low:'Cirka 3 korta pass i veckan, 20–30 minuter per pass. Prioritera kvalitet – hellre 20 uppgifter du verkligen förstår än 100 du rusar igenom.',
    mid:'Cirka 4–5 pass i veckan, 30–45 minuter per pass, plus ett provpass på tid varannan vecka.',
    high:'Cirka 5–6 pass i veckan plus minst ett fullt provpass på tid varje vecka.',
    max:'Nästan dagliga pass plus minst ett fullt provpass på tid varje vecka. Se till att också lägga in vilodagar.'
  };
  function pad(n){return (n<10?'0':'')+n}
  function todayLocal(){var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
  function parseDate(v){var p=v.split('-'); return new Date(+p[0],+p[1]-1,+p[2])}
  function daysBetween(a,b){return Math.round((b-a)/86400000)}
  function weakList(){return [].slice.call(form.querySelectorAll('input[name="delprov"]:checked')).map(function(i){return i.value})}

  function phasesFor(days){
    if(days<=6) return [
      {title:'Fram till provdagen ('+days+' dag'+(days===1?'':'ar')+' kvar)',bullets:[
        'Lär dig inget nytt. Repetera i stället det du redan kan.',
        'Gå igenom dina tidigare felsvar en sista gång.',
        'Gör högst ett lugnt provpass tidigt i perioden, inte dagen innan.',
        'Prioritera sömn och ta det lugnt dagen före provet.',
        'Kolla i god tid var och när du ska vara på provdagen.'
      ]}
    ];
    var weeks=Math.max(1,Math.round(days/7));
    if(weeks<=2) return [
      {title:'Vecka 1: Kartlägg och träna',bullets:['Gör ett provpass på tid för att se var du står, om du inte redan gjort det.','Träna extra på dina svagaste delprov (se nedan).','Läs förklaringen till varje fel svar innan du går vidare.']},
      {title:'Sista veckan: Repetera och vila',bullets:['Repetera dina tidigare fel i stället för att lära dig nytt.','Gör ett sista lugnt provpass tidigt i veckan, inte i slutet.','Vila och sov ordentligt de sista dagarna.']}
    ];
    if(weeks<=5) return [
      {title:'Vecka 1: Grunder',bullets:['Gå igenom alla åtta delprov minst en gång så du vet hur de fungerar.','Gör ett första provpass på tid för att se ditt startläge.']},
      {title:'Vecka 2–'+(weeks-1)+': Fokusträning',bullets:['Lägg mest tid på dina svagaste delprov (se nedan).','Kör korta pass på ett delprov i taget snarare än långa maratonpass.','Gör minst ett provpass på tid varannan vecka.']},
      {title:'Sista veckan: Repetition',bullets:['Repetera dina tidigare felsvar.','Gör ett sista lugnt provpass tidigt i veckan.','Prioritera sömn och vila de sista dagarna.']}
    ];
    if(weeks<=11) return [
      {title:'Vecka 1: Kartlägg dig själv',bullets:['Gör ett provpass på tid för att se ditt startläge.','Notera vilka delprov som gick sämst – det styr resten av planen.']},
      {title:'Vecka 2–'+Math.round(weeks*0.6)+': Bygg grunder och träna svaga delprov',bullets:['Gå igenom alla delprov, men lägg mest tid på dina svagaste (se nedan).','Läs förklaringen till varje fel svar innan du går vidare.']},
      {title:'Vecka '+(Math.round(weeks*0.6)+1)+'–'+(weeks-1)+': Provpass och tempo',bullets:['Gör minst ett fullt provpass på tid varje eller varannan vecka.','Fortsätt träna svaga delprov mellan provpassen.']},
      {title:'Sista veckan: Repetition',bullets:['Sluta lära dig nytt. Repetera tidigare fel i stället.','Gör ett sista lugnt provpass tidigt i veckan.','Prioritera sömn de sista dagarna.']}
    ];
    var m=Math.round(weeks/4.3);
    return [
      {title:'Månad 1: Grunder',bullets:['Gå igenom alla åtta delprov och gör ett första provpass på tid för att se ditt startläge.','Bygg en vana: några pass i veckan är bättre än enstaka långa plugghelger.']},
      {title:'Månad 2'+(m>3?'–'+(m-1):'')+': Fokusträning och provpass',bullets:['Lägg mest tid på dina svagaste delprov (se nedan).','Gör ett fullt provpass på tid ungefär varannan vecka för att följa din utveckling.']},
      {title:'Sista 2 veckorna: Repetition',bullets:['Sluta lära dig nytt. Repetera tidigare felsvar i stället.','Gör ett sista lugnt provpass tidigt i perioden, inte i sista veckan.','Prioritera sömn och vila de sista dagarna.']}
    ];
  }

  function render(days,ptid,weak){
    var phases=phasesFor(days), weeks=Math.max(1,Math.round(days/7));
    var html='<p class="eyebrow">Din studieplan</p>';
    html+='<p class="score"><span>'+days+'</span><small>dag'+(days===1?'':'ar')+' kvar</small></p>';
    html+='<p class="res-msg">Det är ungefär '+weeks+' '+(weeks===1?'vecka':'veckor')+' kvar till provet. Så här kan du lägga upp tiden:</p>';
    html+='<div class="rhythm"><strong>Ditt veckotempo:</strong> '+RHYTHM[ptid]+'</div>';
    html+='<ol class="phases">'+phases.map(function(p){return '<li><h3>'+p.title+'</h3><ul>'+p.bullets.map(function(b){return '<li>'+b+'</li>'}).join('')+'</ul></li>'}).join('')+'</ol>';
    if(weak.length){
      html+='<h3>Extra fokus på dina svaga delprov</h3><ul class="weaklist">'+weak.map(function(c){return '<li><strong>'+c+':</strong> '+(TIPS[c]||'')+'</li>'}).join('')+'</ul>';
    } else {
      html+='<p class="note">Du angav inga svaga delprov. <a href="/hogskoleprovet-test">Gör det gratis testet</a> eller kolla statistiken i HP Klar för att se vilka delprov du bör prioritera.</p>';
    }
    html+='<div class="cta-row"><a class="btn" href="https://apps.apple.com/se/app/hp-klar/id0000000000" rel="noopener">Hämta HP Klar i App Store</a><button type="button" class="btn ghost" id="printplan">Skriv ut planen</button></div>';
    out.innerHTML=html;
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var v=document.getElementById('pdatum').value;
    err.hidden=true;
    if(!v){err.textContent='Ange ett provdatum.'; err.hidden=false; out.hidden=true; return}
    var test=parseDate(v), today=todayLocal(), days=daysBetween(today,test);
    if(days<0){err.textContent='Det datumet har redan passerat. Välj ett kommande provdatum.'; err.hidden=false; out.hidden=true; return}
    render(days, document.getElementById('ptid').value, weakList());
    out.hidden=false; out.focus({preventScroll:true});
    out.scrollIntoView({behavior:'smooth',block:'start'});
    var pb=document.getElementById('printplan'); if(pb) pb.addEventListener('click',function(){window.print()});
  });
})();
