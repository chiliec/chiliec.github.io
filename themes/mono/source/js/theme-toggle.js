(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;

  function current() {
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    btn.setAttribute('aria-pressed', mode === 'dark');
  }

  apply(current());

  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    apply(next);
  });
})();
