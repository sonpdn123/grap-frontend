const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('monthYearDisplay');
const modal = document.getElementById('dataModal');
const closeModal = document.getElementById('closeModal');
const form = document.getElementById('incomeForm');
const dailyTotalDisplay = document.getElementById('dailyTotal');

const inputs = {
    grab: document.getElementById('grabIncome'),
    outside: document.getElementById('outsideIncome'),
    tip: document.getElementById('tipIncome'),
    gas: document.getElementById('gasExpense'),
    food: document.getElementById('foodExpense')
};

let currentDate = new Date();

// BƯỚC THAY LINK: Hãy thay đường dẫn dưới đây bằng link thật Render cấp cho bạn
const API_URL = 'https://thongke-vkkp.onrender.com';

// LUỒNG LOGIC MỚI: Lấy dữ liệu từ Database thông qua Server Render
async function getDatabase() {
    try {
        const response = await fetch(`${API_URL}/api/income`);
        const data = await response.json();
        
        // Chuyển đổi mảng từ database trả về dạng Object { '2026-05-27': {...} } 
        // để giữ nguyên cấu trúc logic xử lý lịch ở phía dưới mà không cần sửa code hiển thị
        const db = {};
        data.forEach(item => {
            db[item.record_date] = item;
        });
        return db;
    } catch (error) {
        console.error("Loi khi lay du lieu tu Render:", error);
        return {};
    }
}

// Thêm từ khóa async vì hàm này phải đợi hàm getDatabase() chạy xong
async function renderCalendar(date) {
    calendarGrid.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    monthYearDisplay.textContent = `Thang ${month + 1} - ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const db = await getDatabase();

    let monthlyTotal = 0;
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
            
            // Vi tri 1: Them 'vi-VN' cho so tien tren tung o lich
            incomeDiv.textContent = db[dateString].total.toLocaleString('vi-VN') + ' VND';
            
            dayCell.appendChild(incomeDiv);

            if (dateString.startsWith(currentMonthPrefix)) {
                monthlyTotal += db[dateString].total;
            }
        }

        dayCell.addEventListener('click', function() {
            openModal(dateString, db[dateString]);
        });

        calendarGrid.appendChild(dayCell);
    }

    // Vi tri 2: Them 'vi-VN' cho dong tong thu nhap ca thang
    monthlyTotalDisplay.textContent = `Tong thu nhap thang ${month + 1}: ${monthlyTotal.toLocaleString('vi-VN')} VND`;
}

function calculateTotal() {
    const grab = Number(inputs.grab.value) || 0;
    const outside = Number(inputs.outside.value) || 0;
    const tip = Number(inputs.tip.value) || 0;
    const gas = Number(inputs.gas.value) || 0;
    const food = Number(inputs.food.value) || 0;

    const total = (grab + tip + outside) - (gas + food);
    // Them 'vi-VN' vao trong ngoac
    dailyTotalDisplay.textContent = total.toLocaleString('vi-VN')  ; 
    return total;
}

Object.values(inputs).forEach(input => {
    input.addEventListener('input', calculateTotal);
});

function openModal(dateString, existingData) {
    document.getElementById('modalDateTitle').textContent = `Nhap lieu ngay: ${dateString}`;
    document.getElementById('selectedDate').value = dateString;

    if (existingData) {
        inputs.grab.value = existingData.grab;
        inputs.outside.value = existingData.outside;
        inputs.tip.value = existingData.tip;
        inputs.gas.value = existingData.gas;
        inputs.food.value = existingData.food;
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

// LUỒNG LOGIC MỚI: Thêm/Sửa dữ liệu lên Database thông qua phương thức POST
form.addEventListener('submit', async function(e) {
    e.preventDefault(); 
    
    const dateString = document.getElementById('selectedDate').value;
    const total = calculateTotal();
    
    const requestData = {
        record_date: dateString,
        grab: Number(inputs.grab.value),
        outside: Number(inputs.outside.value),
        tip: Number(inputs.tip.value),
        gas: Number(inputs.gas.value),
        food: Number(inputs.food.value),
        total: total
    };
    
    try {
        // Gửi dữ liệu lên API Render
        await fetch(`${API_URL}/api/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
    } catch (error) {
        console.error("Loi khi luu du lieu:", error);
    }
    
    modal.style.display = 'none';
    renderCalendar(currentDate); 
});

// LUỒNG LOGIC MỚI: Xóa dữ liệu khỏi Database thông qua phương thức DELETE
document.getElementById('deleteBtn').addEventListener('click', async function() {
    const dateString = document.getElementById('selectedDate').value;
    
    try {
        // Gửi yêu cầu xóa tới đúng endpoint của ngày đã chọn
        await fetch(`${API_URL}/api/income/${dateString}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error("Loi khi xoa du lieu:", error);
    }
        
    modal.style.display = 'none';
    renderCalendar(currentDate); 
});

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
});
const monthlyTotalDisplay = document.getElementById('monthlyTotalDisplay');
// Kích hoạt vẽ lịch lần đầu tiên khi tải trang
renderCalendar(currentDate);