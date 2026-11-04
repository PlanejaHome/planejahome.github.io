/* Sorteio de amigo secreto offline. Tudo roda no navegador; nada e enviado.
   Nucleo em ES3 (sem forEach/map/trim) para ser testado no JScript por check_formulas_js.py. */

function amsTrim(s) { return String(s).replace(/^\s+|\s+$/g, ''); }

function amsNomes(texto) {
  var linhas = String(texto).split(/\r?\n|;/), nomes = [], vistos = {}, dup = [], i, n, k;
  for (i = 0; i < linhas.length; i++) {
    n = amsTrim(linhas[i]);
    if (!n) continue;
    k = n.toLowerCase();
    if (vistos[k]) { dup.push(n); continue; }
    vistos[k] = true; nomes.push(n);
  }
  return { nomes: nomes, repetidos: dup };
}

/* Cada linha: "Ana e Bruno", "Ana - Bruno", "Ana, Bruno" ou "Ana / Bruno". Retorna pares de indices e linhas nao reconhecidas. */
function amsRestricoes(texto, nomes) {
  var idx = {}, i, linhas = String(texto).split(/\r?\n/), pares = [], erros = [], p, a, b;
  for (i = 0; i < nomes.length; i++) idx[nomes[i].toLowerCase()] = i;
  for (i = 0; i < linhas.length; i++) {
    if (!amsTrim(linhas[i])) continue;
    p = linhas[i].split(/\s+e\s+|\s+-\s+|\s*,\s*|\s*\/\s*/i);
    if (p.length !== 2) { erros.push(amsTrim(linhas[i])); continue; }
    a = idx[amsTrim(p[0]).toLowerCase()]; b = idx[amsTrim(p[1]).toLowerCase()];
    if (a === undefined || b === undefined || a === b) { erros.push(amsTrim(linhas[i])); continue; }
    pares.push([a, b]);
  }
  return { pares: pares, erros: erros };
}

/* Gerador previsivel para testes. */
function amsSemente(seed) {
  var s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function amsProibido(proib, a, b) {
  for (var i = 0; i < proib.length; i++) {
    if ((proib[i][0] === a && proib[i][1] === b) || (proib[i][0] === b && proib[i][1] === a)) return true;
  }
  return false;
}

/* alvo[i] = indice de quem a pessoa i tirou. Valido: ninguem tira a si mesmo nem alguem proibido. */
function amsValido(n, alvo, proib) {
  if (!alvo || alvo.length !== n) return false;
  var usado = {}, i;
  for (i = 0; i < n; i++) {
    if (alvo[i] === i || usado[alvo[i]] || alvo[i] < 0 || alvo[i] >= n) return false;
    if (amsProibido(proib, i, alvo[i])) return false;
    usado[alvo[i]] = true;
  }
  return true;
}

/* Tenta primeiro um ciclo unico (A->B->C->...->A: ninguem forma par fechado);
   se as restricoes impedirem, aceita qualquer permutacao valida. null = impossivel. */
function amsSortear(n, proib, rnd) {
  var t, i, j, tmp, p;
  if (n < 2) return null;
  for (t = 0; t < 4000; t++) {
    p = [];
    for (i = 0; i < n; i++) p.push(i);
    for (i = n - 1; i > 0; i--) {
      j = t < 2000 ? Math.floor(rnd() * i) : Math.floor(rnd() * (i + 1)); /* Sattolo, depois Fisher-Yates */
      tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    if (amsValido(n, p, proib)) return p;
  }
  return null;
}

function amsCicloUnico(alvo) {
  var n = alvo.length, i = 0, passos = 0;
  do { i = alvo[i]; passos++; } while (i !== 0 && passos <= n);
  return passos === n;
}

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var estado = null;
  function rnd() {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] / 4294967296;
    }
    return Math.random();
  }
  function msg(t, erro) { var m = $('ams-msg'); m.textContent = t; m.className = erro ? 'aviso' : 'miudo'; }
  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; }

  function sortear() {
    var r = amsNomes($('ams-nomes').value), nomes = r.nomes;
    if (nomes.length < 3) { msg('Digite pelo menos 3 nomes, um por linha.', true); return; }
    var rs = amsRestricoes($('ams-restricoes').value, nomes);
    if (rs.erros.length) { msg('Não entendi estas restrições (confira se os nomes estão iguais à lista): ' + rs.erros.join('; '), true); return; }
    var alvo = amsSortear(nomes.length, rs.pares, rnd);
    if (!alvo) { msg('Com essas restrições não existe sorteio possível. Remova alguma e tente de novo.', true); return; }
    estado = { nomes: nomes, alvo: alvo, visto: {} };
    msg((r.repetidos.length ? 'Nomes repetidos ignorados: ' + r.repetidos.join(', ') + '. ' : '') +
        'Sorteio feito com ' + nomes.length + ' participantes. Ninguém viu o resultado. Passe o aparelho: cada pessoa toca no próprio nome.');
    montarLista();
    montarBilhetes();
    $('ams-passo2').hidden = false;
    $('ams-revelar').hidden = true;
  }

  function montarLista() {
    var ul = $('ams-lista'); ul.innerHTML = '';
    for (var i = 0; i < estado.nomes.length; i++) (function (i) {
      var li = el('li'), b = el('button', estado.nomes[i], estado.visto[i] ? 'sec visto' : 'sec');
      b.type = 'button';
      b.onclick = function () { pedirConfirmacao(i); };
      li.appendChild(b); ul.appendChild(li);
    })(i);
    var n = 0; for (var k in estado.visto) if (estado.visto.hasOwnProperty(k)) n++;
    $('ams-contagem').textContent = n + ' de ' + estado.nomes.length + ' já viram quem tiraram.';
  }

  function pedirConfirmacao(i) {
    var box = $('ams-revelar');
    box.innerHTML = '';
    box.appendChild(el('p', 'Só continue se você for ' + estado.nomes[i] + '.'));
    var ok = el('button', 'Sou ' + estado.nomes[i] + ', mostrar'); ok.type = 'button';
    var volta = el('button', 'Voltar', 'sec'); volta.type = 'button';
    ok.onclick = function () {
      box.innerHTML = '';
      box.appendChild(el('p', estado.nomes[i] + ', você tirou:'));
      box.appendChild(el('p', estado.nomes[estado.alvo[i]], 'ams-tirou'));
      var v = $('ams-valor').value;
      if (v) box.appendChild(el('p', 'Valor combinado do presente: até R$ ' + v + '.', 'miudo'));
      var esc = el('button', 'Já memorizei, esconder'); esc.type = 'button';
      esc.onclick = function () { estado.visto[i] = true; box.hidden = true; box.innerHTML = ''; montarLista(); };
      box.appendChild(esc);
    };
    volta.onclick = function () { box.hidden = true; box.innerHTML = ''; };
    box.appendChild(ok); box.appendChild(document.createTextNode(' ')); box.appendChild(volta);
    box.hidden = false;
  }

  function montarBilhetes() {
    var d = $('ams-bilhetes'); d.innerHTML = '';
    var v = $('ams-valor').value, data = $('ams-data').value;
    for (var i = 0; i < estado.nomes.length; i++) {
      var b = el('div', '', 'bilhete');
      b.appendChild(el('p', 'Para: ' + estado.nomes[i], 'bilhete-para'));
      b.appendChild(el('p', '(dobre aqui)', 'miudo'));
      b.appendChild(el('p', 'Você tirou: ' + estado.nomes[estado.alvo[i]], 'bilhete-tirou'));
      if (v || data) b.appendChild(el('p', (v ? 'Presente até R$ ' + v + '. ' : '') + (data ? 'Troca: ' + data.split('-').reverse().join('/') : ''), 'miudo'));
      d.appendChild(b);
    }
  }

  $('ams-sortear').onclick = sortear;
  $('ams-novo').onclick = function () { estado = null; $('ams-passo2').hidden = true; $('ams-bilhetes').innerHTML = ''; msg('Resultado anterior descartado. Ajuste a lista e sorteie de novo.'); };
  $('ams-imprimir').onclick = function () {
    if (!estado) return;
    montarBilhetes();
    document.body.className += ' imprimir-bilhetes';
    window.print();
    setTimeout(function () { document.body.className = document.body.className.replace(' imprimir-bilhetes', ''); }, 500);
  };
  $('ams-exemplo').onclick = function () {
    $('ams-nomes').value = 'Ana\nBruno\nCarla\nDiego\nElisa\nFábio\nGabi';
    $('ams-restricoes').value = 'Ana e Bruno\nCarla e Diego';
    $('ams-valor').value = '50';
    msg('Exemplo preenchido. Toque em Sortear.');
  };
})();
