/* Calendario de contas do mes. Tudo roda no navegador; os dados ficam so neste aparelho (localStorage).
   Nucleo em ES3 para ser testado no JScript por check_formulas_js.py. */

function ccDiasNoMes(ano, mes) { return new Date(ano, mes, 0).getDate(); } /* mes 1-12 */

/* Feriados nacionais de data fixa (Lei 662/1949, Lei 6.802/1980, Lei 14.759/2023). Moveis (Carnaval, Paixao) ficam de fora. */
var CC_FERIADOS = { '1-1': 'Confraternização Universal', '4-21': 'Tiradentes', '5-1': 'Dia do Trabalho',
  '9-7': 'Independência', '10-12': 'Nossa Senhora Aparecida', '11-2': 'Finados',
  '11-15': 'Proclamação da República', '11-20': 'Consciência Negra', '12-25': 'Natal' };

function ccDiaUtil(d) {
  var w = d.getDay();
  return w !== 0 && w !== 6 && !CC_FERIADOS[(d.getMonth() + 1) + '-' + d.getDate()];
}

/* contas: [{nome, valor, dia}]. diaSalario: dia em que o dinheiro entra (0 = nao informado). */
function ccMontar(ano, mes, contas, diaSalario) {
  var ult = ccDiasNoMes(ano, mes), itens = [], i, c, dia, d, pag, motivo, r, w;
  r = { total: 0, antes: 0, depois: 0, semanas: [0, 0, 0, 0, 0], itens: itens, ultimo: ult, porDia: {} };
  for (i = 0; i < contas.length; i++) {
    c = contas[i];
    if (!(c.valor > 0) || !(c.dia >= 1)) continue;
    dia = Math.min(Math.floor(c.dia), ult);
    d = new Date(ano, mes - 1, dia);
    pag = new Date(ano, mes - 1, dia);
    motivo = '';
    if (!ccDiaUtil(d)) {
      w = d.getDay();
      motivo = (w === 0 || w === 6) ? 'fim de semana' : 'feriado';
      while (!ccDiaUtil(pag)) pag.setDate(pag.getDate() + 1);
    }
    itens.push({ nome: c.nome, valor: c.valor, dia: dia, diaSemana: d.getDay(), motivo: motivo,
      pagaDia: pag.getDate(), pagaMes: pag.getMonth() + 1, ajustado: dia !== Math.floor(c.dia) });
    r.total += c.valor;
    r.semanas[Math.min(Math.floor((dia - 1) / 7), 4)] += c.valor;
    r.porDia[dia] = (r.porDia[dia] || 0) + c.valor;
    if (diaSalario > 0 && dia < diaSalario) r.antes += c.valor; else r.depois += c.valor;
  }
  itens.sort(function (a, b) { return a.dia - b.dia || (b.valor - a.valor); });
  return r;
}

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var CHAVE = 'calendario-de-contas-v1';
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var EXEMPLO = [['Aluguel', 1400, 5], ['Condomínio', 480, 10], ['Luz', 210, 12], ['Água', 95, 15], ['Internet', 110, 20],
    ['Celular', 60, 20], ['Cartão de crédito', 1350, 8], ['Escola', 890, 10], ['IPVA (1ª cota)', 380, 25]];

  function linha(nome, valor, dia) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><input class="cc-nome" type="text" maxlength="40" aria-label="Conta"></td>' +
      '<td><input class="cc-valor" type="number" inputmode="decimal" min="0" step="0.01" aria-label="Valor em reais"></td>' +
      '<td><input class="cc-dia" type="number" inputmode="numeric" min="1" max="31" step="1" aria-label="Dia do vencimento"></td>' +
      '<td><button type="button" class="sec cc-del" aria-label="Remover">×</button></td>';
    tr.querySelector('.cc-nome').value = nome || '';
    tr.querySelector('.cc-valor').value = valor === undefined ? '' : valor;
    tr.querySelector('.cc-dia').value = dia || '';
    tr.querySelector('.cc-del').onclick = function () { tr.parentNode.removeChild(tr); atualizar(); };
    $('cc-linhas').appendChild(tr);
  }
  function ler() {
    var trs = $('cc-linhas').getElementsByTagName('tr'), out = [];
    for (var i = 0; i < trs.length; i++) {
      out.push({ nome: trs[i].querySelector('.cc-nome').value.trim() || 'Conta ' + (i + 1),
        valor: parseFloat(String(trs[i].querySelector('.cc-valor').value).replace(',', '.')) || 0,
        dia: parseInt(trs[i].querySelector('.cc-dia').value, 10) || 0 });
    }
    return out;
  }
  function salvar(contas) {
    try { localStorage.setItem(CHAVE, JSON.stringify({ contas: contas, salario: $('cc-salario').value })); } catch (e) {}
  }
  function td(txt, cls) { var e = document.createElement('td'); e.textContent = txt; if (cls) e.className = cls; return e; }

  function atualizar() {
    var ano = parseInt($('cc-ano').value, 10), mes = parseInt($('cc-mes').value, 10);
    var sal = parseInt($('cc-salario').value, 10) || 0, contas = ler();
    salvar(contas);
    if (!(ano > 1900)) return;
    var r = ccMontar(ano, mes, contas, sal);
    $('cc-titulo-mes').textContent = 'Contas de ' + MESES[mes - 1] + ' de ' + ano;
    $('out-total').textContent = brl.format(r.total);
    $('out-antes').textContent = sal ? brl.format(r.antes) : 'informe o dia do salário';
    $('out-depois').textContent = sal ? brl.format(r.depois) : '—';
    $('out-pico').textContent = (function () {
      var m = 0, k, d = 0; for (k in r.porDia) if (r.porDia.hasOwnProperty(k) && r.porDia[k] > m) { m = r.porDia[k]; d = k; }
      return d ? 'dia ' + d + ' (' + brl.format(m) + ')' : '—';
    })();
    var sem = $('cc-semanas'); sem.innerHTML = '';
    var rot = ['1 a 7', '8 a 14', '15 a 21', '22 a 28', '29 a ' + r.ultimo];
    for (var s = 0; s < (r.ultimo > 28 ? 5 : 4); s++) {
      var li = document.createElement('li'); li.textContent = 'Dias ' + rot[s] + ': ' + brl.format(r.semanas[s]); sem.appendChild(li);
    }
    // grade do mes
    var g = $('cc-grade'); g.innerHTML = '';
    var cab = document.createElement('tr');
    for (var j = 0; j < 7; j++) { var th = document.createElement('th'); th.textContent = SEM[j]; cab.appendChild(th); }
    g.appendChild(cab);
    var primeiro = new Date(ano, mes - 1, 1).getDay(), tr = document.createElement('tr'), cel;
    for (j = 0; j < primeiro; j++) tr.appendChild(td(''));
    for (var dia = 1; dia <= r.ultimo; dia++) {
      cel = document.createElement('td');
      var dt = new Date(ano, mes - 1, dia);
      cel.className = (ccDiaUtil(dt) ? '' : 'cc-naoutil') + (dia === sal ? ' cc-salario' : '');
      var b = document.createElement('b'); b.textContent = dia; cel.appendChild(b);
      for (var k = 0; k < r.itens.length; k++) if (r.itens[k].dia === dia) {
        var sp = document.createElement('span'); sp.textContent = r.itens[k].nome + ' ' + brl.format(r.itens[k].valor); cel.appendChild(sp);
      }
      if (dia === sal) { var sl = document.createElement('span'); sl.className = 'cc-tag'; sl.textContent = 'salário'; cel.appendChild(sl); }
      tr.appendChild(cel);
      if (dt.getDay() === 6) { g.appendChild(tr); tr = document.createElement('tr'); }
    }
    if (tr.childNodes.length) g.appendChild(tr);
    // lista ordenada
    var l = $('cc-lista'); l.innerHTML = '';
    for (k = 0; k < r.itens.length; k++) {
      var it = r.itens[k], row = document.createElement('tr');
      row.appendChild(td(('0' + it.dia).slice(-2) + '/' + ('0' + mes).slice(-2) + ' (' + SEM[it.diaSemana] + ')'));
      row.appendChild(td(it.nome));
      row.appendChild(td(brl.format(it.valor)));
      var obs = '';
      if (it.ajustado) obs = 'Mês sem esse dia: vence no último dia. ';
      if (it.motivo) obs += 'Cai em ' + it.motivo + ': em geral pode pagar sem multa no dia útil seguinte (' +
        ('0' + it.pagaDia).slice(-2) + '/' + ('0' + it.pagaMes).slice(-2) + '), mas o débito automático costuma sair antes.';
      if (sal && it.dia < sal) obs += (obs ? ' ' : '') + 'Antes do salário.';
      row.appendChild(td(obs, 'miudo'));
      l.appendChild(row);
    }
  }

  // inicializacao
  var hoje = new Date(), prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  var selMes = $('cc-mes');
  for (var m = 1; m <= 12; m++) { var o = document.createElement('option'); o.value = m; o.textContent = MESES[m - 1]; selMes.appendChild(o); }
  selMes.value = prox.getMonth() + 1; $('cc-ano').value = prox.getFullYear();
  var salvo = null; try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) {}
  if (salvo && salvo.contas && salvo.contas.length) {
    for (var i = 0; i < salvo.contas.length; i++) linha(salvo.contas[i].nome, salvo.contas[i].valor, salvo.contas[i].dia);
    $('cc-salario').value = salvo.salario || '';
  } else {
    linha('Aluguel', '', 5); linha('Luz', '', 12); linha('Água', '', 15); linha('Internet', '', 20); linha('Cartão de crédito', '', 8);
    $('cc-salario').value = 5;
  }
  $('cc-ferramenta').addEventListener('input', atualizar);
  $('cc-mes').addEventListener('change', atualizar);
  $('cc-add').onclick = function () { linha('', '', ''); };
  $('cc-exemplo').onclick = function () {
    $('cc-linhas').innerHTML = '';
    for (var i = 0; i < EXEMPLO.length; i++) linha(EXEMPLO[i][0], EXEMPLO[i][1], EXEMPLO[i][2]);
    $('cc-mes').value = 1; $('cc-ano').value = 2027; $('cc-salario').value = 7; atualizar();
  };
  $('cc-limpar').onclick = function () { $('cc-linhas').innerHTML = ''; try { localStorage.removeItem(CHAVE); } catch (e) {} linha('', '', ''); atualizar(); };
  $('cc-imprimir').onclick = function () { window.print(); };
  atualizar();
})();
