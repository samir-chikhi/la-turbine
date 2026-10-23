// Menu mobile du mini-site La Turbine.
(function () {
  var b = document.querySelector('.t-burger');
  var n = document.getElementById('t-nav');
  if (!b || !n) return;
  b.addEventListener('click', function () {
    var open = n.classList.toggle('is-open');
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && n.classList.contains('is-open')) { n.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); b.focus(); }
  });
})();
