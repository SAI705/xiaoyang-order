/* 小羊吃遍全宇宙 · 点餐网页版（纯静态，无构建、无后端） */
(function () {
  'use strict';

  const DATA = window.MENU_DATA;
  const KEY_MENU = 'xyms.menu.v1';
  const KEY_SHOP = 'xyms.shop.v1';
  const KEY_ORDERS = 'xyms.orders.v1';
  const KEY_SPECS = 'xyms.specs.v1';
  const KEY_CART = 'xyms.cart.v1';

  /* ---------- 本地存储（file:// 下若不可用则退回内存） ---------- */
  const memory = {};
  const store = {
    get(k) {
      try {
        const v = localStorage.getItem(k);
        if (v !== null) return v;
      } catch (e) { /* ignore */ }
      return k in memory ? memory[k] : null;
    },
    set(k, v) {
      memory[k] = v;
      try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
    },
    del(k) {
      delete memory[k];
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- 状态 ---------- */
  const state = {
    categories: DATA.categories.slice(),
    specGroups: [],
    toppings: [],
    items: [],
    shop: null,
    orders: [],
    cart: [],
    editMode: false,
    activeCat: '',
    sectionTops: [],
    sku: null,
    form: null,
    order: { mode: 'self', tableNo: '', remark: '', lines: [] },
    result: null
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const el = {
    screenMenu: $('#screenMenu'),
    screenOrder: $('#screenOrder'),
    screenDone: $('#screenDone'),
    screenOrders: $('#screenOrders'),
    ordersBtn: $('#ordersBtn'),
    ordersBack: $('#ordersBack'),
    ordersClear: $('#ordersClear'),
    ordersSearch: $('#ordersSearch'),
    ordersStat: $('#ordersStat'),
    ordersList: $('#ordersList'),
    odSheet: $('#odSheet'),
    odTitle: $('#odTitle'),
    odBody: $('#odBody'),
    odClose: $('#odClose'),
    doneOrders: $('#doneOrders'),
    shopLogo: $('#shopLogo'),
    shopLogoImg: $('#shopLogoImg'),
    shopLogoText: $('#shopLogoText'),
    shopLogoEdit: $('#shopLogoEdit'),
    shopFileInput: $('#shopFileInput'),
    orderLogoImg: $('#orderLogoImg'),
    orderLogoText: $('#orderLogoText'),
    orderName: $('#orderName'),
    orderMeta: $('#orderMeta'),
    shopName: $('#shopName'),
    shopMeta: $('#shopMeta'),
    editToggle: $('#editToggle'),
    cats: $('#cats'),
    list: $('#list'),
    cartLeft: $('#cartLeft'),
    cartIcon: $('#cartIcon'),
    cartBadge: $('#cartBadge'),
    cartTotal: $('#cartTotal'),
    cartEmpty: $('#cartEmpty'),
    cartInfo: $('#cartInfo'),
    payBtn: $('#payBtn'),
    editBar: $('#editBar'),
    addDishBtn: $('#addDishBtn'),
    resetBtn: $('#resetBtn'),
    specBtn: $('#specBtn'),
    specSheet: $('#specSheet'),
    specBody: $('#specBody'),
    specClose: $('#specClose'),
    specCancel: $('#specCancel'),
    specSave: $('#specSave'),
    syncBtn: $('#syncBtn'),
    syncSheet: $('#syncSheet'),
    syncClose: $('#syncClose'),
    syncInput: $('#syncInput'),
    syncSize: $('#syncSize'),
    syncCopy: $('#syncCopy'),
    syncDownload: $('#syncDownload'),
    syncPick: $('#syncPick'),
    syncApply: $('#syncApply'),
    syncFile: $('#syncFile'),
    appRoot: $('#app'),
    mask: $('#mask'),
    cartSheet: $('#cartSheet'),
    cartLines: $('#cartLines'),
    cartCount: $('#cartCount'),
    skuSheet: $('#skuSheet'),
    skuPicBox: $('#skuPicBox'),
    skuName: $('#skuName'),
    skuDesc: $('#skuDesc'),
    skuSales: $('#skuSales'),
    skuGroups: $('#skuGroups'),
    skuToppings: $('#skuToppings'),
    skuPrice: $('#skuPrice'),
    skuQty: $('#skuQty'),
    skuMinus: $('#skuMinus'),
    skuPlus: $('#skuPlus'),
    skuAdd: $('#skuAdd'),
    skuClose: $('#skuClose'),
    formSheet: $('#formSheet'),
    formTitle: $('#formTitle'),
    formName: $('#formName'),
    formPrice: $('#formPrice'),
    formDesc: $('#formDesc'),
    formCats: $('#formCats'),
    formSpecs: $('#formSpecs'),
    formImgBox: $('#formImgBox'),
    formImgPreview: $('#formImgPreview'),
    formImg: $('#formImg'),
    formImgDel: $('#formImgDel'),
    fileInput: $('#fileInput'),
    formCancel: $('#formCancel'),
    formSave: $('#formSave'),
    orderBody: $('#orderBody'),
    orderLines: $('#orderLines'),
    orderSubtotal: $('#orderSubtotal'),
    orderTotal: $('#orderTotal'),
    orderCount: $('#orderCount'),
    orderBarTotal: $('#orderBarTotal'),
    orderBarCount: $('#orderBarCount'),
    submitBtn: $('#submitBtn'),
    modeSelf: $('#modeSelf'),
    modeDine: $('#modeDine'),
    tableRow: $('#tableRow'),
    tableNo: $('#tableNo'),
    remark: $('#remark'),
    pickNo: $('#pickNo'),
    orderNo: $('#orderNo'),
    orderTime: $('#orderTime'),
    doneCount: $('#doneCount'),
    doneTotal: $('#doneTotal'),
    doneAgain: $('#doneAgain'),
    toast: $('#toast')
  };

  /* ---------- 工具 ---------- */
  function money(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function money2(n) {
    return n.toFixed(2);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, 1800);
  }

  function loadMenu() {
    const raw = store.get(KEY_MENU);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      } catch (e) { /* 坏数据用默认 */ }
    }
    return JSON.parse(JSON.stringify(DATA.items));
  }

  function saveMenu() {
    const ok = store.set(KEY_MENU, JSON.stringify(state.items));
    if (!ok) toast('本地空间不足，图片可能太大');
    return ok;
  }

  /* ---------- 店铺信息（店名/营业时间/店铺图） ---------- */
  function loadShop() {
    const base = JSON.parse(JSON.stringify(DATA.shop));
    const raw = store.get(KEY_SHOP);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          ['logo', 'name', 'hours'].forEach(function (k) {
            if (saved[k] !== undefined) base[k] = saved[k];
          });
        }
      } catch (e) { /* 坏数据用默认 */ }
    }
    return base;
  }

  function saveShop() {
    const ok = store.set(KEY_SHOP, JSON.stringify(state.shop));
    if (!ok) toast('本地空间不足，图片可能太大');
    return ok;
  }

  function renderShop() {
    const shop = state.shop || DATA.shop;
    const initial = (shop.name || '羊').charAt(0);

    el.shopName.textContent = shop.name;
    el.shopMeta.textContent = shop.hours;

    if (shop.logo) {
      el.shopLogoImg.src = shop.logo;
      el.shopLogoImg.hidden = false;
      el.shopLogoText.hidden = true;
    } else {
      el.shopLogoImg.hidden = true;
      el.shopLogoImg.removeAttribute('src');
      el.shopLogoText.hidden = false;
      el.shopLogoText.textContent = initial;
    }
    el.shopLogoEdit.hidden = !state.editMode;

    if (el.orderLogoImg) {
      if (shop.logo) {
        el.orderLogoImg.src = shop.logo;
        el.orderLogoImg.hidden = false;
        el.orderLogoText.hidden = true;
      } else {
        el.orderLogoImg.hidden = true;
        el.orderLogoText.hidden = false;
        el.orderLogoText.textContent = initial;
      }
      el.orderName.textContent = shop.name;
      el.orderMeta.textContent = shop.hours;
    }
  }

  function pickShopImage() {
    if (!state.editMode) {
      toast('先点右上角「编辑」，再换店铺图');
      return;
    }
    el.shopFileInput.click();
  }


  function loadCart() {
    const raw = store.get(KEY_CART);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      } catch (e) { /* ignore */ }
    }
    return [];
  }

  function saveCart() {
    store.set(KEY_CART, JSON.stringify(state.cart));
  }

  function itemsOf(catId) {
    return state.items.filter(function (it) { return it.catId === catId; });
  }

  function findItem(id) {
    return state.items.filter(function (it) { return it.id === id; })[0];
  }

  /* ---------- 购物车 ---------- */
  function buildKey(itemId, picks, toppingIds) {
    const t = (toppingIds || []).slice().sort().join(',');
    const p = (state.specGroups || []).map(function (g) {
      return (picks && picks[g.key]) || '-';
    }).join(',');
    return [itemId, p, t].join('|');
  }

  function addLine(line) {
    const hit = state.cart.filter(function (l) { return l.key === line.key; })[0];
    if (hit) hit.qty += line.qty;
    else state.cart.push(line);
    saveCart();
    renderCartBar();
    if (!el.cartSheet.hidden) renderCartSheet();
  }

  function changeQty(key, delta) {
    state.cart = state.cart
      .map(function (l) { return Object.assign({}, l); })
      .map(function (l) { if (l.key === key) l.qty += delta; return l; })
      .filter(function (l) { return l.qty > 0; });
    saveCart();
    renderCartBar();
    renderCartSheet();
    if (!state.cart.length) closeSheet(el.cartSheet);
  }

  function totals() {
    let count = 0;
    let total = 0;
    state.cart.forEach(function (l) { count += l.qty; total += l.unitPrice * l.qty; });
    return { count: count, total: total };
  }

  /* ---------- 渲染：分类 ---------- */
  function renderCats() {
    const cats = state.categories.map(function (c) {
      const on = c.id === state.activeCat ? ' on' : '';
      return '<div class="cat' + on + '" data-cat="' + c.id + '">' + esc(c.name) + '</div>';
    }).join('');
    el.cats.innerHTML = cats;
  }

  /* ---------- 渲染：菜品列表 ---------- */
  function picHtml(item, cls) {
    if (item.image) {
      return '<img class="' + cls + '" src="' + esc(item.image) + '" alt="">';
    }
    return '<div class="' + cls.replace('img', 'pic') + '" style="background:' + esc(item.bg) + '">' + esc(item.initial) + '</div>';
  }

  function renderList() {
    const sections = state.categories
      .map(function (cat) {
        return { cat: cat, items: itemsOf(cat.id) };
      })
      .filter(function (s) { return s.items.length; });

    if (!sections.length) {
      el.list.innerHTML =
        '<div class="empty">' +
        '<div class="empty-title">菜单空了</div>' +
        '<div class="empty-sub">点右上角「编辑」新增菜品，或恢复默认菜单</div>' +
        '<button class="empty-btn" data-act="reset">恢复默认菜单</button>' +
        '</div>';
      state.sectionTops = [];
      return;
    }

    const html = sections.map(function (s) {
      const dishes = s.items.map(function (d) {
        const tag = d.custom ? '<span class="tag-custom">自定义</span>' : '';
        const from = d.specs ? '<span class="price-from"> 起</span>' : '';
        const actions = state.editMode
          ? '<div class="dish-actions">' +
            '<button class="mini" data-act="edit" data-id="' + d.id + '">改</button>' +
            '<button class="mini mini-del" data-act="del" data-id="' + d.id + '">删</button>' +
            '</div>'
          : '<button class="add" data-act="add" data-id="' + d.id + '">+</button>';
        return (
          '<div class="dish">' +
          picHtml(d, 'dish-img') +
          '<div class="dish-main">' +
          '<div class="dish-name-row"><span class="dish-name">' + esc(d.name) + '</span>' + tag + '</div>' +
          (d.desc ? '<div class="dish-desc">' + esc(d.desc) + '</div>' : '') +
          '<div class="dish-sales">月售 ' + d.sales + '</div>' +
          '<div class="dish-row">' +
          '<div class="price"><span class="rmb">¥</span>' + money(d.price) + from + '</div>' +
          actions +
          '</div></div></div>'
        );
      }).join('');

      return (
        '<section class="sec" data-cat="' + s.cat.id + '">' +
        '<div class="sec-title">' + esc(s.cat.name) + '</div>' + dishes +
        '</section>'
      );
    }).join('');

    el.list.innerHTML = html + '<div class="list-pad"></div>';
    measureSections();
  }

  function measureSections() {
    const listTop = el.list.getBoundingClientRect().top - el.list.scrollTop;
    state.sectionTops = Array.prototype.map.call(el.list.querySelectorAll('.sec'), function (sec) {
      return { id: sec.dataset.cat, top: sec.getBoundingClientRect().top - listTop };
    });
  }

  /* ---------- 渲染：结算条 ---------- */
  function renderCartBar() {
    const t = totals();
    el.cartBadge.textContent = t.count;
    el.cartBadge.hidden = t.count === 0;
    el.cartTotal.textContent = money2(t.total);
    el.cartInfo.hidden = t.count === 0;
    el.cartEmpty.hidden = t.count > 0;
    el.cartIcon.classList.toggle('on', t.count > 0);
    el.payBtn.classList.toggle('on', t.count > 0);
  }

  /* ---------- 渲染：已选清单 ---------- */
  function renderCartSheet() {
    const t = totals();
    el.cartCount.textContent = t.count;
    if (!state.cart.length) {
      el.cartLines.innerHTML = '<div class="empty" style="padding:34px 0"><div class="empty-sub">还没选菜品</div></div>';
      return;
    }
    el.cartLines.innerHTML = state.cart.map(function (l) {
      return (
        '<div class="panel-item">' +
        picHtml(l, 'pi-img') +
        '<div class="pi-main"><div class="pi-name">' + esc(l.name) + '</div>' +
        (l.specText ? '<div class="pi-spec">' + esc(l.specText) + '</div>' : '') +
        '</div>' +
        '<div class="pi-price"><span class="rmb">¥</span>' + money(l.unitPrice) + '</div>' +
        '<div class="stepper">' +
        '<button class="step" data-step="-1" data-key="' + esc(l.key) + '">−</button>' +
        '<span class="qty">' + l.qty + '</span>' +
        '<button class="step plus" data-step="1" data-key="' + esc(l.key) + '">+</button>' +
        '</div></div>'
      );
    }).join('');
  }

  /* ---------- 浮层开关 ---------- */
  function openSheet(sheet) {
    if (el.mask.hidden) {
      el.mask.hidden = false;
      requestAnimationFrame(function () { el.mask.classList.add('show'); });
    }
    sheet.hidden = false;
    requestAnimationFrame(function () { sheet.classList.add('show'); });
  }

  function closeSheet(sheet) {
    sheet.classList.remove('show');
    setTimeout(function () {
      sheet.hidden = true;
      const anyOpen = [el.cartSheet, el.skuSheet, el.formSheet].some(function (s) { return !s.hidden; });
      if (!anyOpen) {
        el.mask.classList.remove('show');
        setTimeout(function () { if (![el.cartSheet, el.skuSheet, el.formSheet].some(function (s) { return !s.hidden; })) el.mask.hidden = true; }, 200);
      }
    }, 230);
  }

  /* ---------- 规格弹层 ---------- */
  function openSku(item) {
    const picks = {};
    (state.specGroups || []).forEach(function (g) {
      if (g.options && g.options.length) picks[g.key] = g.options[0].id;
    });
    state.sku = {
      itemId: item.id,
      picks: picks,
      toppingIds: [],
      qty: 1
    };
    renderSku();
    openSheet(el.skuSheet);
  }

  function skuUnitPrice() {
    const sku = state.sku;
    const item = findItem(sku.itemId);
    if (!item) return 0;
    let total = item.price;
    state.specGroups.forEach(function (g) {
      g.options.forEach(function (o) {
        if (o.id === sku.picks[g.key]) total += o.delta || 0;
      });
    });
    state.toppings.forEach(function (t) {
      if (sku.toppingIds.indexOf(t.id) >= 0) total += t.price;
    });
    return total;
  }

  function renderSku() {
    const sku = state.sku;
    const item = findItem(sku.itemId);
    if (!item) return;

    el.skuPicBox.innerHTML = picHtml(item, 'sku-img');

    el.skuName.textContent = item.name;
    el.skuDesc.textContent = item.desc;
    el.skuSales.textContent = '月售 ' + item.sales;

    el.skuGroups.innerHTML = state.specGroups.map(function (g) {
      const opts = g.options.map(function (o) {
        const on = sku.picks[g.key] === o.id ? ' on' : '';
        const delta = o.delta > 0 ? '<span class="opt-delta">+' + o.delta + '</span>' : '';
        return '<button class="opt' + on + '" data-g="' + g.key + '" data-o="' + o.id + '">' + esc(o.name) + delta + '</button>';
      }).join('');
      return '<div class="grp"><div class="grp-title">' + esc(g.name) + '</div><div class="opts">' + opts + '</div></div>';
    }).join('');

    el.skuToppings.innerHTML = state.toppings.map(function (t) {
      const on = sku.toppingIds.indexOf(t.id) >= 0 ? ' on' : '';
      return '<button class="opt' + on + '" data-t="' + t.id + '">' + esc(t.name) + '<span class="opt-delta">+' + t.price + '</span></button>';
    }).join('');

    el.skuQty.textContent = sku.qty;
    el.skuPrice.innerHTML = '<span class="rmb">¥</span>' + money(skuUnitPrice() * sku.qty);
  }

  function confirmSku() {
    const sku = state.sku;
    const item = findItem(sku.itemId);
    if (!item) return;
    const labels = [];
    state.specGroups.forEach(function (g) {
      g.options.forEach(function (o) {
        if (o.id === sku.picks[g.key]) labels.push(o.name);
      });
    });
    state.toppings.forEach(function (t) {
      if (sku.toppingIds.indexOf(t.id) >= 0) labels.push(t.name);
    });

    addLine({
      key: buildKey(item.id, sku.picks, sku.toppingIds),
      itemId: item.id,
      name: item.name,
      initial: item.initial,
      bg: item.bg,
      image: item.image || '',
      specText: labels.join(' / '),
      unitPrice: skuUnitPrice(),
      qty: sku.qty
    });
    closeSheet(el.skuSheet);
    toast('已加入购物车');
  }

  /* ---------- 表单（新增 / 编辑） ---------- */
  function openForm(id) {
    if (id) {
      const item = findItem(id);
      if (!item) return;
      state.form = {
        id: item.id,
        name: item.name,
        price: String(item.price),
        desc: item.desc === '店家新品' ? '' : item.desc,
        catId: item.catId,
        specs: !!item.specs,
        image: item.image || ''
      };
      el.formTitle.textContent = '编辑菜品';
    } else {
      state.form = {
        id: '',
        name: '',
        price: '',
        desc: '',
        catId: state.activeCat || state.categories[0].id,
        specs: true,
        image: ''
      };
      el.formTitle.textContent = '新增菜品';
    }
    el.formName.value = state.form.name;
    el.formPrice.value = state.form.price;
    el.formDesc.value = state.form.desc;
    renderFormCats();
    renderFormSpecs();
    renderFormImage();
    openSheet(el.formSheet);
    setTimeout(function () { el.formName.focus(); }, 260);
  }

  function renderFormCats() {
    el.formCats.innerHTML = state.categories.map(function (c) {
      const on = state.form.catId === c.id ? ' on' : '';
      return '<button class="chip' + on + '" data-cat="' + c.id + '">' + esc(c.name) + '</button>';
    }).join('');
  }

  function renderFormSpecs() {
    el.formSpecs.innerHTML =
      '<button class="chip' + (state.form.specs ? ' on' : '') + '" data-specs="1">需要选规格</button>' +
      '<button class="chip' + (!state.form.specs ? ' on' : '') + '" data-specs="0">直接加购</button>';
  }

  function renderFormImage() {
    const has = !!state.form.image;
    el.formImgBox.hidden = has;
    el.formImgPreview.hidden = !has;
    if (has) el.formImg.src = state.form.image;
  }

  /* 选择图片 → 压缩 → dataURL */
  function compressImage(file, cb) {
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        const max = 720;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let out = '';
        try { out = canvas.toDataURL('image/jpeg', 0.82); } catch (e) { out = reader.result; }
        cb(out);
      };
      img.onerror = function () { cb(reader.result); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(''); };
    reader.readAsDataURL(file);
  }

  function saveForm() {
    const f = state.form;
    const name = (el.formName.value || '').trim();
    const price = Number(el.formPrice.value);

    if (!name) { toast('请填写菜品名称'); el.formName.focus(); return; }
    if (!(price > 0)) { toast('请填写大于 0 的价格'); el.formPrice.focus(); return; }
    if (!f.catId) { toast('请选择分类'); return; }

    if (f.id) {
      state.items = state.items.map(function (it) {
        if (it.id !== f.id) return it;
        return Object.assign({}, it, {
          name: name,
          price: price,
          desc: (el.formDesc.value || '').trim() || it.desc || '店家新品',
          catId: f.catId,
          specs: f.specs,
          image: f.image,
          initial: name.charAt(0)
        });
      });
    } else {
      const pal = ['linear-gradient(135deg,#A9603A,#D9A06B)', 'linear-gradient(135deg,#8E3A2E,#C9775F)',
        'linear-gradient(135deg,#4F7A48,#9CBE83)', 'linear-gradient(135deg,#C08A3E,#E5C079)',
        'linear-gradient(135deg,#4E7A82,#96BEC2)', 'linear-gradient(135deg,#7E4A2E,#B98A5E)'];
      state.items.push({
        id: 'custom_' + Date.now().toString(36),
        catId: f.catId,
        name: name,
        desc: (el.formDesc.value || '').trim() || '店家新品',
        price: price,
        sales: 0,
        initial: name.charAt(0),
        bg: pal[(Math.random() * pal.length) | 0],
        image: f.image,
        specs: f.specs,
        custom: true
      });
    }

    saveMenu();
    closeSheet(el.formSheet);
    state.activeCat = f.catId;
    renderCats();
    renderList();
    toast(f.id ? '已保存' : '已新增菜品');
  }

  function removeItem(id) {
    const item = findItem(id);
    if (!item) return;
    if (!confirm('删除「' + item.name + '」？已加入购物车的同款也会被移除。')) return;

    state.items = state.items.filter(function (it) { return it.id !== id; });
    saveMenu();

    const before = state.cart.length;
    state.cart = state.cart.filter(function (l) { return l.itemId !== id; });
    if (state.cart.length !== before) {
      saveCart();
      renderCartBar();
      if (!el.cartSheet.hidden) renderCartSheet();
    }

    renderList();
    toast('已删除');
  }

  function resetMenu() {
    if (!confirm('恢复默认？你新增/修改/删除的菜品、以及店铺图片都会被还原。')) return;
    state.items = JSON.parse(JSON.stringify(DATA.items));
    store.del(KEY_MENU);
    store.del(KEY_SHOP);
    store.del(KEY_SPECS);
    state.shop = loadShop();
    var specs = loadSpecs();
    state.specGroups = specs.specGroups;
    state.toppings = specs.toppings;
  state.orders = loadOrders();
    state.editMode = false;
    el.editBar.hidden = true;
    el.editToggle.classList.remove('on');
    el.editToggle.textContent = '编辑';
    el.appRoot.classList.remove('editing');
    state.activeCat = state.categories[0].id;
    renderShop();
    renderCats();
    renderList();
    toast('已恢复默认');
  }

  /* ---------- 规格与加料（可编辑） ---------- */
  let specDraft = null;
  let specSeq = 0;

  function uid(prefix) {
    specSeq += 1;
    return prefix + Date.now().toString(36) + specSeq;
  }

  function loadSpecs() {
    const base = {
      specGroups: JSON.parse(JSON.stringify(DATA.specGroups)),
      toppings: JSON.parse(JSON.stringify(DATA.toppings))
    };
    const raw = store.get(KEY_SPECS);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.specGroups) && Array.isArray(saved.toppings)) {
          return {
            specGroups: saved.specGroups,
            toppings: saved.toppings
          };
        }
      } catch (e) { /* 坏数据用默认 */ }
    }
    return base;
  }

  function saveSpecs() {
    const ok = store.set(KEY_SPECS, JSON.stringify({
      specGroups: state.specGroups,
      toppings: state.toppings
    }));
    if (!ok) toast('本地空间不足');
    return ok;
  }

  function openSpecEditor() {
    specDraft = {
      specGroups: JSON.parse(JSON.stringify(state.specGroups)),
      toppings: JSON.parse(JSON.stringify(state.toppings))
    };
    renderSpecSheet();
    openSheet(el.specSheet);
  }

  function renderSpecSheet() {
    const d = specDraft;
    if (!d) return;

    const groups = d.specGroups.map(function (g, gi) {
      const opts = (g.options || []).map(function (o, oi) {
        return '<div class="sg-opt" data-oi="' + oi + '">' +
          '<input class="sg-in name" value="' + esc(o.name) + '" maxlength="8" placeholder="选项名">' +
          '<span class="sg-unit">+<input class="sg-in delta" type="number" min="0" step="1" value="' + (Number(o.delta) || 0) + '">元</span>' +
          '<button class="mini mini-del" data-delopt="' + gi + '-' + oi + '">×</button>' +
          '</div>';
      }).join('');

      return '<div class="sg" data-gi="' + gi + '">' +
        '<div class="sg-head">' +
        '<input class="sg-in gname" value="' + esc(g.name) + '" maxlength="8" placeholder="规格组名">' +
        '<button class="mini mini-del" data-delgroup="' + gi + '">删组</button>' +
        '</div>' +
        '<div class="sg-opts">' + opts +
        '<button class="mini" data-addopt="' + gi + '">＋ 选项</button>' +
        '</div></div>';
    }).join('');

    const tops = d.toppings.map(function (t, ti) {
      return '<div class="sg-opt" data-ti="' + ti + '">' +
        '<input class="sg-in name" value="' + esc(t.name) + '" maxlength="8" placeholder="加料名">' +
        '<span class="sg-unit">+<input class="sg-in delta" type="number" min="0" step="1" value="' + (Number(t.price) || 0) + '">元</span>' +
        '<button class="mini mini-del" data-deltop="' + ti + '">×</button>' +
        '</div>';
    }).join('');

    el.specBody.innerHTML =
      '<div class="spec-hint">这些规格会出现在菜品「＋」弹窗里；加价按每个选项单独设置。改完点保存。</div>' +
      groups +
      '<button class="add-row" data-addgroup="1">＋ 添加规格组</button>' +
      '<div class="spec-sep"></div>' +
      '<div class="sg"><div class="sg-head"><span class="sg-label">加料</span></div>' +
      '<div class="sg-opts">' + tops +
      '<button class="mini" data-addtop="1">＋ 加料</button></div></div>' +
      '<div class="sheet-pad"></div>';
  }

  function syncSpecDraft() {
    const d = specDraft;
    if (!d) return;
    Array.prototype.forEach.call(el.specBody.querySelectorAll('.sg[data-gi]'), function (node) {
      const gi = Number(node.dataset.gi);
      const g = d.specGroups[gi];
      if (!g) return;
      const nameInput = node.querySelector('.gname');
      if (nameInput) g.name = nameInput.value;
      Array.prototype.forEach.call(node.querySelectorAll('.sg-opt[data-oi]'), function (row) {
        const oi = Number(row.dataset.oi);
        const o = g.options[oi];
        if (!o) return;
        o.name = row.querySelector('.name').value;
        o.delta = Number(row.querySelector('.delta').value) || 0;
      });
    });
    Array.prototype.forEach.call(el.specBody.querySelectorAll('.sg-opt[data-ti]'), function (row) {
      const ti = Number(row.dataset.ti);
      const t = d.toppings[ti];
      if (!t) return;
      t.name = row.querySelector('.name').value;
      t.price = Number(row.querySelector('.delta').value) || 0;
    });
  }

  function commitSpecs() {
    const d = specDraft;
    const groups = d.specGroups
      .map(function (g) {
        return {
          key: g.key || uid('g'),
          name: (g.name || '').trim() || '未命名',
          options: (g.options || [])
            .map(function (o) {
              return { id: o.id || uid('o'), name: (o.name || '').trim(), delta: Number(o.delta) || 0 };
            })
            .filter(function (o) { return o.name; })
        };
      })
      .filter(function (g) { return g.options.length > 0; });

    if (!groups.length) {
      toast('至少保留一个有选项的规格组');
      return;
    }

    const tops = d.toppings
      .map(function (t) {
        return { id: t.id || uid('t'), name: (t.name || '').trim(), price: Number(t.price) || 0 };
      })
      .filter(function (t) { return t.name; });

    state.specGroups = groups;
    state.toppings = tops;
    saveSpecs();
    closeSheet(el.specSheet);
    toast('规格已保存');
  }

  /* ---------- 数据同步（导出 / 导入） ---------- */
  function syncPayload() {
    return {
      v: 1,
      app: '小羊吃遍全宇宙',
      exportedAt: new Date().toISOString(),
      shop: state.shop,
      items: state.items,
      specGroups: state.specGroups,
      toppings: state.toppings
    };
  }

  function syncText() {
    return JSON.stringify(syncPayload(), null, 2);
  }

  function openSync() {
    const text = syncText();
    el.syncInput.value = text;
    el.syncSize.textContent =
      '当前：' + state.items.length + ' 道菜 · ' + state.specGroups.length + ' 个规格组 · ' +
      state.toppings.length + ' 种加料 · 约 ' + Math.round(text.length / 1024) + ' KB';
    openSheet(el.syncSheet);
  }

  function copySync() {
    const ta = el.syncInput;
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(function () {
        toast('已复制到剪贴板');
      }).catch(function () {
        toast('复制失败，请手动长按选择');
      });
      return;
    }
    toast(ok ? '已复制到剪贴板' : '复制失败，请手动长按选择');
  }

  function downloadSync() {
    const blob = new Blob([syncText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const pad = function (n) { return n < 10 ? '0' + n : String(n); };
    a.href = url;
    a.download = '小羊菜单-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('已导出文件');
  }

  function applySync(text) {
    let p = null;
    try {
      p = JSON.parse(text);
    } catch (e) {
      toast('JSON 格式错误');
      return false;
    }
    if (!p || !Array.isArray(p.items) || !Array.isArray(p.specGroups) || !Array.isArray(p.toppings)) {
      toast('数据不完整：需要 items / specGroups / toppings');
      return false;
    }

    state.items = p.items.map(function (it) { return Object.assign({}, it); });
    saveMenu();
    state.specGroups = p.specGroups.map(function (g) { return Object.assign({}, g); });
    state.toppings = p.toppings.map(function (t) { return Object.assign({}, t); });
    saveSpecs();
    if (p.shop) {
      state.shop = Object.assign(loadShop(), p.shop);
      saveShop();
    }
    // 规格可能变了，清掉购物车避免脏数据
    state.cart = [];
    saveCart();
    state.activeCat = state.categories[0].id;

    renderShop();
    renderCats();
    renderList();
    renderCartBar();
    toast('已导入：' + state.items.length + ' 道菜');
    return true;
  }

  /* ---------- 订单页 ---------- */
  function renderOrder() {
    const t = totals();
    state.order.lines = state.cart.map(function (l) { return Object.assign({}, l); });

    if (!state.order.lines.length) {
      el.orderLines.innerHTML = '<div style="font-size:12px;color:#B0B6B2;padding:6px 0">还没有选择菜品</div>';
    } else {
      el.orderLines.innerHTML = state.order.lines.map(function (l) {
        return (
          '<div class="line">' +
          picHtml(l, 'line-img') +
          '<div class="line-main"><div class="line-name">' + esc(l.name) + '</div>' +
          (l.specText ? '<div class="line-spec">' + esc(l.specText) + '</div>' : '') +
          '</div>' +
          '<div class="line-qty">×' + l.qty + '</div>' +
          '<div class="line-price"><span class="rmb">¥</span>' + money2(l.unitPrice * l.qty) + '</div>' +
          '</div>'
        );
      }).join('');
    }

    el.orderSubtotal.textContent = '¥' + money2(t.total);
    el.orderTotal.textContent = '¥' + money2(t.total);
    el.orderBarTotal.textContent = money2(t.total);
    el.orderBarCount.textContent = '共 ' + t.count + ' 件';
    el.submitBtn.classList.toggle('off', t.count === 0);
    el.tableRow.hidden = state.order.mode !== 'dine';
    el.tableNo.value = state.order.tableNo;
    el.remark.value = state.order.remark;
    el.modeSelf.classList.toggle('on', state.order.mode === 'self');
    el.modeDine.classList.toggle('on', state.order.mode === 'dine');
  }

  function submitOrder() {
    const t = totals();
    if (!t.count) { toast('购物车是空的'); return; }
    if (state.order.mode === 'dine' && !el.tableNo.value.trim()) {
      toast('请填写桌号');
      el.tableNo.focus();
      return;
    }

    const now = new Date();
    const pad = function (n) { return n < 10 ? '0' + n : String(n); };
    state.result = {
      orderNo: 'XY' + String(now.getTime()).slice(-10),
      pickNo: String(Math.floor(Math.random() * 900) + 100),
      time: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
        ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()),
      ts: now.getTime(),
      count: t.count,
      total: t.total,
      mode: state.order.mode,
      tableNo: el.tableNo.value.trim()
    };

    // 写入历史订单（最新的在最前，最多留 100 单）
    const snapshot = state.cart.map(function (l) {
      return {
        name: l.name,
        specText: l.specText,
        qty: l.qty,
        unitPrice: l.unitPrice,
        image: l.image || ''
      };
    });
    state.orders.unshift({
      orderNo: state.result.orderNo,
      pickNo: state.result.pickNo,
      time: state.result.time,
      ts: state.result.ts,
      count: state.result.count,
      total: state.result.total,
      mode: state.result.mode,
      tableNo: state.result.tableNo,
      remark: (el.remark.value || '').trim(),
      items: snapshot
    });
    if (state.orders.length > 100) state.orders.length = 100;
    saveOrders();

    state.cart = [];
    saveCart();
    renderCartBar();

    el.pickNo.textContent = state.result.pickNo;
    el.orderNo.textContent = state.result.orderNo;
    el.orderTime.textContent = state.result.time;
    el.doneCount.textContent = '共 ' + state.result.count + ' 件';
    el.doneTotal.textContent = '¥' + money2(state.result.total);

    el.screenOrder.hidden = true;
    el.screenDone.hidden = false;
    toast('下单成功');
  }

  function screens(name) {
    el.screenMenu.hidden = name !== 'menu';
    el.screenOrder.hidden = name !== 'order';
    el.screenDone.hidden = name !== 'done';
    el.screenOrders.hidden = name !== 'orders';
    if (name === 'order') renderOrder();
    if (name === 'orders') renderOrders(el.ordersSearch ? el.ordersSearch.value : '');
  }

  /* ---------- 历史订单 ---------- */
  function loadOrders() {
    const raw = store.get(KEY_ORDERS);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      } catch (e) { /* 坏数据当空 */ }
    }
    return [];
  }

  function saveOrders() {
    store.set(KEY_ORDERS, JSON.stringify(state.orders));
  }

  function renderOrders(keyword) {
    const kw = String(keyword || '').trim().toLowerCase();
    const all = state.orders || [];

    const list = kw
      ? all.filter(function (o) {
          if (o.orderNo.toLowerCase().indexOf(kw) >= 0) return true;
          if (String(o.pickNo).indexOf(kw) >= 0) return true;
          if (o.time.indexOf(kw) >= 0) return true;
          return (o.items || []).some(function (it) {
            return it.name.toLowerCase().indexOf(kw) >= 0;
          });
        })
      : all;

    const sum = list.reduce(function (n, o) { return n + o.total; }, 0);
    el.ordersStat.textContent = kw
      ? '筛选出 ' + list.length + ' 单 · 合计 ¥' + money2(sum)
      : '共 ' + all.length + ' 单 · 合计 ¥' + money2(sum);

    if (!list.length) {
      el.ordersList.innerHTML =
        '<div class="oh-empty"><div class="t">' +
        (kw ? '没有匹配的订单' : '还没有历史订单') +
        '</div><div class="s">' +
        (kw ? '换个订单号、取餐号或菜品名试试' : '下单后这里会记录你点过的每一单') +
        '</div></div>';
      return;
    }

    el.ordersList.innerHTML = list.map(function (o) {
      const names = (o.items || []).map(function (it) {
        return it.name + (it.qty > 1 ? '×' + it.qty : '');
      }).join('、');
      return (
        '<div class="oc" data-no="' + esc(o.orderNo) + '">' +
        '<div class="oc-top"><span class="oc-no">' + esc(o.orderNo) + '</span>' +
        '<span class="oc-time">' + esc(o.time) + '</span></div>' +
        '<div class="oc-mid">' + esc(names) + '</div>' +
        '<div class="oc-bot">' +
        '<span><span class="oc-pick">取餐 ' + esc(o.pickNo) + '</span> ' +
        (o.mode === 'dine' ? '堂食 ' + esc(o.tableNo || '') : '自取') + ' · ' + o.count + ' 件</span>' +
        '<span class="oc-total">¥' + money2(o.total) + '</span>' +
        '</div></div>'
      );
    }).join('');
  }

  function openOrderDetail(orderNo) {
    const o = (state.orders || []).filter(function (x) { return x.orderNo === orderNo; })[0];
    if (!o) return;

    el.odTitle.textContent = '订单 ' + o.orderNo;
    const lines = (o.items || []).map(function (it) {
      return (
        '<div class="od-line"><div class="n">' + esc(it.name) +
        (it.specText ? '<div class="s">' + esc(it.specText) + '</div>' : '') +
        '</div><div class="q">×' + it.qty + '</div>' +
        '<div>¥' + money2(it.unitPrice * it.qty) + '</div></div>'
      );
    }).join('');

    el.odBody.innerHTML =
      lines +
      '<div class="od-sep">' +
      '<div class="od-kv"><span>下单时间</span><b>' + esc(o.time) + '</b></div>' +
      '<div class="od-kv"><span>取餐号</span><b>' + esc(o.pickNo) + '</b></div>' +
      '<div class="od-kv"><span>取餐方式</span><b>' +
      (o.mode === 'dine' ? '堂食 · 桌号 ' + esc(o.tableNo || '未填') : '到店自取') + '</b></div>' +
      (o.remark ? '<div class="od-kv"><span>备注</span><b>' + esc(o.remark) + '</b></div>' : '') +
      '<div class="od-kv"><span>合计</span><b>¥' + money2(o.total) + '</b></div>' +
      '</div>';

    openSheet(el.odSheet);
  }

  function clearOrders() {
    if (!state.orders.length) { toast('还没有订单'); return; }
    if (!confirm('清空全部历史订单？此操作不可恢复。')) return;
    state.orders = [];
    saveOrders();
    renderOrders('');
    toast('已清空历史订单');
  }

  /* ---------- 事件 ---------- */
  function bind() {
    renderShop();

    /* 历史订单 */
    el.ordersBtn.addEventListener('click', function () { screens('orders'); });
    el.ordersBack.addEventListener('click', function () { screens('menu'); });
    el.ordersClear.addEventListener('click', clearOrders);
    el.ordersSearch.addEventListener('input', function () { renderOrders(this.value); });
    el.ordersList.addEventListener('click', function (e) {
      const card = e.target.closest('.oc');
      if (card) openOrderDetail(card.dataset.no);
    });
    el.odClose.addEventListener('click', function () { closeSheet(el.odSheet); });
    if (el.doneOrders) {
      el.doneOrders.addEventListener('click', function () {
        el.ordersSearch.value = '';
        screens('orders');
      });
    }

    el.editToggle.addEventListener('click', function () {
      state.editMode = !state.editMode;
      el.editToggle.classList.toggle('on', state.editMode);
      el.editToggle.textContent = state.editMode ? '完成' : '编辑';
      el.editBar.hidden = !state.editMode;
      el.shopLogoEdit.hidden = !state.editMode;
      el.appRoot.classList.toggle('editing', state.editMode);
      renderList();
    });

    /* 店铺图：点 logo 换图（编辑模式下） */
    el.shopLogo.addEventListener('click', pickShopImage);

    el.shopFileInput.addEventListener('change', function () {
      const file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast('请选择图片文件'); return; }
      compressImage(file, function (dataUrl) {
        if (!dataUrl) { toast('图片读取失败'); return; }
        state.shop.logo = dataUrl;
        saveShop();
        renderShop();
        toast('店铺图已更新');
      });
    });

    el.cats.addEventListener('click', function (e) {
      const cat = e.target.closest('[data-cat]');
      if (!cat) return;
      state.activeCat = cat.dataset.cat;
      renderCats();
      const sec = el.list.querySelector('.sec[data-cat="' + state.activeCat + '"]');
      if (sec) {
        const top = sec.getBoundingClientRect().top - el.list.getBoundingClientRect().top + el.list.scrollTop;
        el.list.scrollTo({ top: Math.max(0, top - 2), behavior: 'smooth' });
      }
    });

    el.list.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-act]');
      if (btn && btn.dataset.act === 'reset') { resetMenu(); return; }
      if (!btn) return;
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === 'add') {
        const item = findItem(id);
        if (!item) return;
        if (item.specs) openSku(item);
        else {
          addLine({
            key: buildKey(item.id, {}, []),
            itemId: item.id,
            name: item.name,
            initial: item.initial,
            bg: item.bg,
            image: item.image || '',
            specText: '',
            unitPrice: item.price,
            qty: 1
          });
          toast('已加入购物车');
        }
      } else if (act === 'edit') {
        openForm(id);
      } else if (act === 'del') {
        removeItem(id);
      }
    });

    el.list.addEventListener('scroll', function () {
      const top = el.list.scrollTop + 4;
      let cur = state.sectionTops[0] ? state.sectionTops[0].id : '';
      state.sectionTops.forEach(function (s) { if (s.top <= top) cur = s.id; });
      if (cur && cur !== state.activeCat) {
        state.activeCat = cur;
        renderCats();
      }
    });

    el.cartLeft.addEventListener('click', function () {
      if (!totals().count) { toast('还没选菜品'); return; }
      renderCartSheet();
      openSheet(el.cartSheet);
    });

    el.payBtn.addEventListener('click', function () {
      if (!totals().count) { toast('先选点什么吧'); return; }
      closeSheet(el.cartSheet);
      screens('order');
    });

    el.cartLines.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-step]');
      if (!btn) return;
      changeQty(btn.dataset.key, Number(btn.dataset.step));
    });

    $('#cartClear').addEventListener('click', function () {
      state.cart = [];
      saveCart();
      renderCartBar();
      closeSheet(el.cartSheet);
      toast('已清空');
    });

    $('#cartClose').addEventListener('click', function () { closeSheet(el.cartSheet); });
    $('#formClose').addEventListener('click', function () { closeSheet(el.formSheet); });
    el.skuClose.addEventListener('click', function () { closeSheet(el.skuSheet); });

    el.skuGroups.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-o]');
      if (!btn) return;
      state.sku.picks[btn.dataset.g] = btn.dataset.o;
      renderSku();
    });

    el.skuToppings.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-t]');
      if (!btn) return;
      const id = btn.dataset.t;
      const i = state.sku.toppingIds.indexOf(id);
      if (i >= 0) state.sku.toppingIds.splice(i, 1);
      else state.sku.toppingIds.push(id);
      renderSku();
    });

    el.skuMinus.addEventListener('click', function () {
      state.sku.qty = Math.max(1, state.sku.qty - 1);
      renderSku();
    });

    el.skuPlus.addEventListener('click', function () {
      state.sku.qty = Math.min(99, state.sku.qty + 1);
      renderSku();
    });

    el.skuAdd.addEventListener('click', confirmSku);

    el.addDishBtn.addEventListener('click', function () { openForm(''); });
    el.specBtn.addEventListener('click', openSpecEditor);
    el.syncBtn.addEventListener('click', openSync);
    el.syncClose.addEventListener('click', function () { closeSheet(el.syncSheet); });
    el.syncCopy.addEventListener('click', copySync);
    el.syncDownload.addEventListener('click', downloadSync);
    el.syncPick.addEventListener('click', function () { el.syncFile.click(); });
    el.syncFile.addEventListener('change', function () {
      const file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        el.syncInput.value = String(reader.result || '');
        toast('文件已读入，点「导入并覆盖」生效');
      };
      reader.onerror = function () { toast('文件读取失败'); };
      reader.readAsText(file);
    });
    el.syncApply.addEventListener('click', function () {
      if (applySync(el.syncInput.value)) closeSheet(el.syncSheet);
    });
    el.specClose.addEventListener('click', function () { closeSheet(el.specSheet); });
    el.specCancel.addEventListener('click', function () { closeSheet(el.specSheet); });
    el.specSave.addEventListener('click', function () {
      syncSpecDraft();
      commitSpecs();
    });
    el.specBody.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-delgroup],[data-delopt],[data-deltop],[data-addopt],[data-addgroup],[data-addtop]');
      if (!btn) return;
      syncSpecDraft();
      const d = specDraft;
      if (btn.dataset.delgroup !== undefined) {
        const gi = Number(btn.dataset.delgroup);
        if (d.specGroups.length <= 1) { toast('至少保留一个规格组'); return; }
        d.specGroups.splice(gi, 1);
      } else if (btn.dataset.delopt !== undefined) {
        const parts = btn.dataset.delopt.split('-');
        const g = d.specGroups[Number(parts[0])];
        if (!g) return;
        if (g.options.length <= 1) { toast('每组至少保留一个选项'); return; }
        g.options.splice(Number(parts[1]), 1);
      } else if (btn.dataset.deltop !== undefined) {
        d.toppings.splice(Number(btn.dataset.deltop), 1);
      } else if (btn.dataset.addopt !== undefined) {
        const g = d.specGroups[Number(btn.dataset.addopt)];
        if (g) g.options.push({ id: uid('o'), name: '', delta: 0 });
      } else if (btn.dataset.addgroup !== undefined) {
        d.specGroups.push({ key: uid('g'), name: '', options: [{ id: uid('o'), name: '', delta: 0 }] });
      } else if (btn.dataset.addtop !== undefined) {
        d.toppings.push({ id: uid('t'), name: '', price: 0 });
      }
      renderSpecSheet();
    });
    el.resetBtn.addEventListener('click', resetMenu);

    el.formCats.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      state.form.catId = btn.dataset.cat;
      renderFormCats();
    });

    el.formSpecs.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-specs]');
      if (!btn) return;
      state.form.specs = btn.dataset.specs === '1';
      renderFormSpecs();
    });

    el.formName.addEventListener('input', function () { state.form.name = this.value; });
    el.formPrice.addEventListener('input', function () { state.form.price = this.value; });
    el.formDesc.addEventListener('input', function () { state.form.desc = this.value; });

    el.formImgBox.addEventListener('click', function () { el.fileInput.click(); });

    el.fileInput.addEventListener('change', function () {
      const file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast('请选择图片文件'); return; }
      compressImage(file, function (dataUrl) {
        if (!dataUrl) { toast('图片读取失败'); return; }
        state.form.image = dataUrl;
        renderFormImage();
        toast('图片已就绪，记得点保存');
      });
    });

    el.formImgDel.addEventListener('click', function (e) {
      e.stopPropagation();
      state.form.image = '';
      renderFormImage();
    });

    el.formCancel.addEventListener('click', function () { closeSheet(el.formSheet); });
    el.formSave.addEventListener('click', saveForm);

    el.modeSelf.addEventListener('click', function () { state.order.mode = 'self'; renderOrder(); });
    el.modeDine.addEventListener('click', function () { state.order.mode = 'dine'; renderOrder(); });
    el.submitBtn.addEventListener('click', submitOrder);
    el.tableNo.addEventListener('input', function () { state.order.tableNo = this.value; });
    el.remark.addEventListener('input', function () { state.order.remark = this.value; });

    el.doneAgain.addEventListener('click', function () {
      state.order.mode = 'self';
      state.order.tableNo = '';
      state.order.remark = '';
      renderCats();
      renderList();
      renderCartBar();
      screens('menu');
    });

    el.mask.addEventListener('click', function () {
      [el.cartSheet, el.skuSheet, el.formSheet, el.odSheet, el.specSheet, el.syncSheet].forEach(function (s) { if (!s.hidden) closeSheet(s); });
    });
  }

  /* ---------- 启动 ---------- */
  state.items = loadMenu();
  state.shop = loadShop();
  (function initSpecs() {
    const specs = loadSpecs();
    state.specGroups = specs.specGroups;
    state.toppings = specs.toppings;
  })();
  state.orders = loadOrders();
  state.cart = loadCart();
  state.activeCat = state.categories[0].id;

  bind();
  renderCats();
  renderList();
  renderCartBar();
  screens('menu');

  /* 供自测与调试 */
  window.__app = {
    state: state,
    data: DATA,
    addLine: addLine,
    changeQty: changeQty,
    totals: totals,
    openSku: openSku,
    confirmSku: confirmSku,
    findItem: findItem,
    saveForm: saveForm,
    openForm: openForm,
    removeItem: removeItem,
    resetMenu: resetMenu,
    submitOrder: submitOrder,
    renderOrder: renderOrder,
    renderList: renderList,
    renderCartBar: renderCartBar,
    screens: screens,
    el: el,
    store: store,
    KEY_MENU: KEY_MENU,
    KEY_CART: KEY_CART,
    KEY_SHOP: KEY_SHOP,
    KEY_ORDERS: KEY_ORDERS,
    KEY_SPECS: KEY_SPECS,
    loadSpecs: loadSpecs,
    saveSpecs: saveSpecs,
    openSpecEditor: openSpecEditor,
    specDraft: function () { return specDraft; },
    syncText: syncText,
    applySync: applySync,
    openSync: openSync,
    loadOrders: loadOrders,
    saveOrders: saveOrders,
    renderOrders: renderOrders,
    openOrderDetail: openOrderDetail,
    clearOrders: clearOrders,
    loadMenu: loadMenu,
    saveMenu: saveMenu,
    renderShop: renderShop,
    saveShop: saveShop,
    loadShop: loadShop,
    itemsOf: itemsOf
  };
})();
