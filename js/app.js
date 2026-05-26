/* ==============================================
   ITechProject - Lógica principal (con seguridad y autenticación)
   ============================================== */

let db = {
    config: { tasa: '', util: '', efec: '' },
    productos: [],
    salarios: [],
    gastos: [],
    theme: 'light'
};

const fmt = new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'CUP',
    minimumFractionDigits: 2
});

let toastTimer;

// ==================== CONSTANTES DE SEGURIDAD ====================
const MAX_RECORDS = 500;             // Máximo de productos, salarios o gastos
const MAX_NAME_LENGTH = 100;         // Máxima longitud de nombre
const MAX_AMOUNT = 999999999.99;     // Monto máximo permitido

// ==================== AUTENTICACIÓN ====================
function isAuthenticated() {
    if (sessionStorage.getItem('it_sesion') === 'true') return true;
    const sesion = localStorage.getItem('it_sesion');
    if (sesion === 'true') {
        const expires = localStorage.getItem('it_expires');
        if (expires && Date.now() < parseInt(expires)) return true;
        else {
            localStorage.removeItem('it_sesion');
            localStorage.removeItem('it_expires');
        }
    }
    return false;
}

function checkAuthAndRedirect() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
    }
}

// ==================== UTILIDADES ====================

function showToast(msg, isSuccess = true) {
    clearTimeout(toastTimer);
    const toast = document.getElementById('toast-container');
    const icon = document.getElementById('toast-icon');
    document.getElementById('toast-message').innerText = msg;
    toast.classList.add('active');
    if (!isSuccess) {
        toast.firstElementChild.classList.replace('border-l-brand-500', 'border-l-red-500');
        icon.setAttribute('data-lucide', 'alert-circle');
    } else {
        toast.firstElementChild.classList.replace('border-l-red-500', 'border-l-brand-500');
        icon.setAttribute('data-lucide', 'check');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
    toastTimer = setTimeout(() => toast.classList.remove('active'), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatMoneyField(el) {
    if (!el.classList || !el.classList.contains('money-input')) return;
    let raw = el.value.replace(/,/g, '');
    let num = parseFloat(raw);
    if (isNaN(num)) num = 0;
    if (num > MAX_AMOUNT) {
        num = MAX_AMOUNT;
        showToast(`El monto no puede superar ${MAX_AMOUNT.toLocaleString()} CUP. Se ha ajustado.`, false);
    }
    if (num < 0) {
        num = 0;
        showToast("El monto no puede ser negativo. Se asignó 0.", false);
    }
    const formatted = num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    el.value = formatted;
    const oninputAttr = el.getAttribute('oninput');
    if (oninputAttr) {
        const match = oninputAttr.match(/updateVal\('([^']+)',\s*(\d+),\s*'([^']+)',\s*this\.value\)/);
        if (match) {
            const type = match[1];
            const idx = parseInt(match[2]);
            const field = match[3];
            updateVal(type, idx, field, num.toString());
        }
    }
}

// ==================== CARGA Y GUARDADO SEGURO ====================

function loadFromStorage() {
    const local = localStorage.getItem('finance_v65_itech');
    if (!local) return;
    
    try {
        const parsed = JSON.parse(local);
        db.config = parsed.config || { tasa: '', util: '', efec: '' };
        db.productos = Array.isArray(parsed.productos) ? parsed.productos : [];
        db.salarios = Array.isArray(parsed.salarios) ? parsed.salarios : [];
        db.gastos = Array.isArray(parsed.gastos) ? parsed.gastos : [];
        db.theme = parsed.theme === 'dark' ? 'dark' : 'light';
        
        // Corregir valores negativos en configuración
        if (db.config.tasa && parseFloat(db.config.tasa) < 0) db.config.tasa = '0';
        if (db.config.util && parseFloat(db.config.util) < 0) db.config.util = '0';
        if (db.config.efec && parseFloat(db.config.efec) < 0) db.config.efec = '0';
        
        db.productos = db.productos.slice(0, MAX_RECORDS).map(p => ({
            n: (typeof p.n === 'string' ? p.n.slice(0, MAX_NAME_LENGTH) : '').toUpperCase(),
            v: (typeof p.v === 'string' && !isNaN(parseFloat(p.v)) && parseFloat(p.v) >= 0) ? Math.min(parseFloat(p.v), MAX_AMOUNT).toString() : '0',
            m: (p.m === 'USD' || p.m === 'CUP') ? p.m : 'USD'
        }));
        db.salarios = db.salarios.slice(0, MAX_RECORDS).map(s => ({
            n: (typeof s.n === 'string' ? s.n.slice(0, MAX_NAME_LENGTH) : '').toUpperCase(),
            v: (typeof s.v === 'string' && !isNaN(parseFloat(s.v)) && parseFloat(s.v) >= 0) ? Math.min(parseFloat(s.v), MAX_AMOUNT).toString() : '0'
        }));
        db.gastos = db.gastos.slice(0, MAX_RECORDS).map(g => ({
            n: (typeof g.n === 'string' ? g.n.slice(0, MAX_NAME_LENGTH) : '').toUpperCase(),
            v: (typeof g.v === 'string' && !isNaN(parseFloat(g.v)) && parseFloat(g.v) >= 0) ? Math.min(parseFloat(g.v), MAX_AMOUNT).toString() : '0'
        }));
    } catch (e) {
        console.error("Error al cargar datos", e);
        showToast("Los datos guardados estaban dañados. Se reinició la aplicación.", false);
    }
    
    document.getElementById('cfg-tasa').value = db.config.tasa;
    document.getElementById('cfg-util').value = db.config.util;
    document.getElementById('cfg-efec').value = db.config.efec;
    if (db.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
}

function save() {
    let tasaVal = parseFloat(document.getElementById('cfg-tasa').value) || 0;
    let utilVal = parseFloat(document.getElementById('cfg-util').value) || 0;
    let efecVal = parseFloat(document.getElementById('cfg-efec').value) || 0;
    if (tasaVal < 0) tasaVal = 0;
    if (utilVal < 0) utilVal = 0;
    if (efecVal < 0) efecVal = 0;
    
    db.config = {
        tasa: tasaVal.toString(),
        util: utilVal.toString(),
        efec: efecVal.toString()
    };
    localStorage.setItem('finance_v65_itech', JSON.stringify(db));
}

// ==================== TASA Y MODALES ====================

function showMissingTasaAlert() {
    const modal = document.getElementById('missingTasaModal');
    if (modal) modal.classList.add('active');
}
function hideMissingTasaAlert() {
    const modal = document.getElementById('missingTasaModal');
    if (modal) modal.classList.remove('active');
}
function ensureTasa(callback) {
    const tasaInput = document.getElementById('cfg-tasa');
    let tasa = parseFloat(tasaInput.value);
    if (isNaN(tasa) || tasa <= 0) {
        showMissingTasaAlert();
        if (callback) callback(false);
        return false;
    }
    if (callback) callback(true);
    return true;
}

// ==================== MODAL DE LIMPIEZA ====================

let cleanConfigCallback = null;

function showCleanConfigModal() {
    const modal = document.getElementById('cleanConfigModal');
    if (modal) modal.classList.add('active');
}
function hideCleanConfigModal() {
    const modal = document.getElementById('cleanConfigModal');
    if (modal) modal.classList.remove('active');
}
function setupCleanConfigModal() {
    const cancelBtn = document.getElementById('cleanConfigCancel');
    const confirmBtn = document.getElementById('cleanConfigConfirm');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        if (cleanConfigCallback) cleanConfigCallback(false);
    });
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
        if (cleanConfigCallback) cleanConfigCallback(true);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('cleanConfigModal')?.classList.contains('active')) {
            if (cleanConfigCallback) cleanConfigCallback(false);
            hideCleanConfigModal();
        }
    });
}

// ==================== TEMA OSCURO ====================

function toggleTheme() {
    db.theme = db.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    save();
}
function applyTheme() {
    document.documentElement.classList.toggle('dark', db.theme === 'dark');
    document.getElementById('theme-icon').setAttribute('data-lucide', db.theme === 'light' ? 'moon' : 'sun');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== MANIPULACIÓN DE DATOS CON LÍMITES ====================

function updateVal(type, i, field, val) {
    if (field === 'n') {
        let limpio = val.toUpperCase();
        if (limpio.length > MAX_NAME_LENGTH) {
            limpio = limpio.slice(0, MAX_NAME_LENGTH);
            showToast(`El nombre se ha truncado a ${MAX_NAME_LENGTH} caracteres.`, false);
        }
        limpio = limpio.replace(/<[^>]*>/g, '');
        db[type][i][field] = limpio;
    } 
    else if (field === 'v') {
        let cleaned = val.replace(/,/g, '');
        let num = parseFloat(cleaned);
        if (isNaN(num)) num = 0;
        if (num > MAX_AMOUNT) {
            num = MAX_AMOUNT;
            showToast(`El monto no puede superar ${MAX_AMOUNT.toLocaleString()} CUP. Se ha ajustado.`, false);
        }
        if (num < 0) {
            num = 0;
            showToast("El monto no puede ser negativo. Se asignó 0.", false);
        }
        db[type][i][field] = num.toFixed(2);
    } 
    else {
        db[type][i][field] = val;
    }
    save();
}

function addRow(type) {
    const arr = db[type];
    if (arr.length >= MAX_RECORDS) {
        showToast(`Ha alcanzado el límite máximo de registros (${MAX_RECORDS}). Elimine algunos antes de añadir más.`, false);
        return false;
    }
    if (arr.length === 0) {
        const nueva = (type === 'productos') ? { n: '', v: '0', m: 'USD' } : { n: '', v: '0' };
        arr.push(nueva);
        render();
        save();
        return true;
    }
    const last = arr[arr.length - 1];
    const nameEmpty = last.n.trim() === '';
    const valueEmpty = (last.v === undefined || last.v === '0');
    if (nameEmpty && valueEmpty) {
        showToast("Debe completar el nombre y el monto de la fila actual antes de añadir otra.", false);
        return false;
    }
    if (nameEmpty || valueEmpty) {
        showToast("Complete el nombre y el monto de la fila actual antes de añadir otra.", false);
        return false;
    }
    const nueva = (type === 'productos') ? { n: '', v: '0', m: 'USD' } : { n: '', v: '0' };
    arr.push(nueva);
    render();
    save();
    return true;
}

function delRow(type, i) {
    const item = db[type][i];
    if (item.n.trim() !== '' || (item.v !== undefined && item.v !== '0')) {
        mostrarConfirmacion(`¿Eliminar el registro "${item.n || 'sin nombre'}"?`, function() {
            if (db[type].length > 1) db[type].splice(i, 1);
            else db[type] = [];
            render();
            save();
        });
        return;
    }
    if (db[type].length > 1) db[type].splice(i, 1);
    else db[type] = [];
    render();
    save();
}

function setCurrencyToUSD(productIndex) {
    db.productos[productIndex].m = 'USD';
    render();
    save();
    ensureTasa(function(ok) {});
}
function setCurrencyToCUP(productIndex) {
    db.productos[productIndex].m = 'CUP';
    render();
    save();
}

// ==================== RENDERIZADO ====================

function render() {
    const tbody = document.getElementById('tbody-productos');
    const empty = document.getElementById('empty-state');
    const table = document.getElementById('table-container');
    if (db.productos.length === 0) {
        empty.style.display = "flex";
        table.style.display = "none";
    } else {
        empty.style.display = "none";
        table.style.display = "block";
        tbody.innerHTML = db.productos.map((p, i) => {
            let rawValue = p.v !== undefined && p.v !== '' ? parseFloat(p.v) : 0;
            let displayValue = rawValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const usdActiveClass = p.m === 'USD' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400';
            const cupActiveClass = p.m === 'CUP' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400';
            return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all">
                <td class="p-5 pl-8 font-bold text-slate-700 dark:text-slate-100 text-[10px]">
                    <input type="text" placeholder="Nombre ..." onfocus="this.select()" class="w-full text-left force-uppercase" value="${escapeHtml(p.n)}" oninput="this.value = this.value.toUpperCase(); updateVal('productos', ${i}, 'n', this.value)" maxlength="50">
                </td>
                <td class="p-5 text-center">
                    <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 w-max mx-auto shadow-inner font-bold">
                        <button onclick="setCurrencyToUSD(${i})" class="px-4 py-1.5 rounded-lg text-[9px] font-black ${usdActiveClass}">USD</button>
                        <button onclick="setCurrencyToCUP(${i})" class="px-4 py-1.5 rounded-lg text-[9px] font-black ${cupActiveClass}">CUP</button>
                        <div class="flex items-center px-4 border-l dark:border-slate-800 text-slate-700 dark:text-slate-200">
                            <span class="text-slate-400 font-bold text-[12px] mr-1 font-mono">$</span>
                            <input type="text" class="money-input bg-transparent text-right outline-none w-24 font-mono-finance font-black text-[12px]" value="${displayValue}" oninput="updateVal('productos', ${i}, 'v', this.value)">
                        </div>
                    </div>
                </td>
                <td class="p-5 text-right font-mono font-bold text-slate-400 dark:text-slate-500 text-[12px]" id="p-pre-${i}">$ 0.00</td>
                <td class="p-5 text-right font-mono font-bold text-brand-600 dark:text-brand-400 text-[12px]" id="p-liq-${i}">$ 0.00</td>
                <td class="p-5 text-center"><button onclick="delRow('productos', ${i})" class="text-slate-200 hover:text-red-500 transition-all transform hover:scale-125"><i data-lucide="trash-2" class="w-5 h-5"></i></button></td>
            </tr>
            `;
        }).join('');
    }

    const renderList = (type, containerId) => {
        const container = document.getElementById(containerId);
        if (db[type].length === 0) {
            container.innerHTML = `<div class="text-center py-4 opacity-40 text-[10px] font-black uppercase tracking-widest">Sin registros</div>`;
        } else {
            container.innerHTML = db[type].map((s, i) => {
                let rawValue = s.v !== undefined && s.v !== '' ? parseFloat(s.v) : 0;
                let displayValue = rawValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `
                <div class="flex items-center gap-4 bg-slate-50 dark:bg-darkbg p-4 px-8 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand-500/20 group">
                    <input type="text" placeholder="Nombre ..." onfocus="this.select()" class="flex-grow font-bold text-slate-700 dark:text-slate-100 text-[13px] text-left outline-none min-w-0 force-uppercase" value="${escapeHtml(s.n)}" oninput="this.value = this.value.toUpperCase(); updateVal('${type}', ${i}, 'n', this.value)" maxlength="50">
                    <div class="flex items-center bg-white dark:bg-darkcard rounded-lg px-5 py-1.5 border border-slate-100 dark:border-slate-800 shadow-inner flex-shrink-0">
                        <span class="text-slate-300 dark:text-slate-700 font-bold text-[11px] mr-1">$</span>
                        <input type="text" class="money-input w-28 font-mono-finance text-[14px] font-bold outline-none text-right text-slate-800 dark:text-white" value="${displayValue}" oninput="updateVal('${type}', ${i}, 'v', this.value)">
                    </div>
                    <button onclick="delRow('${type}', ${i})" class="text-slate-200 hover:text-red-500 transition-all opacity-100 flex-shrink-0"><i data-lucide="x-circle" class="w-5 h-5"></i></button>
                </div>
                `;
            }).join('');
        }
    };
    renderList('salarios', 'list-salarios');
    renderList('gastos', 'list-gastos');

    document.getElementById('contador-productos').textContent = db.productos.length;
    document.getElementById('contador-salarios').textContent = '(' + db.salarios.length + ')';
    document.getElementById('contador-gastos').textContent = '(' + db.gastos.length + ')';

    const inventoryHeader = document.getElementById('inventory-header');
    if (inventoryHeader) {
        if (db.productos.length === 0) inventoryHeader.classList.add('empty-mode');
        else inventoryHeader.classList.remove('empty-mode');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== ACCIONES PRINCIPALES ====================

function limpiarConfig() {
    if (cleanConfigCallback) {
        hideCleanConfigModal();
        cleanConfigCallback = null;
    }
    showCleanConfigModal();
    cleanConfigCallback = function(aceptar) {
        if (aceptar) {
            document.getElementById('cfg-tasa').value = '';
            document.getElementById('cfg-util').value = '';
            document.getElementById('cfg-efec').value = '';
            db.config.tasa = '';
            db.config.util = '';
            db.config.efec = '';
            save();
            document.getElementById('dash-precio').innerText = '$ 0.00';
            document.getElementById('dash-bruta').innerText = '$ 0.00';
            document.getElementById('dash-ganancia').innerText = '$ 0.00';
            document.getElementById('dash-tax').innerText = '$ 0.00';
            document.getElementById('dash-costo').innerText = '$ 0.00';
            document.getElementById('tax-10-val').innerText = '$ 0.00';
            document.getElementById('tax-5-val').innerText = '$ 0.00';
            document.getElementById('tax-15-val').innerText = '$ 0.00';
            document.getElementById('p-final-val').innerText = '$ 0.00';
            showToast('Configuración reiniciada.', true);
        }
        cleanConfigCallback = null;
        hideCleanConfigModal();
    };
}

function calcularTodoTrigger() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    let hayError = false;

    for (let i = 0; i < db.productos.length; i++) {
        const p = db.productos[i];
        const fila = document.querySelector(`#tbody-productos tr:nth-child(${i + 1})`);
        if (fila) {
            const nombreInput = fila.querySelector('td:first-child input');
            const montoInput = fila.querySelector('.money-input');
            if (!p.n?.trim()) {
                if (nombreInput) nombreInput.classList.add('input-error');
                hayError = true;
            }
            const montoVal = p.v !== undefined && p.v !== '' ? parseFloat(p.v) : null;
            if (montoVal === null || isNaN(montoVal) || montoVal <= 0) {
                if (montoInput) montoInput.classList.add('input-error');
                hayError = true;
            }
        }
    }
    for (let i = 0; i < db.salarios.length; i++) {
        const s = db.salarios[i];
        const grupo = document.querySelector(`#list-salarios .group:nth-child(${i + 1})`);
        if (grupo) {
            const nombreInput = grupo.querySelector('input:first-child');
            const montoInput = grupo.querySelector('.money-input');
            if (!s.n?.trim()) {
                if (nombreInput) nombreInput.classList.add('input-error');
                hayError = true;
            }
            const montoVal = s.v !== undefined && s.v !== '' ? parseFloat(s.v) : null;
            if (montoVal === null || isNaN(montoVal) || montoVal <= 0) {
                if (montoInput) montoInput.classList.add('input-error');
                hayError = true;
            }
        }
    }
    for (let i = 0; i < db.gastos.length; i++) {
        const g = db.gastos[i];
        const grupo = document.querySelector(`#list-gastos .group:nth-child(${i + 1})`);
        if (grupo) {
            const nombreInput = grupo.querySelector('input:first-child');
            const montoInput = grupo.querySelector('.money-input');
            if (!g.n?.trim()) {
                if (nombreInput) nombreInput.classList.add('input-error');
                hayError = true;
            }
            const montoVal = g.v !== undefined && g.v !== '' ? parseFloat(g.v) : null;
            if (montoVal === null || isNaN(montoVal) || montoVal <= 0) {
                if (montoInput) montoInput.classList.add('input-error');
                hayError = true;
            }
        }
    }

    if (hayError) {
        showToast("Complete los campos resaltados en rojo.", false);
        return;
    }

    const hayUSD = db.productos.some(p => p.m === 'USD' && parseFloat(p.v) > 0);
    if (hayUSD) {
        ensureTasa(function(ok) {
            if (!ok) {
                showToast("Cálculo cancelado: falta la tasa cambiaria.", false);
                return;
            }
            realizarCalculo();
        });
    } else {
        realizarCalculo();
    }
}

function realizarCalculo() {
    db.config.tasa = document.getElementById('cfg-tasa').value;
    db.config.util = document.getElementById('cfg-util').value;
    db.config.efec = document.getElementById('cfg-efec').value;
    const t = parseFloat(db.config.tasa) || 0;
    const u = (parseFloat(db.config.util) || 0) / 100;
    const e = (parseFloat(db.config.efec) || 0) / 100;

    const totalExtrasVal = db.salarios.reduce((acc, s) => acc + (parseFloat(s.v) || 0), 0) + db.gastos.reduce((acc, g) => acc + (parseFloat(g.v) || 0), 0);
    if (db.productos.length === 0 && totalExtrasVal === 0) {
        showToast("No hay datos para calcular.", false);
        return;
    }
    if (db.productos.some(p => p.m === 'USD' && parseFloat(p.v) > 0) && t <= 0) {
        showToast("Introduzca la Tasa para el USD", false);
        return;
    }

    let totalBaseEfe = 0;
    db.productos.forEach(p => {
        const valRaw = parseFloat(p.v) || 0;
        let base = (p.m === 'USD') ? (valRaw * t) : valRaw;
        totalBaseEfe += base * (1 + e);
    });
    const totalOpBase = totalBaseEfe + (totalExtrasVal * (1 + e));
    const preTaxG = ((totalOpBase * (1 + u)) + (totalOpBase / (1 - (u >= 1 ? 0.99 : u)))) / 2;

    db.productos.forEach((p, i) => {
        const valRaw = parseFloat(p.v) || 0;
        if (valRaw <= 0) return;
        let base = (p.m === 'USD') ? (valRaw * t) : valRaw;
        const costEfe = base * (1 + e);
        const mu = costEfe * (1 + u);
        const ma = costEfe / (1 - (u >= 1 ? 0.99 : u));
        const preTax = (mu + ma) / 2;
        const liq = preTax + (preTax * 0.10) + (Math.max(0, preTax - 3260) * 0.05) + (preTax * 0.10);
        document.getElementById(`p-pre-${i}`).innerText = fmt.format(preTax);
        document.getElementById(`p-liq-${i}`).innerText = fmt.format(liq);
    });

    const tax10 = preTaxG * 0.10;
    const tax5 = Math.max(0, preTaxG - 3260) * 0.05;
    const tax10Anual = preTaxG * 0.10;
    const taxTotal = tax10 + tax5 + tax10Anual;
    const finalLiq = preTaxG + taxTotal;
    const utilidadBruta = finalLiq - totalOpBase;

    document.getElementById('dash-precio').innerText = fmt.format(finalLiq);
    document.getElementById('dash-bruta').innerText = fmt.format(utilidadBruta);
    document.getElementById('dash-ganancia').innerText = fmt.format(finalLiq - totalOpBase);
    document.getElementById('dash-tax').innerText = fmt.format(taxTotal);
    document.getElementById('dash-costo').innerText = fmt.format(totalOpBase);
    document.getElementById('tax-10-val').innerText = fmt.format(tax10);
    document.getElementById('tax-5-val').innerText = fmt.format(tax5);
    document.getElementById('tax-15-val').innerText = fmt.format(tax10Anual);
    document.getElementById('p-final-val').innerText = fmt.format(finalLiq);
    showToast("✓ Análisis procesado con éxito.");
    save();
}

function generarFactura() {
    const validProducts = db.productos.filter(p => p.n.trim() !== "" && parseFloat(p.v) > 0);
    if (validProducts.length === 0) {
        showToast("No hay productos válidos para exportar.", false);
        return;
    }
    document.getElementById('inv-date').innerText = new Date().toLocaleDateString();
    document.getElementById('inv-ref').innerText = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('inv-tasa').innerText = db.config.tasa || '0.00';
    const t = parseFloat(db.config.tasa) || 0;
    const u = (parseFloat(db.config.util) || 0) / 100;
    const e = (parseFloat(db.config.efec) || 0) / 100;
    document.getElementById('inv-body').innerHTML = validProducts.map(p => {
        let base = (p.m === 'USD') ? (parseFloat(p.v) * t) : parseFloat(p.v);
        const costEfe = base * (1 + e);
        const preTax = ((costEfe * (1 + u)) + (costEfe / (1 - (u >= 1 ? 0.99 : u)))) / 2;
        const final = preTax + (preTax * 0.10) + (Math.max(0, preTax - 3260) * 0.05) + (preTax * 0.10);
        return `<tr><td class="p-6 uppercase text-[11px] font-black tracking-widest">${escapeHtml(p.n)}</td><td class="p-6 text-right font-mono-finance text-blue-700">${fmt.format(final)}</td></tr>`;
    }).join('');
    document.getElementById('inv-total').innerText = document.getElementById('dash-precio').innerText;
    window.print();
}

function openResetModal() { document.getElementById('resetModal').classList.add('active'); }
function closeResetModal() { document.getElementById('resetModal').classList.remove('active'); }
function confirmReset() { localStorage.removeItem('finance_v65_itech'); location.reload(); }

// ==================== CONFIRMACIÓN PARA ELIMINAR ====================

let confirmToastCallback = null;
let confirmToastTimer = null;

function mostrarConfirmacion(mensaje, onConfirm) {
    const container = document.getElementById('confirm-toast-container');
    if (!container) {
        if (confirm(mensaje)) onConfirm();
        return;
    }
    document.getElementById('confirm-toast-message').innerText = mensaje;
    confirmToastCallback = onConfirm;
    container.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    clearTimeout(confirmToastTimer);
    confirmToastTimer = setTimeout(ocultarConfirmacion, 8000);
}

function ocultarConfirmacion() {
    const container = document.getElementById('confirm-toast-container');
    if (container) container.style.display = 'none';
    confirmToastCallback = null;
    clearTimeout(confirmToastTimer);
}

document.addEventListener('DOMContentLoaded', function() {
    const cancelBtn = document.getElementById('confirm-toast-cancel');
    const deleteBtn = document.getElementById('confirm-toast-delete');
    if (cancelBtn && deleteBtn) {
        cancelBtn.addEventListener('click', ocultarConfirmacion);
        deleteBtn.addEventListener('click', function() {
            if (confirmToastCallback) {
                confirmToastCallback();
                showToast('Registro eliminado correctamente.', true);
            }
            ocultarConfirmacion();
        });
    }
});

// ==================== CIERRE DE SESIÓN ====================

function logout() {
    try {
        localStorage.removeItem('it_sesion');
        localStorage.removeItem('it_user');
        localStorage.removeItem('it_expires');
        sessionStorage.removeItem('it_sesion');
        sessionStorage.removeItem('it_user');
    } catch(e) {
        console.warn("No se pudo limpiar el almacenamiento", e);
    }
    window.location.href = 'index.html';
}
window.logout = logout;

// ==================== EVENTOS GLOBALES E INICIO ====================

function iniciar() {
    // Verificar autenticación antes de cargar la app
    checkAuthAndRedirect();

    if (typeof lucide !== 'undefined') lucide.createIcons();
    loadFromStorage();
    applyTheme();
    render();

    // Validar campos de configuración (no negativos)
    const tasaInput = document.getElementById('cfg-tasa');
    const utilInput = document.getElementById('cfg-util');
    const efecInput = document.getElementById('cfg-efec');

    function validateNonNegative(input, fieldName, allowZero = true) {
        if (!input) return;
        input.addEventListener('input', function(e) {
            let val = e.target.value;
            val = val.replace(/[^0-9.]/g, '');
            const partes = val.split('.');
            if (partes.length > 2) val = partes[0] + '.' + partes.slice(1).join('');
            e.target.value = val;
        });
        input.addEventListener('blur', function(e) {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) {
                e.target.value = '';
                return;
            }
            if (val < 0) {
                showToast(`El campo "${fieldName}" no puede ser negativo. Se ha establecido a 0.`, false);
                e.target.value = '0';
                if (fieldName === 'Tasa Cambiaria') db.config.tasa = '0';
                else if (fieldName === 'Utilidad %') db.config.util = '0';
                else if (fieldName === 'Efectivo %') db.config.efec = '0';
                save();
            } else if (val.toString() !== e.target.value) {
                e.target.value = val.toString();
            }
        });
    }

    validateNonNegative(tasaInput, 'Tasa Cambiaria');
    validateNonNegative(utilInput, 'Utilidad %');
    validateNonNegative(efecInput, 'Efectivo %');

    // Resto de eventos (focusin, blur, input, keydown) igual que antes
    document.body.addEventListener('focusin', function(e) {
        const el = e.target;
        if (el.classList && el.classList.contains('money-input')) {
            let raw = el.value.replace(/,/g, '');
            let num = parseFloat(raw);
            if (!isNaN(num)) el.value = num.toFixed(2);
            else el.value = '';
            setTimeout(() => el.select(), 10);
        }
    });

    document.body.addEventListener('blur', function(e) {
        const el = e.target;
        if (el.classList && el.classList.contains('money-input')) formatMoneyField(el);
    });

    document.body.addEventListener('input', function(e) {
        const el = e.target;
        if (el.classList && el.classList.contains('money-input')) {
            let val = el.value;
            val = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
            if (val !== '' && !isNaN(parseFloat(val))) el.value = val;
            else if (val === '') el.value = '';
            else el.value = '';
        }
    });

    document.body.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const target = e.target;
            const isProductField = target.closest('#tbody-productos') !== null;
            const isSalaryField = target.closest('#list-salarios') !== null;
            const isExpenseField = target.closest('#list-gastos') !== null;

            if (isProductField) {
                e.preventDefault();
                const row = target.closest('tr');
                if (!row) return;
                let productIndex = -1;
                for (let i = 0; i < db.productos.length; i++) {
                    const preElem = document.getElementById(`p-pre-${i}`);
                    if (preElem && preElem.closest('tr') === row) {
                        productIndex = i;
                        break;
                    }
                }
                if (productIndex === -1) return;
                const product = db.productos[productIndex];
                const nombre = product.n?.trim();
                const montoVal = product.v !== undefined && product.v !== '' ? parseFloat(product.v) : null;
                if (!nombre) {
                    showToast("Complete el nombre del producto.", false);
                    return;
                }
                if (montoVal === null || isNaN(montoVal) || montoVal <= 0) {
                    showToast("Ingrese un monto válido.", false);
                    return;
                }
                if (product.m === 'USD') {
                    ensureTasa(function(ok) {
                        if (ok) {
                            if (target.classList && target.classList.contains('money-input')) formatMoneyField(target);
                            else target.blur();
                            showToast("✓ Guardado", true);
                        }
                    });
                } else {
                    if (target.classList && target.classList.contains('money-input')) formatMoneyField(target);
                    else target.blur();
                    showToast("✓ Guardado", true);
                }
            } else if (isSalaryField || isExpenseField) {
                e.preventDefault();
                const container = target.closest('.group');
                if (!container) return;
                const nombreInput = container.querySelector('input:first-child');
                const montoInput = container.querySelector('.money-input');
                const nombre = nombreInput ? nombreInput.value.trim() : '';
                const montoRaw = montoInput ? montoInput.value.replace(/,/g, '') : '';
                const montoNum = parseFloat(montoRaw);
                if (!nombre) {
                    showToast("Complete el nombre.", false);
                    return;
                }
                if (isNaN(montoNum) || montoNum <= 0) {
                    showToast("Ingrese un monto válido.", false);
                    return;
                }
                if (target.classList && target.classList.contains('money-input')) formatMoneyField(target);
                else target.blur();
                showToast("✓ Guardado", true);
            }
        }
    });

    const okBtn = document.getElementById('missingTasaOk');
    if (okBtn) okBtn.addEventListener('click', () => hideMissingTasaAlert());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('missingTasaModal')?.classList.contains('active')) {
            hideMissingTasaAlert();
        }
    });

    setupCleanConfigModal();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

// Exponer funciones globales
window.calcularTodoTrigger = calcularTodoTrigger;
window.toggleTheme = toggleTheme;
window.limpiarConfig = limpiarConfig;
window.openResetModal = openResetModal;
window.closeResetModal = closeResetModal;
window.confirmReset = confirmReset;
window.generarFactura = generarFactura;
window.addRow = addRow;
window.delRow = delRow;
window.setCurrencyToUSD = setCurrencyToUSD;
window.setCurrencyToCUP = setCurrencyToCUP;
window.updateVal = updateVal;