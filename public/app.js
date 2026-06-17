// 1. Espera a que todo el contenido del HTML esté cargado
document.addEventListener('DOMContentLoaded', () => {
    console.log('App del mesero lista (Versión Automática).');
    
    // PRIMERO: Generamos las 25 mesas dinámicamente
    generarSalon(25); 
    
    // SEGUNDO: Actualizamos su estado (si están ocupadas o no)
    actualizarEstadoMesas();
});

/**
 * Genera los botones de las mesas automáticamente
 */
function generarSalon(cantidad) {
    const contenedor = document.getElementById('salon-mesas');
    if (!contenedor) return;
    
    contenedor.innerHTML = ''; // Limpiamos por si acaso

    for (let i = 1; i <= cantidad; i++) {
        const botonMesa = document.createElement('button');
        
        // Configuramos el botón
        botonMesa.textContent = `Mesa ${i}`;
        botonMesa.className = 'mesa disponible'; // Empiezan como disponibles por defecto
        botonMesa.dataset.idMesa = i;
        
        // Agregamos el evento de click
        botonMesa.addEventListener('click', () => {
            seleccionarMesa(i);
        });

        contenedor.appendChild(botonMesa);
    }
    
    // OPCIONAL: Agregar la BARRA si la necesitas como mesa especial
    const botonBarra = document.createElement('button');
    botonBarra.textContent = `BARRA`;
    botonBarra.className = 'mesa disponible';
    botonBarra.dataset.idMesa = 99; // Un ID alto para identificar la barra
    botonBarra.addEventListener('click', () => seleccionarMesa(99));
    contenedor.appendChild(botonBarra);
}

/**
 * Función para manejar la selección de una mesa
 */
async function seleccionarMesa(idMesa) {
    console.log(`Intentando abrir Mesa: ${idMesa}`);

    try {
        const respuesta = await fetch('/crear-orden', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ IDMesa: idMesa })
        });

        if (respuesta.status === 201) {
            const ordenCreada = await respuesta.json(); 
            console.log('¡Orden creada!', ordenCreada);
            
            localStorage.setItem('idOrdenActiva', ordenCreada.idOrden);
            localStorage.setItem('idMesaActiva', idMesa);

            window.location.href = 'orden.html';
        } else {
            console.error('El servidor no pudo crear la orden.');
            alert('Error: La mesa ya podría estar ocupada o el servidor falló.');
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error de conexión: No se pudo conectar al servidor.');
    }
}

/**
 * Llama a la API para saber qué mesas están ocupadas
 */
async function actualizarEstadoMesas() {
    console.log('Actualizando estado de mesas...');
    try {
        const respuesta = await fetch('/ordenes/activas');
        if (!respuesta.ok) throw new Error('No se pudo obtener el estado');
        
        const mesasOcupadas = await respuesta.json(); 
        const botonesMesa = document.querySelectorAll('.mesa');

        botonesMesa.forEach(boton => {
            const idMesa = parseInt(boton.dataset.idMesa);

            if (mesasOcupadas.includes(idMesa)) {
                boton.classList.remove('disponible');
                boton.classList.add('ocupada');
                // Opcional: Si está ocupada, podemos cambiar el texto o deshabilitar
                // boton.disabled = true; 
            } else {
                boton.classList.remove('ocupada');
                boton.classList.add('disponible');
            }
        });

    } catch (error) {
        console.error('Error al actualizar mesas:', error);
    }
}