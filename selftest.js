/* 浏览器内自测：在真实 DOM 上点按钮、填表单，验证整条链路。地址后加 ?selftest=1 触发。 */
(function () {
  'use strict';
  var A = window.__app;
  var results = [];
  var pass = 0;
  var fail = 0;

  function ok(name, cond, extra) {
    if (cond) { pass++; results.push('✓ ' + name); }
    else { fail++; results.push('✗ ' + name + (extra === undefined ? '' : ' => ' + JSON.stringify(extra))); }
  }

  function byId(id) { return document.getElementById(id); }
  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function click(node) {
    if (!node) throw new Error('click: node not found');
    node.click();
  }
  function clickAdd(id) { click(q('[data-act="add"][data-id="' + id + '"]')); }
  function setVal(node, v) {
    node.value = v;
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function money(n) { return Math.round(n * 100) / 100; }

  window.confirm = function () { return true; };

  // 基线归零：连 store 内存缓存一起清，保证可重复运行
  [A.KEY_MENU, A.KEY_CART, A.KEY_SHOP, A.KEY_ORDERS, A.KEY_SPECS].forEach(function (k) {
    try { A.store.del(k); } catch (e) {}
  });
  A.state.items = JSON.parse(JSON.stringify(A.data.items));
  A.state.shop = A.loadShop();
  A.state.cart = [];
  A.state.orders = A.loadOrders();
  var _specs = A.loadSpecs();
  A.state.specGroups = _specs.specGroups;
  A.state.toppings = _specs.toppings;
  A.state.editMode = false;
  byId('editBar').hidden = true;
  byId('editToggle').classList.remove('on');
  byId('editToggle').textContent = '编辑';
  A.state.activeCat = A.state.categories[0].id;
  A.renderShop();
  A.renderList();
  A.renderCartBar();

  try {
  /* ---------- 1. 基础数据 ---------- */
  ok('店名：小羊吃遍全宇宙', A.data.shop.name === '小羊吃遍全宇宙', A.data.shop.name);
  ok('页面标题渲染店名', byId('shopName').textContent === '小羊吃遍全宇宙');
  ok('店铺信息不含「距你」', byId('shopMeta').textContent.indexOf('距你') < 0, byId('shopMeta').textContent);
  ok('店铺信息不含「月售」', byId('shopMeta').textContent.indexOf('月售') < 0, byId('shopMeta').textContent);
  ok('店铺信息只保留营业时间', byId('shopMeta').textContent === '营业中 10:00-21:30', byId('shopMeta').textContent);
  ok('所有菜品月售为 0', A.state.items.every(function (it) { return it.sales === 0; }),
    A.state.items.filter(function (it) { return it.sales !== 0; }).length);
  ok('月售照常显示（月售 0）', qa('#list .dish-sales').length === qa('#list .dish').length &&
    qa('#list .dish-sales')[0].textContent === '月售 0', qa('#list .dish-sales')[0] && qa('#list .dish-sales')[0].textContent);
  ok('分类 11 个（含汤品/其他）', A.state.categories.length === 11, A.state.categories.length);
  ok('分类名符合要求', A.state.categories.map(function (c) { return c.name; }).join(',') ===
    '鸡肉,牛肉,猪肉,羊肉,海鲜,小炒,素菜,汤品,其他,甜品,饮品',
    A.state.categories.map(function (c) { return c.name; }).join(','));
  ok('左侧分类栏渲染 11 项', qa('#cats .cat').length === 11, qa('#cats .cat').length);
  ok('默认菜品 30 道', A.state.items.length === 30, A.state.items.length);
  var soup = A.state.items.filter(function (it) { return it.catId === 'c8'; });
  var other = A.state.items.filter(function (it) { return it.catId === 'c9'; });
  ok('汤品分类有 4 道', soup.length === 4, soup.length);
  ok('其他分类有 4 道', other.length === 4, other.length);
  ok('菜品列表渲染出菜品卡', qa('#list .dish').length > 0, qa('#list .dish').length);

  /* ---------- 1b. 店铺图 ---------- */
  var logoSample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  ok('默认没有店铺图（用文字占位）', byId('shopLogoImg').hidden === true && byId('shopLogoText').hidden === false);
  A.state.shop.logo = logoSample;
  A.saveShop();
  A.renderShop();
  ok('上传后 logo 变成图片', byId('shopLogoImg').hidden === false && byId('shopLogoText').hidden === true);
  ok('店铺图写入 localStorage', (localStorage.getItem(A.KEY_SHOP) || '').indexOf('data:image') >= 0);
  click(byId('editToggle'));
  ok('进入编辑模式后出现「换图」', byId('shopLogoEdit').hidden === false);
  ok('订单页同步显示店铺图', byId('orderLogoImg').getAttribute('src') === logoSample);
  click(byId('editToggle'));
  ok('退出编辑后「换图」隐藏', byId('shopLogoEdit').hidden === true);

  /* ---------- 2. 加购：无规格 ---------- */
  A.state.cart = []; A.renderCartBar();
  clickAdd('f27'); // 红豆双皮奶 12（无规格）
  ok('直接加购 1 件', A.totals().count === 1, A.totals());
  ok('合计 1.00（价格统一 1 元）', money(A.totals().total) === 1, A.totals().total);
  ok('角标显示 1', byId('cartBadge').textContent === '1' && !byId('cartBadge').hidden);

  /* ---------- 3. 加购：规格 + 加料 ---------- */
  clickAdd('f01'); // 黄焖鸡 28，弹规格
  ok('规格弹层打开', !byId('skuSheet').hidden);
  click(q('#skuGroups [data-o="p2"]'));      // 大份 +8
  click(q('#skuToppings [data-t="egg"]'));   // 加卤蛋 +3
  click(byId('skuPlus'));                    // 数量 2
  ok('规格价 = (1+8+3)×2 = 24', byId('skuPrice').textContent.indexOf('24') >= 0, byId('skuPrice').textContent);
  click(byId('skuAdd'));
  ok('加购后共 3 件', A.totals().count === 3, A.totals());
  ok('合计 1 + 12×2 = 25', money(A.totals().total) === 25, A.totals().total);
  var specLine = A.state.cart.filter(function (l) { return l.specText; })[0];
  ok('规格文案含大份/卤蛋', specLine && /大份/.test(specLine.specText) && /加卤蛋/.test(specLine.specText), specLine && specLine.specText);

  /* ---------- 4. 已选清单与步进器 ---------- */
  click(byId('cartLeft'));
  ok('清单弹层打开', !byId('cartSheet').hidden);
  ok('清单里渲染出规格行', qa('#cartLines .pi-spec').length >= 1, qa('#cartLines .pi-spec').length);
  var plusBtn = q('#cartLines .step.plus');
  click(plusBtn);
  ok('清单里加 1 件', A.totals().count === 4, A.totals());
  click(q('#cartLines .step[data-step="-1"]'));
  ok('清单里减 1 件', A.totals().count === 3, A.totals());
  click(byId('cartClose'));

  /* ---------- 5. 编辑模式：新增（带图片） ---------- */
  click(byId('editToggle'));
  ok('进入编辑模式', A.state.editMode === true);
  ok('编辑条出现', !byId('editBar').hidden);
  ok('菜品卡出现 改/删', qa('[data-act="edit"]').length > 0 && qa('[data-act="del"]').length > 0);

  click(byId('addDishBtn'));
  ok('新增表单打开', !byId('formSheet').hidden);
  setVal(byId('formName'), '葱爆羊肉');
  setVal(byId('formPrice'), '46');
  setVal(byId('formDesc'), '羊后腿 + 大葱爆炒');
  click(q('#formCats [data-cat="c4"]'));
  // 模拟上传图片：一张 1×1 的 PNG
  A.state.form.image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  click(byId('formSave'));
  ok('菜品数 30 → 31', A.state.items.length === 31, A.state.items.length);
  var added = A.state.items.filter(function (it) { return it.name === '葱爆羊肉'; })[0];
  ok('新菜落在羊肉分类', added && added.catId === 'c4', added && added.catId);
  ok('新菜价格 46', added && added.price === 46, added && added.price);
  ok('新菜带图片', added && /^data:image\/png/.test(added.image), added && (added.image || '').slice(0, 24));
  ok('图片渲染成 <img>', !!q('.dish-img'), qa('.dish-img').length);
  ok('落库到 localStorage', (localStorage.getItem(A.KEY_MENU) || '').indexOf('葱爆羊肉') >= 0);

  /* ---------- 6. 校验 ---------- */
  click(byId('addDishBtn'));
  setVal(byId('formName'), '');
  click(byId('formSave'));
  ok('空名称被拦截', !byId('formSheet').hidden);
  setVal(byId('formName'), '测试菜');
  setVal(byId('formPrice'), '0');
  click(byId('formSave'));
  ok('价格 0 被拦截', !byId('formSheet').hidden);
  click(byId('formCancel'));

  /* ---------- 7. 编辑已有菜品 ---------- */
  click(q('[data-act="edit"][data-id="' + added.id + '"]'));
  ok('编辑表单回填名称', byId('formName').value === '葱爆羊肉', byId('formName').value);
  ok('编辑表单回填图片', !byId('formImgPreview').hidden);
  setVal(byId('formPrice'), '52');
  click(byId('formSave'));
  var edited = A.findItem(added.id);
  ok('改价生效 52', edited && edited.price === 52, edited && edited.price);

  /* ---------- 8. 删除联动购物车 ---------- */
  click(byId('editToggle'));
  ok('退出编辑模式', A.state.editMode === false);
  A.state.cart = [];
  A.renderCartBar();
  clickAdd('f27');
  ok('先加一件待删菜品', A.totals().count === 1);
  click(byId('editToggle'));
  ok('重新进入编辑模式', A.state.editMode === true);
  click(q('[data-act="del"][data-id="f27"]'));
  ok('菜品被删除', !A.findItem('f27'));
  ok('购物车同步移除', A.totals().count === 0, A.totals());

  /* ---------- 9. 恢复默认 ---------- */
  click(byId('resetBtn'));
  ok('恢复默认 30 道', A.state.items.length === 30, A.state.items.length);
  ok('自定义菜已清除', !A.findItem(added.id));
  ok('storage 已删除', localStorage.getItem(A.KEY_MENU) === null);
  ok('店铺图已还原为文字占位', A.state.shop.logo === '' && byId('shopLogoImg').hidden === true,
    A.state.shop.logo);
  ok('店铺存储已清除', localStorage.getItem(A.KEY_SHOP) === null);

  /* ---------- 10. 下单流程 ---------- */
  A.state.editMode = false;
  byId('editBar').hidden = true;
  A.state.activeCat = 'c1';
  A.renderList();
  A.state.cart = [];
  A.renderCartBar();
  clickAdd('f27');
  clickAdd('f29');
  ok('下单前 2 件', A.totals().count === 2, A.totals());
  click(byId('payBtn'));
  ok('进入确认订单页', !byId('screenOrder').hidden && byId('screenMenu').hidden);
  ok('清单渲染 2 行', qa('#orderLines .line').length === 2, qa('#orderLines .line').length);

  click(byId('modeDine'));
  ok('切到堂食后出现桌号', !byId('tableRow').hidden);
  click(byId('submitBtn'));
  ok('未填桌号被拦截', !byId('screenOrder').hidden && !A.state.result);

  click(byId('modeSelf'));
  setVal(byId('remark'), '不要辣，多点米饭');
  click(byId('submitBtn'));
  ok('下单成功页出现', !byId('screenDone').hidden);
  ok('取餐号 3 位数字', /^\d{3}$/.test(A.state.result.pickNo), A.state.result && A.state.result.pickNo);
  ok('订单号以 XY 开头', /^XY\d+$/.test(A.state.result.orderNo), A.state.result && A.state.result.orderNo);
  ok('下单后购物车清空', A.totals().count === 0);
  ok('下单后 storage 清空', JSON.parse(localStorage.getItem(A.KEY_CART) || '[]').length === 0);
  ok('取餐号渲染到页面', byId('pickNo').textContent === A.state.result.pickNo);
  ok('成功页有「复制订单」按钮', !!byId('copyOrder'));
  ok('生成可复制的订单文本', !!A.state.result.copyText && A.state.result.copyText.indexOf('取餐号') >= 0,
    (A.state.result.copyText || '').slice(0, 24));
  ok('复制文本含合计与取餐方式', /合计 ¥/.test(A.state.result.copyText) && /自取|堂食/.test(A.state.result.copyText),
    A.state.result.copyText.split('\n').slice(-1)[0]);
  ok('版本号已渲染', /^v\d/.test(byId('appVer').textContent), byId('appVer').textContent);

  click(byId('doneAgain'));
  ok('再来一单回到菜单页', !byId('screenMenu').hidden && byId('screenDone').hidden);

  /* ---------- 11. 历史订单 ---------- */
  ok('下单写入历史订单', A.state.orders.length === 1, A.state.orders.length);
  ok('历史订单已持久化', (localStorage.getItem(A.KEY_ORDERS) || '').indexOf(A.state.orders[0].orderNo) >= 0);
  ok('订单记录了菜品明细', (A.state.orders[0].items || []).length >= 2, (A.state.orders[0].items || []).length);

  click(byId('ordersBtn'));
  ok('进入历史订单页', !byId('screenOrders').hidden && byId('screenMenu').hidden);
  ok('列表渲染 1 单', qa('#ordersList .oc').length === 1, qa('#ordersList .oc').length);
  ok('统计文案含「共 1 单」', byId('ordersStat').textContent.indexOf('共 1 单') >= 0, byId('ordersStat').textContent);
  ok('卡片显示订单号', qa('#ordersList .oc-no')[0].textContent === A.state.orders[0].orderNo);

  setVal(byId('ordersSearch'), '红豆双皮奶');
  ok('按菜品名筛选命中', qa('#ordersList .oc').length === 1, qa('#ordersList .oc').length);
  setVal(byId('ordersSearch'), A.state.orders[0].pickNo);
  ok('按取餐号筛选命中', qa('#ordersList .oc').length === 1, qa('#ordersList .oc').length);
  setVal(byId('ordersSearch'), 'zzz不存在的菜');
  ok('搜不到时显示空状态', qa('#ordersList .oc').length === 0 && !!q('#ordersList .oh-empty'));
  setVal(byId('ordersSearch'), '');
  ok('清空搜索后恢复 1 单', qa('#ordersList .oc').length === 1);

  click(q('#ordersList .oc'));
  ok('订单详情弹层打开', !byId('odSheet').hidden);
  ok('详情含合计与取餐号', byId('odBody').textContent.indexOf('合计') >= 0 &&
    byId('odBody').textContent.indexOf('取餐号') >= 0, byId('odBody').textContent.slice(0, 40));

  click(byId('odClose'));
  click(byId('ordersBack'));
  ok('返回点餐页', !byId('screenMenu').hidden);

  click(byId('ordersBtn'));
  click(byId('ordersClear'));
  ok('清空后 0 单', A.state.orders.length === 0 && qa('#ordersList .oc').length === 0, A.state.orders.length);
  ok('订单存储已清空', (localStorage.getItem(A.KEY_ORDERS) || '[]') === '[]');
  click(byId('ordersBack'));

  /* ---------- 12. 底部按钮不遮挡 + 规格可编辑 ---------- */
  click(byId('editToggle'));
  ok('编辑条有 4 个操作按钮', qa('#editBar .fab').length === 4, qa('#editBar .fab').length);
  ok('编辑模式给容器加了 editing 标记', byId('app').classList.contains('editing'));
  var padH = parseFloat(getComputedStyle(q('#list .list-pad')).height);
  ok('列表底部留白 ≥ 200px（不再遮挡最后一道菜）', padH >= 200, padH);

  click(byId('specBtn'));
  ok('规格编辑器打开', !byId('specSheet').hidden);
  ok('渲染出 2 个规格组', qa('#specBody .sg[data-gi]').length === 2, qa('#specBody .sg[data-gi]').length);
  ok('渲染出 4 个加料', qa('#specBody .sg-opt[data-ti]').length === 4, qa('#specBody .sg-opt[data-ti]').length);

  // 份量组：大份加价 8 → 10，并新增「超大份 +18」
  qa('#specBody .sg[data-gi="0"] .sg-opt .delta')[1].value = '10';
  click(q('#specBody [data-addopt="0"]'));
  var rows = qa('#specBody .sg[data-gi="0"] .sg-opt');
  ok('新增选项后该组 3 个选项', rows.length === 3, rows.length);
  rows[2].querySelector('.name').value = '超大份';
  rows[2].querySelector('.delta').value = '18';
  click(byId('specSave'));

  ok('保存后份量组有 3 个选项', A.state.specGroups[0].options.length === 3, A.state.specGroups[0].options.length);
  ok('大份加价改为 10', A.state.specGroups[0].options[1].delta === 10, A.state.specGroups[0].options[1].delta);
  ok('新选项名保存为超大份', A.state.specGroups[0].options[2].name === '超大份', A.state.specGroups[0].options[2].name);
  ok('规格写入 localStorage', (localStorage.getItem(A.KEY_SPECS) || '').indexOf('超大份') >= 0);

  // 规格弹窗里立即生效（编辑模式下没有「+」，先退出编辑）
  click(byId('editToggle'));
  clickAdd('f01');
  ok('弹窗出现 3 个份量选项', qa('#skuGroups [data-o]').length === 3 + A.state.specGroups[1].options.length,
    qa('#skuGroups [data-o]').length);
  ok('大份显示 +10', q('#skuGroups [data-o="p2"]').textContent.indexOf('+10') >= 0,
    q('#skuGroups [data-o="p2"]').textContent);
  click(q('#skuGroups [data-o="p2"]'));
  ok('选大份后单价 1+10 = 11', byId('skuPrice').textContent.indexOf('11') >= 0, byId('skuPrice').textContent);
  click(byId('skuClose'));

  // 删除一个加料
  click(byId('editToggle'));
  click(byId('specBtn'));
  click(q('#specBody [data-deltop="1"]'));
  ok('删除后剩 3 个加料', qa('#specBody .sg-opt[data-ti]').length === 3, qa('#specBody .sg-opt[data-ti]').length);
  click(byId('specSave'));
  ok('加料数量保存为 3', A.state.toppings.length === 3, A.state.toppings.length);
  click(byId('editToggle'));
  clickAdd('f01');
  ok('弹窗加料同步为 3 个', qa('#skuToppings [data-t]').length === 3, qa('#skuToppings [data-t]').length);
  click(byId('skuClose'));
  click(byId('editToggle'));

  // 恢复默认：规格一起还原
  click(byId('resetBtn'));
  ok('恢复默认后份量组回到 2 个选项', A.state.specGroups[0].options.length === 2, A.state.specGroups[0].options.length);
  ok('恢复默认后大份加价回到 8', A.state.specGroups[0].options[1].delta === 8, A.state.specGroups[0].options[1].delta);
  ok('恢复默认后加料回到 4 个', A.state.toppings.length === 4, A.state.toppings.length);
  ok('规格存储已清除', localStorage.getItem(A.KEY_SPECS) === null);
  ok('恢复默认后退出编辑模式', byId('app').classList.contains('editing') === false);

  /* ---------- 13. 数据同步：导出 / 换设备导入 ---------- */
  click(byId('editToggle'));
  click(byId('syncBtn'));
  ok('同步面板打开', !byId('syncSheet').hidden);
  var exported = byId('syncInput').value;
  var parsed = JSON.parse(exported);
  ok('导出内容含 30 道菜', parsed.items.length === 30, parsed.items.length);
  ok('导出内容含规格与加料', parsed.specGroups.length === 2 && parsed.toppings.length === 4);
  ok('导出内容含店铺信息', parsed.shop && parsed.shop.name === '小羊吃遍全宇宙');

  // 在本机改一道菜
  A.state.items[0].name = '改过的黄焖鸡';
  A.renderList();
  ok('本机数据已被修改', q('#list .dish-name').textContent === '改过的黄焖鸡', q('#list .dish-name').textContent);
  var exported2 = A.syncText(); // 改完之后再导出，模拟「在手机上编辑并导出」

  // 模拟「另一台设备」：清空本地数据，回到默认菜单
  [A.KEY_MENU, A.KEY_SPECS, A.KEY_SHOP, A.KEY_CART].forEach(function (k) { A.store.del(k); });
  A.state.items = A.loadMenu();
  var sp = A.loadSpecs();
  A.state.specGroups = sp.specGroups;
  A.state.toppings = sp.toppings;
  A.renderList();
  ok('另一台设备初始是默认菜单', q('#list .dish-name').textContent === '黄焖鸡', q('#list .dish-name').textContent);

  // 把导出的 JSON 导入
  ok('导入返回成功', A.applySync(exported2) === true);
  ok('导入后拿到改过的菜名', A.state.items[0].name === '改过的黄焖鸡', A.state.items[0].name);
  ok('导入后写回 localStorage', (localStorage.getItem(A.KEY_MENU) || '').indexOf('改过的黄焖鸡') >= 0);
  ok('导入后页面已刷新', q('#list .dish-name').textContent === '改过的黄焖鸡', q('#list .dish-name').textContent);

  // 非法数据要拒绝
  ok('非法 JSON 被拒绝', A.applySync('这不是 json') === false);
  ok('数据未被破坏', A.state.items.length === 30 && A.state.items[0].name === '改过的黄焖鸡');
  ok('缺字段的数据被拒绝', A.applySync('{"items":[]}') === false);

  click(byId('syncClose'));
  click(byId('editToggle'));

  /* ---------- 14. 每个菜品单独的规格 ---------- */
  click(byId('editToggle'));
  click(q('[data-act="edit"][data-id="f01"]'));
  ok('表单里有规格来源选择', qa('#formSpecs [data-specmode]').length === 2, qa('#formSpecs [data-specmode]').length);

  click(q('#formSpecs [data-specmode="item"]'));
  ok('切到「本菜自定义」', A.state.form.customSpecs === true);
  ok('出现「编辑本菜规格」入口', !!q('#formSpecs [data-editspec]'));

  click(q('#formSpecs [data-editspec]'));
  ok('本菜规格编辑器打开', !byId('specSheet').hidden);
  q('#specBody .sg[data-gi="0"] .gname').value = '份量B';
  qa('#specBody .sg[data-gi="0"] .sg-opt .delta')[1].value = '99';
  click(byId('specSave'));
  ok('表单里已带独立规格', (A.state.form.specGroups || [])[0].name === '份量B', (A.state.form.specGroups || [])[0]);

  click(byId('formSave'));
  var f01 = A.findItem('f01');
  ok('菜品写入独立规格', Array.isArray(f01.specGroups) && f01.specGroups[0].name === '份量B', f01.specGroups && f01.specGroups[0]);
  ok('列表显示「独立规格」标签', !!q('#list .tag-spec'));
  ok('独立规格已落库', (localStorage.getItem(A.KEY_MENU) || '').indexOf('份量B') >= 0);

  click(byId('editToggle'));
  clickAdd('f01');
  ok('弹窗用本菜规格', q('#skuGroups').textContent.indexOf('份量B') >= 0, q('#skuGroups').textContent.slice(0, 30));
  click(q('#skuGroups [data-o="p2"]'));
  ok('本菜大份加价 99 → 单价 100', byId('skuPrice').textContent.indexOf('100') >= 0, byId('skuPrice').textContent);
  click(byId('skuClose'));

  clickAdd('f04');
  ok('其他菜仍用全局规格', q('#skuGroups').textContent.indexOf('份量B') < 0, q('#skuGroups').textContent.slice(0, 30));
  click(q('#skuGroups [data-o="p2"]'));
  ok('全局大份加价仍是 8 → 单价 9', byId('skuPrice').textContent.indexOf('9') >= 0, byId('skuPrice').textContent);
  click(byId('skuClose'));

  click(byId('resetBtn'));
  ok('恢复默认后独立规格被清掉', !A.findItem('f01').specGroups);

  /* ---------- 15. 远端菜单（menu.json）同步 ---------- */
  var remote = {
    categories: JSON.parse(JSON.stringify(A.data.categories)),
    specGroups: JSON.parse(JSON.stringify(A.data.specGroups)),
    toppings: JSON.parse(JSON.stringify(A.data.toppings)),
    items: JSON.parse(JSON.stringify(A.data.items))
  };
  remote.items[0].name = '远端改的黄焖鸡';
  ok('applyRemote 生效', A.applyRemote(remote) === true);
  ok('本机菜单被远端覆盖', A.state.items[0].name === '远端改的黄焖鸡', A.state.items[0].name);
  ok('页面已重新渲染', q('#list .dish-name').textContent === '远端改的黄焖鸡', q('#list .dish-name').textContent);

  // 本机有本地改动时，不被远端覆盖
  A.store.set(A.KEY_MENU, JSON.stringify(A.state.items));
  var remote2 = JSON.parse(JSON.stringify(remote));
  remote2.items[0].name = '另一个远端名字';
  ok('本机改过则不覆盖', A.applyRemote(remote2) === false);
  ok('仍保留本机版本', A.state.items[0].name === '远端改的黄焖鸡', A.state.items[0].name);
  A.store.del(A.KEY_MENU);

  // 脏数据不生效
  ok('非法远端数据被忽略', A.applyRemote({ items: [] }) === false);
  ok('非数组也被忽略', A.applyRemote({ items: 'x' }) === false);

  } catch (e) {
    fail++;
    results.push('✗ 脚本中断: ' + (e && e.message));
  }

  /* ---------- 输出 ---------- */
  var box = document.createElement('pre');
  box.id = 'selftest';
  box.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#fff;color:#111;font:12px/1.5 monospace;padding:8px;margin:0;max-height:100vh;overflow:auto;white-space:pre-wrap;width:100%;box-sizing:border-box';
  box.textContent = 'SELFTEST ' + (fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + '/' + (pass + fail) + '\n' + results.join('\n');
  document.body.appendChild(box);
  document.title = 'SELFTEST ' + (fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + '/' + (pass + fail);
  window.__RESULT = { pass: pass, fail: fail, lines: results };
})();
