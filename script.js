const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('monthYearDisplay');
const modal = document.getElementById('dataModal');
const closeModal = document.getElementById('closeModal');
const form = document.getElementById('incomeForm');
const dailyTotalDisplay = document.getElementById('dailyTotal');
const monthlyTotalDisplay = document.getElementById('monthlyTotalDisplay');
const dailyExpenseDisplay = document.getElementById('dailyExpense');
const monthlyExpenseDisplay = document.getElementById('monthlyExpenseDisplay');

const inputs = {
    grab: document.getElementById('grabIncome'),
    outside: document.getElementById('outsideIncome'),
    tip: document.getElementById('tipIncome'),
    gas: document.getElementById('gasExpense'),
    food: document.getElementById('foodExpense'),
    haoMon: document.getElementById('haoMonExpense')
};

let currentDate = new Date();

const API_URL = 'https://thongke-vkkp.onrender.com';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

async function getDatabaseFromServer() {
    try {
        const response = await fetch(`${API_URL}/api/income`);
        const data = await response.json();
        
        const db = {};
        data.forEach(item => {
            db[item.record_date] = item;
        });
        
        localStorage.setItem('grab_cache_db', JSON.stringify(db));
        return db;
    } catch (error) {
        console.error("Loi khi lay du lieu:", error);
        return null;
    }
}

function getDatabaseFromCache() {
    const cache = localStorage.getItem('grab_cache_db');
    return cache ? JSON.parse(cache) : {};
}

function drawCalendarCells(db, year, month, daysInMonth, firstDay) {
    calendarGrid.innerHTML = '';
    
    let monthlyTotal = 0;
    let monthlyGas = 0;
    let monthlyFood = 0;
    let monthlyHaoMon = 0;
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        dayCell.textContent = day;
        
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (db[dateString]) {
            dayCell.classList.add('has-data');
            const incomeDiv = document.createElement('div');
            incomeDiv.className = 'day-income';
            
            incomeDiv.textContent = db[dateString].total.toLocaleString('vi-VN');
            
            dayCell.appendChild(incomeDiv);

            if (dateString.startsWith(currentMonthPrefix)) {
                monthlyTotal += db[dateString].total;
                monthlyGas += (db[dateString].gas || 0);
                monthlyFood += (db[dateString].food || 0);
                monthlyHaoMon += (db[dateString].hao_mon || 0);
            }
        }

        dayCell.addEventListener('click', function() {
            openModal(dateString, db[dateString]);
        });

        calendarGrid.appendChild(dayCell);
    }

    monthlyTotalDisplay.innerHTML = `Tổng thu nhập tháng ${month + 1}: <span class="money-highlight">${monthlyTotal.toLocaleString('vi-VN')} VND</span>`;
    
    if (monthlyExpenseDisplay) {
        monthlyExpenseDisplay.innerHTML = `Tiền xăng tháng: <span class="expense-highlight">${monthlyGas.toLocaleString('vi-VN')} VND</span><br>Tiền ăn tháng: <span class="expense-highlight">${monthlyFood.toLocaleString('vi-VN')} VND</span><br>Hao mòn xe tháng: <span class="expense-highlight">${monthlyHaoMon.toLocaleString('vi-VN')} VND</span>`;
    }
}

async function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    monthYearDisplay.textContent = `Tháng ${month + 1} - ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const cachedDb = getDatabaseFromCache();
    drawCalendarCells(cachedDb, year, month, daysInMonth, firstDay);
    
    const freshDb = await getDatabaseFromServer();
    if (freshDb) {
        drawCalendarCells(freshDb, year, month, daysInMonth, firstDay);
    }
}

function calculateTotal() {
    const grab = Number(inputs.grab.value) || 0;
    const outside = Number(inputs.outside.value) || 0;
    const tip = Number(inputs.tip.value) || 0;
    const gas = Number(inputs.gas.value) || 0;
    const food = Number(inputs.food.value) || 0;
    const haoMon = Number(inputs.haoMon.value) || 0;

    const expense = gas + food + haoMon;
    const total = (grab + tip + outside) - expense;
    
    dailyTotalDisplay.textContent = total.toLocaleString('vi-VN'); 
    
    if (dailyExpenseDisplay) {
        dailyExpenseDisplay.innerHTML = `Tiền xăng: ${gas.toLocaleString('vi-VN')} VND <br> Tiền ăn: ${food.toLocaleString('vi-VN')} VND <br> Hao mòn xe: ${haoMon.toLocaleString('vi-VN')} VND`;
    }
    
    return total;
}

Object.values(inputs).forEach(input => {
    input.addEventListener('input', calculateTotal);
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
    
    const dateString = document.getElementById('selectedDate').value;
    const total = calculateTotal();
    const grab = Number(inputs.grab.value) || 0;
    const outside = Number(inputs.outside.value) || 0;
    const tip = Number(inputs.tip.value) || 0;
    const gas = Number(inputs.gas.value) || 0;
    const food = Number(inputs.food.value) || 0;
    const haoMon = Number(inputs.haoMon.value) || 0;
    
    const requestData = {
        record_date: dateString,
        grab: grab,
        outside: outside,
        tip: tip,
        gas: gas,
        food: food,
        hao_mon: haoMon,
        total: total
    };
    
    const currentCache = getDatabaseFromCache();
    currentCache[dateString] = requestData;
    localStorage.setItem('grab_cache_db', JSON.stringify(currentCache));
    
    modal.style.display = 'none';
    renderCalendar(currentDate); 
    
    try {
        await fetch(`${API_URL}/api/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        getDatabaseFromServer(); 
    } catch (error) {
        console.error("Loi khi luu du lieu:", error);
    }
});

document.getElementById('deleteBtn').addEventListener('click', async function() {
    const dateString = document.getElementById('selectedDate').value;
    
    const currentCache = getDatabaseFromCache();
    delete currentCache[dateString];
    localStorage.setItem('grab_cache_db', JSON.stringify(currentCache));
    
    modal.style.display = 'none';
    renderCalendar(currentDate); 

    try {
        await fetch(`${API_URL}/api/income/${dateString}`, {
            method: 'DELETE'
        });
        getDatabaseFromServer();
    } catch (error) {
        console.error("Loi khi xoa du lieu:", error);
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