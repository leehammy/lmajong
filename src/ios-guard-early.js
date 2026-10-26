/*
 * Classic script (not a module). Include synchronously inside <head> to make
 * the iOS 27 fixed-edge guard available as early as possible. No dependencies.
 * Can coexist with installIOSTopGuard(), which updates the same element.
 * Override document.documentElement.style.setProperty('--ga-ios-guard-color',...)
 * for CSS, or set window.GAME_EDGE_COLOR before this script.
 */
(function(){
  var n=navigator,ua=n.userAgent||'';
  var coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
  var ios=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&n.maxTouchPoints>1&&coarse);
  var stand=!!n.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);
  if(!ios||!stand||document.getElementById('ga-ios-top-guard'))return;
  var e=document.createElement('div');
  e.id='ga-ios-top-guard'; e.setAttribute('aria-hidden','true');
  e.style.cssText='position:fixed;top:0;left:0;right:0;height:12px;pointer-events:none;z-index:2147483000;background-clip:text;-webkit-background-clip:text;user-select:none;';
  e.style.backgroundColor=window.GAME_EDGE_COLOR||'#233f36';
  document.documentElement.appendChild(e);
  // Move under body when parsed, without re-creating the fixed layer.
  document.addEventListener('DOMContentLoaded', function(){ if(document.body&&e.isConnected)document.body.appendChild(e); }, {once:true});
})();
