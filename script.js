const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('monthYearDisplay');
const modal = document.getElementById('dataModal');
const closeModal = document.getElementById('closeModal');
const form = document.getElementById('incomeForm');
const dailyTotalDisplay = document.getElementById('dailyTotal');
const monthlyGrossDisplay = document.getElementById('monthlyGrossDisplay');
const monthlyTotalDisplay = document.getElementById('monthlyTotalDisplay');
const monthlyExpenseDisplay = document.getElementById('monthlyExpenseDisplay');
const loadingOverlay = document.getElementById('loadingOverlay');

const inputActionModal = document.getElementById('inputActionModal');
const inputActionTitle = document.getElementById('inputActionTitle');
const quickInput = document.getElementById('quickInput');
const btnChinhSua = document.getElementById('btnChinhSua');
const btnCongThem = document.getElementById('btnCongThem');
const closeInputAction = document.getElementById('closeInputAction');

const inputs = {
    grab: document.getElementById('grabIncome'),
    outside: document.getElementById('outsideIncome'),
    tip: document.getElementById('tipIncome'),
    gas: document.getElementById('gasExpense'),
    food: document.getElementById('foodExpense'),
    haoMon: document.getElementById('haoMonExpense'),
    other: document.getElementById('otherExpense')
};

let currentDate = new Date();
let currentActiveInput = null;

const API_URL = 'https://thongke-vkkp.onrender.com';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

async function getDatabaseFromServer(year, month) {
    try {
        const response = await fetch(`${API_URL}/api/income?year=${year}&month=${month}`, {
            cache: 'no-store'
        });
        const data = await response.json();
        
        const db = getDatabaseFromCache();
        data.forEach(item => {
            db[item.record_date] = item;
        });
        
        localStorage.setItem('grab_cache_db', JSON.stringify(db));
        return db;
    } catch (error) {
        return null;
    }
}

function getDatabaseFromCache() {
    const cache = localStorage.getItem('grab_cache_db');
    return cache ? JSON.parse(cache) : {};
}

function drawCalendarCells(db, year, month, daysInMonth, firstDay) {
    calendarGrid.innerHTML = '';
    
    let monthlyGross = 0;
    let monthlyTotal = 0;
    let monthlyGas = 0;
    let monthlyFood = 0;
    let monthlyHaoMon = 0;
    let monthlyOther = 0;
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const startDay = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.className = 'day-number';
        dayNumberSpan.textContent = day;
        dayCell.appendChild(dayNumberSpan);
        
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (db[dateString]) {
            const total = db[dateString].total;
            const cellDate = new Date(year, month, day);
            const cellDayOfWeek = cellDate.getDay(); 
            
            const grossDay = (db[dateString].grab || 0) + (db[dateString].outside || 0) + (db[dateString].tip || 0);

            if (cellDayOfWeek === 0 || cellDayOfWeek === 6) {
                if (total >= 700000) dayCell.classList.add('bg-red');
                else dayCell.classList.add('bg-blue');
            } else {
                if (total >= 500000) dayCell.classList.add('bg-red');
                else dayCell.classList.add('bg-blue');
            }

            const grossDiv = document.createElement('div');
            grossDiv.className = 'day-gross';
            grossDiv.textContent = grossDay.toLocaleString('vi-VN');
            dayCell.appendChild(grossDiv);

            const incomeDiv = document.createElement('div');
            incomeDiv.className = 'day-income';
            incomeDiv.textContent = total.toLocaleString('vi-VN');
            dayCell.appendChild(incomeDiv);

            if (dateString.startsWith(currentMonthPrefix)) {
                const expenseDay = (db[dateString].gas || 0) + (db[dateString].food || 0) + (db[dateString].hao_mon || 0) + (db[dateString].other_expense || 0);
                
                monthlyGross += grossDay;
                monthlyTotal += (grossDay - expenseDay); 
                
                monthlyGas += (db[dateString].gas || 0);
                monthlyFood += (db[dateString].food || 0);
                monthlyHaoMon += (db[dateString].hao_mon || 0);
                monthlyOther += (db[dateString].other_expense || 0);
            }
        }

        dayCell.addEventListener('click', function() {
            openModal(dateString, db[dateString]);
        });

        calendarGrid.appendChild(dayCell);
    }

    if (monthlyGrossDisplay) {
        monthlyGrossDisplay.innerHTML = `Tổng thu nhập tháng ${month + 1} (chưa trừ chi phí): <span class="money-highlight">${monthlyGross.toLocaleString('vi-VN')} VND</span>`;
    }

    monthlyTotalDisplay.innerHTML = `Tổng thu nhập tháng ${month + 1}: <span class="money-highlight">${monthlyTotal.toLocaleString('vi-VN')} VND</span>`;
    
    if (monthlyExpenseDisplay) {
        const totalMonthlyExpense = monthlyGas + monthlyFood + monthlyHaoMon + monthlyOther;
        
        monthlyExpenseDisplay.innerHTML = `
            <strong>Tổng chi phí tháng: <span class="expense-highlight" style="color:#d32f2f; font-size:18px;">${totalMonthlyExpense.toLocaleString('vi-VN')} VND</span></strong>
            <br>-----------------------------------<br>
            Tiền xăng tháng: <span class="expense-highlight">${monthlyGas.toLocaleString('vi-VN')} VND</span><br>
            Tiền ăn tháng: <span class="expense-highlight">${monthlyFood.toLocaleString('vi-VN')} VND</span><br>
            Hao mòn xe tháng: <span class="expense-highlight">${monthlyHaoMon.toLocaleString('vi-VN')} VND</span><br>
            Chi phí khác tháng: <span class="expense-highlight">${monthlyOther.toLocaleString('vi-VN')} VND</span>
        `;
    }
}

async function renderCalendar(date) {
    showLoading();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    monthYearDisplay.textContent = `Tháng ${month + 1} - ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const cachedDb = getDatabaseFromCache();
    drawCalendarCells(cachedDb, year, month, daysInMonth, firstDay);
    
    const freshDb = await getDatabaseFromServer(year, month + 1);
    if (freshDb) {
        drawCalendarCells(freshDb, year, month, daysInMonth, firstDay);
    }
    hideLoading();
}

function calculateTotal() {
    const grab = Number(inputs.grab.value) || 0;
    const outside = Number(inputs.outside.value) || 0;
    const tip = Number(inputs.tip.value) || 0;
    const gas = Number(inputs.gas.value) || 0;
    const food = Number(inputs.food.value) || 0;

    const expense = gas + food;
    const total = (grab + tip + outside) - expense;
    
    dailyTotalDisplay.textContent = total.toLocaleString('vi-VN'); 
    
    return total;
}

Object.values(inputs).forEach(input => {
    input.addEventListener('click', (e) => {
        currentActiveInput = e.target;
        const label = e.target.previousElementSibling.textContent;
        inputActionTitle.textContent = label;
        quickInput.value = '';
        inputActionModal.style.display = 'block';
        quickInput.focus();
    });
});

btnChinhSua.addEventListener('click', () => {
    if (currentActiveInput) {
        currentActiveInput.value = (Number(quickInput.value) || 0) * 1000;
        calculateTotal();
    }
    inputActionModal.style.display = 'none';
});

btnCongThem.addEventListener('click', () => {
    if (currentActiveInput) {
        const currentVal = Number(currentActiveInput.value) || 0;
        const addVal = (Number(quickInput.value) || 0) * 1000;
        currentActiveInput.value = currentVal + addVal;
        calculateTotal();
    }
    inputActionModal.style.display = 'none';
});

closeInputAction.addEventListener('click', () => {
    inputActionModal.style.display = 'none';
});

function openModal(dateString, existingData) {
    document.getElementById('modalDateTitle').textContent = `Nhập liệu ngày: ${dateString}`;
    document.getElementById('selectedDate').value = dateString;

    if (existingData) {
        inputs.grab.value = existingData.grab || 0;
        inputs.outside.value = existingData.outside || 0;
        inputs.tip.value = existingData.tip || 0;
        inputs.gas.value = existingData.gas || 0;
        inputs.food.value = existingData.food || 0;
        inputs.haoMon.value = existingData.hao_mon || 0;
        inputs.other.value = existingData.other_expense || 0;
    } else {
        form.reset();
        Object.values(inputs).forEach(input => input.value = 0);
    }

    calculateTotal();
    modal.style.display = 'block';
}

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

form.addEventListener('submit', async function(e) {
    e.preventDefault(); 
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Đang lưu...';
    saveBtn.disabled = true;
    showLoading();

    const dateString = document.getElementById('selectedDate').value;
    const total = calculateTotal();
    const grab = Number(inputs.grab.value) || 0;
    const outside = Number(inputs.outside.value) || 0;
    const tip = Number(inputs.tip.value) || 0;
    const gas = Number(inputs.gas.value) || 0;
    const food = Number(inputs.food.value) || 0;
    const haoMon = Number(inputs.haoMon.value) || 0;
    const other = Number(inputs.other.value) || 0;
    
    const requestData = {
        record_date: dateString,
        grab: grab,
        outside: outside,
        tip: tip,
        gas: gas,
        food: food,
        hao_mon: haoMon,
        other_expense: other,
        total: total
    };
    
    try {
        const response = await fetch(`${API_URL}/api/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const currentCache = getDatabaseFromCache();
            currentCache[dateString] = requestData;
            localStorage.setItem('grab_cache_db', JSON.stringify(currentCache));
            
            modal.style.display = 'none';
            await renderCalendar(currentDate);
        } else {
            alert('Lưu thất bại từ máy chủ');
        }
    } catch (error) {
        alert('Lỗi kết nối mạng, vui lòng kiểm tra lại');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        hideLoading();
    }
});

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
});

renderCalendar(currentDate);