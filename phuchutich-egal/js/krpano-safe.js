/**
 * Gọi krpano an toàn khi embed chưa sẵn sàng (tránh egal.js lỗi .call trên null).
 */
(function () {
  const queue = [];

  function el() {
    return (
      document.getElementById('virtualmuseum') ||
      document.getElementById('krpanoSWFObject')
    );
  }

  function canCall(k) {
    return k && typeof k.call === 'function';
  }

  window.krpanoMy = function () {
    return el();
  };

  window.krpano = function () {
    return window.krpanoMy();
  };

  window.krpanoCall = function (cmd) {
    const k = el();
    if (canCall(k)) {
      try {
        k.call(cmd);
      } catch (_) {}
      return;
    }
    queue.push(cmd);
  };

  function flush() {
    const k = el();
    if (!canCall(k)) return;
    while (queue.length) {
      try {
        k.call(queue.shift());
      } catch (_) {}
    }
  }

  let n = 0;
  const timer = setInterval(() => {
    flush();
    if (++n > 240) clearInterval(timer);
  }, 100);

  window.addEventListener('load', flush);
})();
