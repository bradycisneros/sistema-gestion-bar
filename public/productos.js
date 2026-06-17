document.addEventListener('DOMContentLoaded', cargarProductos);

// 1. Cargar productos desde el servidor al iniciar
async function cargarProductos() {
    try {
        const res = await fetch('/api/productos');
        const productos = await res.json();
        
        // Llenar el selector (dropdown) de la parte superior
        const select = document.getElementById('select-producto');
        select.innerHTML = '<option value="nuevo">✨ -- AGREGAR PRODUCTO EXISTENTE --</option>';
        
        productos.forEach(p => {
            const option = document.createElement('option');
            option.value = p.IDPlatillo;
            option.textContent = p.NombrePlatillo;
            // Guardamos los datos en el elemento para recuperarlos rápido
            option.dataset.nombre = p.NombrePlatillo;
            option.dataset.costo = p.CostoInsumo;
            option.dataset.precio = p.Precio;
            select.appendChild(option);
        });

        dibujarTabla(productos);
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

// 2. Dibujar la tabla de inventario
function dibujarTabla(productos) {
    const cuerpo = document.getElementById('cuerpo-inventario');
    cuerpo.innerHTML = '';

    productos.forEach(p => {
        const margen = p.Precio - p.CostoInsumo;
        const stockActual = p.Stock || 0;
        // Aplicar clase CSS si el stock es bajo (menos de 5 unidades)
        const claseStock = stockActual < 5 ? 'class="stock-critico"' : '';

        cuerpo.innerHTML += `
            <tr>
                <td>${p.NombrePlatillo}</td>
                <td>$${p.CostoInsumo.toFixed(2)}</td>
                <td>$${p.Precio.toFixed(2)}</td>
                <td style="color: green; font-weight: bold;">$${margen.toFixed(2)}</td>
                <td ${claseStock}>${stockActual} pz</td>
                <td>
                    <button class="btn-editar" onclick="prepararEdicion(${p.IDPlatillo}, '${p.NombrePlatillo}', ${p.CostoInsumo}, ${p.Precio})">
                        Editar ✏️
                    </button>
                </td>
            </tr>
        `;
    });
}

// 3. Lógica al seleccionar un producto del menú desplegable
function seleccionarProductoExistente() {
    const select = document.getElementById('select-producto');
    const option = select.options[select.selectedIndex];

    if (select.value === "nuevo") {
        limpiarFormulario();
    } else {
        document.getElementById('id-producto').value = select.value;
        document.getElementById('nombre-prod').value = option.dataset.nombre;
        document.getElementById('costo-prod').value = option.dataset.costo;
        document.getElementById('precio-prod').value = option.dataset.precio;
    }
    document.getElementById('cantidad-prod').value = 0; // Resetear cantidad de entrada
}

// 4. Preparar edición desde el botón de la tabla
function prepararEdicion(id, nombre, costo, precio) {
    // Seleccionar el ID en el dropdown automáticamente
    document.getElementById('select-producto').value = id;
    
    // Llenar los campos
    document.getElementById('id-producto').value = id;
    document.getElementById('nombre-prod').value = nombre;
    document.getElementById('costo-prod').value = costo;
    document.getElementById('precio-prod').value = precio;
    document.getElementById('cantidad-prod').value = 0;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 5. Guardar o Actualizar producto
async function guardarProducto() {
    const datos = {
        id: document.getElementById('id-producto').value,
        nombre: document.getElementById('nombre-prod').value,
        costo: parseFloat(document.getElementById('costo-prod').value),
        precio: parseFloat(document.getElementById('precio-prod').value),
        cantidad: parseInt(document.getElementById('cantidad-prod').value) || 0
    };

    if (!datos.nombre || isNaN(datos.costo) || isNaN(datos.precio)) {
        alert("⚠️ Por favor completa el nombre, costo y precio correctamente.");
        return;
    }

    try {
        const res = await fetch('/api/productos/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            alert("✅ ¡Inventario y precios actualizados!");
            location.reload();
        }
    } catch (error) {
        alert("❌ Error al conectar con el servidor.");
    }
}

function limpiarFormulario() {
    document.getElementById('id-producto').value = '';
    document.getElementById('nombre-prod').value = '';
    document.getElementById('costo-prod').value = '';
    document.getElementById('precio-prod').value = '';
    document.getElementById('cantidad-prod').value = 0;
}

// 6. Buscador de la tabla
document.getElementById('buscador-prod').addEventListener('keyup', function() {
    const texto = this.value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-inventario tr');

    filas.forEach(fila => {
        const nombre = fila.cells[0].textContent.toLowerCase();
        fila.style.display = nombre.includes(texto) ? '' : 'none';
    });
});