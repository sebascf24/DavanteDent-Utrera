// ==========================================================
// I. INICIALIZACIÓN Y CONSTANTES
// ==========================================================
const STORAGE_KEY = 'davanteDentCitas';
const citaForm = document.getElementById('citaForm');
const citasBody = document.getElementById('citasBody');
const guardarBtn = document.getElementById('guardarBtn');
const limpiarBtn = document.getElementById('limpiarBtn');

// Verificación inicial de elementos
if (!citaForm || !citasBody || !guardarBtn) {
    console.error("ERROR CRÍTICO: No se encontraron elementos DOM esenciales.");
}

// ==========================================================
// II. MANEJO DE LOCAL STORAGE
// ==========================================================

function getCitas() {
    try {
        const citasJson = localStorage.getItem(STORAGE_KEY);
        return citasJson ? JSON.parse(citasJson) : [];
    } catch (error) {
        console.error("Error al leer de LocalStorage:", error);
        return [];
    }
}

function saveCitas(citas) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
    } catch (error) {
        console.error("Error al guardar en LocalStorage:", error);
        alert("No se pudo guardar. El almacenamiento podría estar lleno.");
    }
}

// ==========================================================
// III. VALIDACIÓN DE REGLAS DE NEGOCIO
// ==========================================================

function validateForm(data) {
    const errors = {};
    let isValid = true;

    // Limpiar estilos y mensajes previos
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('input, textarea').forEach(el => el.classList.remove('input-error'));

    if (!data.fechaCita) {
        errors.fechaCita = 'La fecha y hora son obligatorias.';
        isValid = false;
    } else {
        const citaDate = new Date(data.fechaCita);
        const ahora = new Date();
        
        // 1. Futuro
        if (citaDate < ahora) {
            errors.fechaCita = 'La cita debe ser en el futuro.';
            isValid = false;
        }
        
        // 2. Lunes a Viernes (0=Dom, 6=Sab)
        const day = citaDate.getDay(); 
        if (day === 0 || day === 6) {
            errors.fechaCita = 'Solo abrimos de Lunes a Viernes.';
            isValid = false;
        }

        // 3. Horario (08:00 a 18:30) e intervalos de 30 min
        const hour = citaDate.getHours();
        const minute = citaDate.getMinutes();
        
        if (hour < 8 || hour > 18 || (hour === 18 && minute > 30)) {
            errors.fechaCita = 'Horario de 08:00 a 18:30.';
            isValid = false;
        }

        if (minute !== 0 && minute !== 30) {
            errors.fechaCita = 'Las citas son cada 30 min (ej. :00 o :30).';
            isValid = false;
        }

        // 4. Evitar duplicados (misma hora)
        const citasExistentes = getCitas();
        const ocupado = citasExistentes.some(c => c.fechaCita === data.fechaCita && c.citaId !== data.citaId);
        if (ocupado) {
            errors.fechaCita = 'Este horario ya está reservado.';
            isValid = false;
        }
    }
    
    // Validaciones básicas de campos
    if (!data.nombre.trim()) { errors.nombre = 'Obligatorio.'; isValid = false; }
    if (!data.apellidos.trim()) { errors.apellidos = 'Obligatorio.'; isValid = false; }
    if (!/^[0-9]{9}$/.test(data.telefono)) { errors.telefono = '9 dígitos.'; isValid = false; }
    if (!/^[0-9]{8}[A-Za-z]{1}$/.test(data.dni)) { errors.dni = 'Formato incorrecto.'; isValid = false; }
    if (!data.fechaNacimiento) { errors.fechaNacimiento = 'Obligatorio.'; isValid = false; }

    return { isValid, errors };
}

function displayErrors(errors) {
    for (const field in errors) {
        const errEl = document.getElementById(`error-${field}`);
        const inputEl = document.getElementById(field);
        if (errEl) errEl.textContent = errors[field];
        if (inputEl) inputEl.classList.add('input-error');
    }
}

// ==========================================================
// IV. LÓGICA DE LA TABLA (CON ORDENACIÓN CRONOLÓGICA)
// ==========================================================

function renderCitasTable(citas) {
    if (!citasBody) return;
    citasBody.innerHTML = '';

    if (citas.length === 0) {
        const row = citasBody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 7;
        cell.textContent = 'dato vacío';
        cell.style.textAlign = 'center';
        return;
    }

    // ORDENACIÓN: De la más cercana a la más lejana
    const citasOrdenadas = [...citas].sort((a, b) => new Date(a.fechaCita) - new Date(b.fechaCita));

    citasOrdenadas.forEach((cita, index) => {
        const row = citasBody.insertRow();
        const date = new Date(cita.fechaCita);
        
        row.insertCell(0).textContent = index + 1;
        row.insertCell(1).textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        row.insertCell(2).textContent = `${cita.nombre} ${cita.apellidos}`;
        row.insertCell(3).textContent = cita.dni;
        row.insertCell(4).textContent = cita.telefono;
        row.insertCell(5).textContent = cita.observaciones ? (cita.observaciones.substring(0, 20) + '...') : '-';

        const actionsCell = row.insertCell(6);
        
        const modBtn = document.createElement('button');
        modBtn.textContent = 'Modificar';
        modBtn.className = 'modify-btn';
        modBtn.onclick = () => loadCitaToForm(cita.citaId);
        
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Eliminar';
        delBtn.className = 'delete-btn';
        delBtn.style.marginLeft = '5px';
        delBtn.onclick = () => deleteCita(cita.citaId);

        actionsCell.appendChild(modBtn);
        actionsCell.appendChild(delBtn);
    });
}

// ==========================================================
// V. CRUD Y EVENTOS
// ==========================================================

function loadCitaToForm(id) {
    const cita = getCitas().find(c => c.citaId === id);
    if (cita) {
        Object.keys(cita).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = cita[key];
        });
        guardarBtn.textContent = 'Actualizar Cita';
        window.scrollTo(0, 0);
    }
}

function deleteCita(id) {
    if (confirm('¿Eliminar cita?')) {
        const nuevasCitas = getCitas().filter(c => c.citaId !== id);
        saveCitas(nuevasCitas);
        renderCitasTable(nuevasCitas);
    }
}

citaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
        citaId: document.getElementById('citaId').value,
        fechaCita: document.getElementById('fechaCita').value,
        observaciones: document.getElementById('observaciones').value,
        nombre: document.getElementById('nombre').value,
        apellidos: document.getElementById('apellidos').value,
        dni: document.getElementById('dni').value,
        telefono: document.getElementById('telefono').value,
        fechaNacimiento: document.getElementById('fechaNacimiento').value
    };

    const validation = validateForm(data);
    if (!validation.isValid) return displayErrors(validation.errors);

    let citas = getCitas();
    if (data.citaId) {
        const idx = citas.findIndex(c => c.citaId === data.citaId);
        citas[idx] = data;
    } else {
        data.citaId = Date.now().toString();
        citas.push(data);
    }

    saveCitas(citas);
    renderCitasTable(citas);
    citaForm.reset();
    document.getElementById('citaId').value = '';
    guardarBtn.textContent = 'Guardar Cita';
});

limpiarBtn.addEventListener('click', () => {
    citaForm.reset();
    document.getElementById('citaId').value = '';
    guardarBtn.textContent = 'Guardar Cita';
});

document.addEventListener('DOMContentLoaded', () => renderCitasTable(getCitas()));

