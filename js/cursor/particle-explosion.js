!function(e, t, a) {
    function n() {
      c(`
        .particle {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 99999;
        }
      `), o(), r()
    }
  
    function r() {
      for (var e = d.length - 1; e >= 0; e--) {
        if (d[e].alpha <= 0) {
          t.body.removeChild(d[e].el);
          d.splice(e, 1);
        } else {
          // 物理模拟：重力+随机运动
          d[e].y += d[e].gravity;
          d[e].x += d[e].vx * 0.98;
          d[e].y += d[e].vy * 0.98;
          d[e].alpha -= 0.008;
          
          d[e].el.style.cssText = `
            left: ${d[e].x}px;
            top: ${d[e].y}px;
            width: ${d[e].size}px;
            height: ${d[e].size}px;
            opacity: ${d[e].alpha};
            background: ${d[e].color};
            box-shadow: 0 0 ${d[e].size/2}px ${d[e].color};
          `;
        }
      }
      requestAnimationFrame(r)
    }
  
    function o() {
      var t = "function" == typeof e.onclick && e.onclick;
      e.onclick = function(e) {
        t && t(), i(e)
      }
    }
  
    function i(e) {
      for (var a = 0; a < 25; a++) { // 每次点击生成50个粒子
        var p = t.createElement("div");
        p.className = "particle";
        
        // 粒子属性配置
        var particle = {
          el: p,
          x: e.clientX,
          y: e.clientY,
          size: Math.random() * 8 + 2,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          gravity: 0.1,
          alpha: 1,
          color: `hsl(${Math.random() * 360}, 100%, 70%)`
        };
        
        d.push(particle);
        t.body.appendChild(p);
      }
    }
  
    function c(e) {
      var a = t.createElement("style");
      a.type = "text/css";
      try {
        a.appendChild(t.createTextNode(e))
      } catch (t) {
        a.styleSheet.cssText = e
      }
      t.getElementsByTagName("head")[0].appendChild(a)
    }
  
    var d = [];
    e.requestAnimationFrame = function() {
      return e.requestAnimationFrame ||
             e.webkitRequestAnimationFrame ||
             e.mozRequestAnimationFrame ||
             e.oRequestAnimationFrame ||
             e.msRequestAnimationFrame ||
             function(e) {
               setTimeout(e, 1000 / 60)
             }()
    }(), n()
  }(window, document);
  if (d.length > 50) d = d.slice(-300);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
color: isDark ? `hsl(${Math.random()*60 + 200}, 80%, 60%)` 
              : `hsl(${Math.random()*60 + 10}, 100%, 70%)`