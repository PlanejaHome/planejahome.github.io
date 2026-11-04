/* Motor das calculadoras. As expressoes usam o mesmo subconjunto que build.py confere em Python. */
(function () {
  var C = window.CALC; if (!C) return;
  var H = {
    se: function (c, a, b) { return c ? a : b; },
    pow: Math.pow,
    ln: function (x) { return x > 0 ? Math.log(x) : NaN; },
    ceil: function (x) { return isFinite(x) ? Math.ceil(x - 1e-9) : x; },
    floor: function (x) { return isFinite(x) ? Math.floor(x + 1e-9) : x; },
    max: Math.max, min: Math.min, abs: Math.abs, NaN: NaN
  };
  var hn = Object.keys(H), hv = hn.map(function (k) { return H[k]; });
  var nomes = hn.concat(C.entradas);
  var fns = C.saidas.map(function (s) {
    var f = new Function(nomes.join(','), 'return (' + s.expr + ');');
    nomes = nomes.concat([s.id]);
    return f;
  });
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function num(v, d) { return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fmt(s, v) {
    if (typeof v !== 'number' || !isFinite(v)) return s.invalido || '—';
    var suf = s.sufixo ? ' ' + s.sufixo : '';
    switch (s.fmt) {
      case 'brl': return brl.format(v);
      case 'pct': return num(v, s.casas == null ? 1 : s.casas) + '%';
      case 'int': return num(Math.round(v), 0) + suf;
      default: return num(v, s.casas == null ? 2 : s.casas) + suf;
    }
  }
  function calcular() {
    var args = hv.slice();
    C.entradas.forEach(function (id) {
      var v = parseFloat(String(document.getElementById('in-' + id).value).replace(',', '.'));
      args.push(isNaN(v) ? 0 : v);
    });
    C.saidas.forEach(function (s, i) {
      var v; try { v = fns[i].apply(null, args); } catch (e) { v = NaN; }
      v = Number(v); args.push(v);
      var el = document.getElementById('out-' + s.id);
      if (el) el.textContent = fmt(s, v);
    });
  }
  document.getElementById('calc-form').addEventListener('input', calcular);
  document.getElementById('btn-exemplo').addEventListener('click', function () {
    Object.keys(C.exemplo).forEach(function (k) { document.getElementById('in-' + k).value = C.exemplo[k]; });
    calcular();
  });
  document.getElementById('btn-imprimir').addEventListener('click', function () { window.print(); });
  calcular();
})();
