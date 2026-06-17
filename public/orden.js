document.addEventListener('DOMContentLoaded', () => {
    const idOrden = localStorage.getItem('idOrdenActiva');
    const idMesa = localStorage.getItem('idMesaActiva');

    if (!idOrden) {
        alert('Error: No se encontró una orden activa.');
        window.location.href = 'salon.html';
        return;
    }

    // Actualizar encabezado
    const titulo = document.getElementById('num-mesa'); 
    if(titulo) titulo.textContent = idMesa;
    
    const idSpan = document.getElementById('id-orden');
    if(idSpan) idSpan.textContent = idOrden;

    // Configurar botón de enviar a cocina
    const botonEnviar = document.getElementById('enviar-cocina');
    if(botonEnviar) {
        botonEnviar.addEventListener('click', () => {
            enviarOrdenACocina(idOrden);
        });
    }

    cargarMenu();
    cargarComanda(idOrden);
});

// --- LÓGICA DEL MENÚ ---

async function cargarMenu() {
    try {
        const respuesta = await fetch('/menu');
        if (!respuesta.ok) throw new Error('Error al cargar el menú');
        const menu = await respuesta.json();
        dibujarMenu(menu.categorias, menu.platillos);
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar el menú.');
    }
}

function dibujarMenu(categorias, platillos) {
    const contenedorCats = document.getElementById('categorias-menu');
    const gridProductos = document.getElementById('lista-productos');
    
    if(!contenedorCats || !gridProductos) return;

    contenedorCats.innerHTML = '';
    
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'btn-categoria';
        btn.textContent = cat.NombreCategoria;
        btn.onclick = () => {
            // Estilo visual de selección
            document.querySelectorAll('.btn-categoria').forEach(b => b.classList.remove('activa'));
            btn.classList.add('activa');
            dibujarPlatillos(cat.IDCategoria, platillos);
        };
        contenedorCats.appendChild(btn);
    });

    // Seleccionar la primera categoría por defecto
    if(categorias.length > 0) contenedorCats.firstChild.click();
}

function dibujarPlatillos(idCategoria, todosLosPlatillos) {
    const grid = document.getElementById('lista-productos');
    grid.innerHTML = '';

    const filtrados = todosLosPlatillos.filter(p => p.IDCategoria === idCategoria);

    filtrados.forEach(plat => {
        const card = document.createElement('div');
        card.className = 'producto-item-card'; 
        
        // Diseño de botón grande
        card.innerHTML = `
            <span class="prod-nombre">${plat.NombrePlatillo}</span>
            <span class="prod-precio">$${plat.Precio.toFixed(2)}</span>
        `;

        // Al hacer clic en cualquier parte de la tarjeta, se agrega
        card.onclick = () => agregarPlatillo(plat.IDPlatillo, plat.NombrePlatillo, plat.Precio);

        grid.appendChild(card);
    });
}

// --- LÓGICA DE LA COMANDA ---

async function agregarPlatillo(idPlatillo, nombre, precio) {
    const idOrden = localStorage.getItem('idOrdenActiva');
    
    // Aquí puedes abrir un modal de nota si lo requieres, 
    // por ahora lo enviamos directo para agilidad
    const data = {
        IDOrden: idOrden,
        IDPlatillo: idPlatillo,
        Cantidad: 1,
        Personalizacion: '',
        Precio: precio
    };

    try {
        const res = await fetch('/orden/agregar-platillo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            cargarComanda(idOrden); // Recargar la lista visual
        }
    } catch (err) {
        console.error("Error al agregar:", err);
    }
}

async function cargarComanda(idOrden) {
    try {
        const res = await fetch(`/orden/${idOrden}/detalles`); // Asegúrate de tener esta ruta en tu index.js
        if (!res.ok) return;
        const items = await res.json();
        dibujarComanda(items);
    } catch (err) {
        console.log("Error al cargar comanda");
    }
}

function dibujarComanda(items) {
    const lista = document.getElementById('lista-comanda');
    const placeholder = document.getElementById('comanda-placeholder');
    const totalLabel = document.getElementById('comanda-total');
    
    if(!lista) return;
    lista.innerHTML = '';
    let total = 0;

    if (items.length === 0) {
        placeholder.style.display = 'block';
        totalLabel.textContent = '$0.00';
        return;
    }

    placeholder.style.display = 'none';

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'comanda-item';
        li.innerHTML = `
            <div class="comanda-item-info">
                <span class="comanda-item-cant">${item.Cantidad}x</span> 
                <span class="comanda-item-nombre">${item.NombrePlatillo}</span>
            </div>
            <span class="comanda-item-subtotal">$${(item.Cantidad * item.PrecioUnitario).toFixed(2)}</span>
        `;
        lista.appendChild(li);
        total += item.Cantidad * item.PrecioUnitario;
    });

    totalLabel.textContent = `$${total.toFixed(2)}`;
}

async function enviarOrdenACocina(idOrden) {
    if (!confirm(`¿Enviar esta orden a la cocina?`)) return;

    try {
        const respuesta = await fetch(`/orden/${idOrden}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                estado: 'En preparación',
                metodoPago: 'Pendiente' 
            })
        });

        if (respuesta.ok) {
            alert(`¡Orden enviada!`);
            window.location.href = 'salon.html';
        }
    } catch (error) {
        console.error(error);
    }
}