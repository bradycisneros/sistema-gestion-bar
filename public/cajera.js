document.addEventListener('DOMContentLoaded', () => {
    cargarCuentasDeMesas();
});

async function cargarCuentasDeMesas() {
    try {
        const respuesta = await fetch('/caja/ordenes');
        if (!respuesta.ok) throw new Error('Error al cargar las cuentas');
        const mesas = await respuesta.json();
        dibujarCuentasDeMesas(mesas);
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar la lista de cuentas.');
    }
}

function dibujarCuentasDeMesas(mesas) {
    const divLista = document.getElementById('lista-ordenes');
    divLista.innerHTML = '';

    if (mesas.length === 0) {
        divLista.innerHTML = '<div class="no-cuentas">🎉 No hay cuentas activas.</div>';
        return;
    }

    mesas.forEach(mesa => {
        const ticket = document.createElement('div');
        ticket.className = 'orden-ticket';

        ticket.innerHTML = `
            <div class="orden-ticket-header">
                <h2>Mesa ${mesa.idMesa}</h2>
                <span>ID Órdenes: ${mesa.idsOrdenes.join(', ')}</span>
            </div>
            <div class="orden-ticket-body">
                <ul class="lista-platillos">
                    ${mesa.platillos.map(plat => `
                        <li><strong class="cant">${plat.cantidad}x</strong> ${plat.nombre}</li>
                    `).join('')}
                </ul>
            </div>
            <div class="orden-ticket-footer">
                <p class="orden-total">Total: <strong>$${mesa.totalGeneral.toFixed(2)}</strong></p>
                
                <div class="pago-dividido-container">
                    <p class="instruccion">Divide el pago si es necesario:</p>
                    <div class="input-pago">
                        <span>💵</span><input type="number" id="efectivo-${mesa.idMesa}" placeholder="Efectivo" value="${mesa.totalGeneral.toFixed(2)}">
                    </div>
                    <div class="input-pago">
                        <span>💳</span><input type="number" id="tarjeta-${mesa.idMesa}" placeholder="Tarjeta" value="0">
                    </div>
                    <div class="input-pago">
                        <span>📲</span><input type="number" id="transferencia-${mesa.idMesa}" placeholder="Transf." value="0">
                    </div>
                </div>

                <button class="btn-pagar" onclick="procesarPagoDividido('${mesa.idMesa}', '${mesa.idsOrdenes.join(',')}', ${mesa.totalGeneral})">
                    Finalizar y Liberar Mesa
                </button>
            </div>
        `;
        divLista.appendChild(ticket);
    });
}

window.procesarPagoDividido = async function(idMesa, idsString, totalEsperado) {
    const idsOrdenes = idsString.split(',');
    
    // Capturamos los montos de cada input
    const efectivo = parseFloat(document.getElementById(`efectivo-${idMesa}`).value) || 0;
    const tarjeta = parseFloat(document.getElementById(`tarjeta-${idMesa}`).value) || 0;
    const transferencia = parseFloat(document.getElementById(`transferencia-${idMesa}`).value) || 0;

    const sumaPagada = efectivo + tarjeta + transferencia;

    // Validación de seguridad
    if (Math.abs(sumaPagada - totalEsperado) > 0.1) {
        alert(`❌ Error: La suma ($${sumaPagada}) no coincide con el total ($${totalEsperado}).`);
        return;
    }

    if (!confirm(`¿Confirmar pago dividido?\nEfec: $${efectivo}\nTarj: $${tarjeta}\nTrans: $${transferencia}`)) return;

    try {
        // IMPORTANTE: Aquí enviamos los montos por separado al servidor
        for (const id of idsOrdenes) {
            await fetch(`/orden/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    estado: 'Pagado',
                    metodoPago: 'Dividido', // Indicamos que fue mixto
                    detallesPago: { efectivo, tarjeta, transferencia } 
                })
            });
        }
        alert(`✅ Venta registrada con éxito.`);
        cargarCuentasDeMesas();
    } catch (error) {
        alert(`❌ Error al procesar pago.`);
    }
};