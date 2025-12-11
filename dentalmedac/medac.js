// ==========================================================
// I. INICIALIZACIÓN Y CONSTANTES
// ==========================================================
const STORAGE_KEY = 'davanteDentCitas';
const citaForm = document.getElementById('citaForm');
const citasBody = document.getElementById('citasBody');
const guardarBtn = document.getElementById('guardarBtn');
const limpiarBtn = document.getElementById('limpiarBtn');

// ==========================================================
// VERIFICACIÓN CRÍTICA (Asegura que los IDs del HTML existan)
// ==========================================================
if (!citaForm || !citasBody || !guardarBtn) {
    console.error("ERROR CRÍTICO: No se encontraron elementos DOM esenciales. Verifique los IDs en el HTML.");
}

// ==========================================================
// II. MANEJO DE LOCAL STORAGE
// ==========================================================

/**
 * Obtiene la lista de citas del LocalStorage.
 * @returns {Array<Object>} Lista de citas o array vacío si no hay datos.
 */
function getCitas() {
    try {
        const citasJson = localStorage.getItem(STORAGE_KEY);
        return citasJson ? JSON.parse(citasJson) : [];
    } catch (error) {
        console.error("Error al leer citas de LocalStorage:", error);
        return [];
    }
}

/**
 * Guarda la lista de citas en el LocalStorage.
 * @param {Array<Object>} citas Lista de citas a guardar.
 */
function saveCitas(citas) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
    } catch (error) {
        console.error("Error al guardar citas en LocalStorage:", error);
        alert("No se pudo guardar la cita. El almacenamiento local podría estar lleno o desactivado.");
    }
}

// ==========================================================
// III. VALIDACIÓN Y GESTIÓN DE ERRORES
// ==========================================================

/**
 * Valida todos los campos del formulario, incluyendo todas las reglas de negocio.
 * REGLAS: Futuro, Lunes-Viernes, 08:00 a 18:30, intervalos de :00 o :30.
 * @param {Object} data Objeto con los datos del formulario.
 * @returns {Object} { isValid: boolean, errors: Object }
 */
function validateForm(data) {
    const errors = {};
    let isValid = true;

    // Limpiar mensajes de error previos
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('input, textarea').forEach(el => el.classList.remove('input-error'));

    // --- Validaciones de Fecha y Hora ---
    if (!data.fechaCita) {
        errors.fechaCita = 'La fecha y hora son obligatorias.';
        isValid = false;
    } else {
        const citaDate = new Date(data.fechaCita);
        
        // 1. Verificar que la cita sea en el futuro
        if (citaDate < new Date()) {
            errors.fechaCita = 'La cita debe ser en el futuro.';
            isValid = false;
        }
        
        // 2. Verificar el día de la semana (Lunes=1 a Viernes=5)
        const dayOfWeek = citaDate.getDay(); 
        if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 es Domingo, 6 es Sábado
            errors.fechaCita = 'Solo se pueden agendar citas de Lunes a Viernes.';
            isValid = false;
        }

        // 3. Verificar el horario (08:00 a 18:30)
        const hour = citaDate.getHours();
        const minute = citaDate.getMinutes();
        
        if (hour < 8 || hour > 18) {
            errors.fechaCita = 'El horario de atención es de 08:00 a 18:30.';
            isValid = false;
        } else if (hour === 18 && minute > 30) {
            // Si la hora es 18, los minutos NO pueden ser mayores de 30 (ej: 18:30 es válido, 18:45 NO)
            errors.fechaCita = 'La última cita del día es a las 18:30.';
            isValid = false;
        }

        // 4. Verificar los minutos (Solo :00 o :30)
        if (minute !== 0 && minute !== 30) {
            errors.fechaCita = 'Las citas solo pueden ser cada 30 minutos (ej: 10:00 o 10:30).';
            isValid = false;
        }
    }
    
    // --- Validaciones del Paciente ---
    if (!data.nombre.trim()) { 
        errors.nombre = 'El nombre es obligatorio.'; 
        isValid = false; 
    }
    if (!data.apellidos.trim()) { 
        errors.apellidos = 'Los apellidos son obligatorios.'; 
        isValid = false; 
    }
    
    // Teléfono: 9 dígitos numéricos
    const phoneRegex = /^[0-9]{9}$/;
    if (!data.telefono || !phoneRegex.test(data.telefono)) {
        errors.telefono = 'El teléfono debe contener 9 dígitos numéricos.';
        isValid = false;
    }

    // DNI: 8 números y 1 letra
    const dniRegex = /^[0-9]{8}[A-Za-z]{1}$/;
    if (!data.dni || !dniRegex.test(data.dni)) {
        errors.dni = 'El DNI debe tener 8 números y 1 letra.';
        isValid = false;
    }

    if (!data.fechaNacimiento) { 
        errors.fechaNacimiento = 'La fecha de nacimiento es obligatoria.'; 
        isValid = false; 
    }

    return { isValid, errors };
}

/**
 * Muestra los errores de validación en el formulario, resaltando los campos.
 * @param {Object} errors Objeto con los errores.
 */
function displayErrors(errors) {
    for (const field in errors) {
        const errorElement = document.getElementById(`error-${field}`); 
        const inputElement = document.getElementById(field);

        if (errorElement) {
            errorElement.textContent = errors[field];
        }
        if (inputElement) {
            inputElement.classList.add('input-error');
        }
    }
}

// ==========================================================
// IV. LÓGICA DE LA TABLA Y CRUD (VISTA)
// ==========================================================

/**
 * Renderiza la tabla de citas usando los datos proporcionados.
 * @param {Array<Object>} citas Lista de citas.
 */
function renderCitasTable(citas) {
    if (!citasBody) return; 

    citasBody.innerHTML = ''; // Limpiar tabla

    if (citas.length === 0) {
        const row = citasBody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 7;
        cell.textContent = 'dato vacío'; // Requisito: fila "dato vacío"
        cell.style.textAlign = 'center';
        return;
    }

    citas.forEach((cita, index) => {
        const row = citasBody.insertRow();

        // 1. Columna Nº
        row.insertCell(0).textContent = index + 1; 

        // 2. Fecha y Hora (Formateo)
        const date = new Date(cita.fechaCita);
        const formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        row.insertCell(1).textContent = `${formattedDate} ${formattedTime}`;

        // 3. Nombre Completo
        row.insertCell(2).textContent = `${cita.nombre} ${cita.apellidos}`;

        // 4, 5. DNI y Teléfono
        row.insertCell(3).textContent = cita.dni;
        row.insertCell(4).textContent = cita.telefono;
        
        // 6. Observaciones (Truncado)
        row.insertCell(5).textContent = cita.observaciones ? (cita.observaciones.substring(0, 30) + (cita.observaciones.length > 30 ? '...' : '')) : '';

        // 7. Acciones (Botones)
        const actionsCell = row.insertCell(6);

        // Botón Modificar
        const modifyBtn = document.createElement('button');
        modifyBtn.textContent = 'Modificar';
        modifyBtn.onclick = () => loadCitaToForm(cita.citaId);
        actionsCell.appendChild(modifyBtn);

        // Botón Eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.style.marginLeft = '5px';
        deleteBtn.onclick = () => deleteCita(cita.citaId);
        actionsCell.appendChild(deleteBtn);
        
        // ID oculto
        const hiddenIdInput = document.createElement('input');
        hiddenIdInput.type = 'hidden';
        hiddenIdInput.value = cita.citaId;
        actionsCell.appendChild(hiddenIdInput);
    });
}

/**
 * Carga los datos de una cita al formulario para su modificación.
 */
function loadCitaToForm(id) {
    const citas = getCitas();
    const cita = citas.find(c => c.citaId === id);

    if (cita) {
        document.getElementById('citaId').value = cita.citaId;
        document.getElementById('fechaCita').value = cita.fechaCita;
        document.getElementById('observaciones').value = cita.observaciones;
        document.getElementById('nombre').value = cita.nombre;
        document.getElementById('apellidos').value = cita.apellidos;
        document.getElementById('dni').value = cita.dni;
        document.getElementById('telefono').value = cita.telefono;
        document.getElementById('fechaNacimiento').value = cita.fechaNacimiento;
        guardarBtn.textContent = 'Modificar Cita';
        
        // Limpiar errores visuales
        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
        document.querySelectorAll('input, textarea').forEach(el => el.classList.remove('input-error'));
    }
}

/**
 * Elimina una cita del LocalStorage y actualiza la tabla.
 */
function deleteCita(id) {
    if (confirm('¿Está seguro de que desea eliminar esta cita?')) {
        let citas = getCitas();
        const updatedCitas = citas.filter(c => c.citaId !== id);
        saveCitas(updatedCitas);
        renderCitasTable(updatedCitas);
        
        // Limpiar formulario si se estaba editando
        if (document.getElementById('citaId').value === id) {
            citaForm.reset();
            document.getElementById('citaId').value = '';
            guardarBtn.textContent = 'Guardar Cita';
        }
    }
}

// ==========================================================
// V. LISTENERS Y FLUJO PRINCIPAL
// ==========================================================

if (citaForm) { // Aseguramos que el formulario existe
    citaForm.addEventListener('submit', function (event) {
        event.preventDefault(); 

        // 1. Recoger datos
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

        // 2. Validar los datos
        const validationResult = validateForm(data);

        if (!validationResult.isValid) {
            displayErrors(validationResult.errors);
            return; // Detiene el proceso si falla la validación
        }

        // 3. Crear o Modificar
        let citas = getCitas();

        if (data.citaId) {
            // MODIFICAR CITA
            const index = citas.findIndex(c => c.citaId === data.citaId);
            if (index !== -1) {
                citas[index] = { ...data, citaId: citas[index].citaId }; 
            }
        } else {
            // CREAR NUEVA CITA
            const newCitaId = Date.now().toString(); 
            const newCita = { ...data, citaId: newCitaId };
            citas.push(newCita);
        }

        saveCitas(citas);

        // 4. Actualizar la tabla visualmente
        renderCitasTable(citas); 

        // 5. Limpiar formulario
        citaForm.reset();
        document.getElementById('citaId').value = ''; 
        guardarBtn.textContent = 'Guardar Cita';
    });

    limpiarBtn.addEventListener('click', () => {
        citaForm.reset();
        document.getElementById('citaId').value = ''; 
        guardarBtn.textContent = 'Guardar Cita';
        // Limpiar errores visuales
        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
        document.querySelectorAll('input, textarea').forEach(el => el.classList.remove('input-error'));
    });
}

// ==========================================================
// VI. INICIO DE LA APLICACIÓN (Carga inicial)
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    const initialCitas = getCitas();
    renderCitasTable(initialCitas);
});