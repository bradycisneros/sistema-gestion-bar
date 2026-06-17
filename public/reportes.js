let productosGlobales = []; // Variable para el PDF

document.addEventListener('DOMContentLoaded', () => {
    // ... (Tu código de fechas y botones se queda igual)
    const btnGenerar = document.getElementById('generar-reporte');
    if (btnGenerar) btnGenerar.addEventListener('click', obtenerReporte);

    const btnPDF = document.getElementById('descargar-pdf');
    if (btnPDF) btnPDF.addEventListener('click', generarTicketPDF);

    obtenerReporte();
});

async function obtenerReporte() {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;

    try {
        const respuesta = await fetch(`/reporte/completo?inicio=${inicio}&fin=${fin}`);
        const datos = await respuesta.json();
        
        // IMPORTANTE: Guardamos la lista que viene del servidor
        productosGlobales = datos.productos || [];
        
        actualizarInterfaz(datos);
    } catch (error) {
        console.error('Error:', error);
    }
}

function actualizarInterfaz(datos) {
    const { finanzas, productos } = datos;

    // Actualizar cuadros (Asegúrate que los IDs coincidan con tu HTML)
    document.getElementById('total-efectivo').textContent = `$${Number(finanzas.totalEfectivo || 0).toFixed(2)}`;
    document.getElementById('total-tarjeta').textContent = `$${Number(finanzas.totalTarjeta || 0).toFixed(2)}`;
    document.getElementById('total-transferencia').textContent = `$${Number(finanzas.totalTransferencia || 0).toFixed(2)}`;
    document.getElementById('total-vendido-bruto').textContent = `$${Number(finanzas.totalVentasBrutas || 0).toFixed(2)}`;
    document.getElementById('total-gastos').textContent = `$${Number(finanzas.totalGastosInsumos || 0).toFixed(2)}`;
    document.getElementById('total-utilidad').textContent = `$${Number(finanzas.utilidadReal || 0).toFixed(2)}`;

    const contenedor = document.getElementById('reporte-container');
    contenedor.innerHTML = ''; 

    if (!productos || productos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; padding:20px;">No hay ventas registradas.</p>';
        return;
    }

    // Dibujar lista en pantalla
    let html = '<h2 style="text-align:center;">Ventas por Artículo</h2>';
    productos.forEach(p => {
        html += `
            <div style="background:white; border-bottom:1px solid #eee; padding:10px; display:flex; justify-content:space-between;">
                <span><strong>${p.CantidadVendida}x</strong> ${p.NombrePlatillo}</span>
                <span style="color:#2e7d32; font-weight:bold;">$${Number(p.TotalVendido).toFixed(2)}</span>
            </div>`;
    });
    contenedor.innerHTML = html;
}

function generarTicketPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: [80, 220] }); // Aumentamos el largo a 200mm para que no se corte

    const fecha = document.getElementById('fecha-inicio').value;

    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text("Terraza øriente", 40, 10, { align: "center" });
    doc.setFontSize(9);
    doc.text("CORTE DE CAJA", 40, 15, { align: "center" });
    doc.text("---------------------------", 40, 20, { align: "center" });
    doc.text(`FECHA: ${fecha}`, 5, 26);
    doc.text("---------------------------", 40, 32, { align: "center" });

    // Dinero (Aumentamos el salto de línea a 7mm para que no se crucen)
    doc.text(`EFECTIVO:      ${document.getElementById('total-efectivo').textContent}`, 5, 40);
    doc.text(`TARJETA:       ${document.getElementById('total-tarjeta').textContent}`, 5, 47);
    doc.text(`TRANSFER:      ${document.getElementById('total-transferencia').textContent}`, 5, 54);
    
    doc.text("---------------------------", 40, 61, { align: "center" });
    doc.text(`TOTAL VENTA:   ${document.getElementById('total-vendido-bruto').textContent}`, 5, 68);
    doc.text(`GASTO PROV:    ${document.getElementById('total-gastos').textContent}`, 5, 75);
    doc.text(`UTILIDAD NETO: ${document.getElementById('total-utilidad').textContent}`, 5, 82);
    
    doc.text("---------------------------", 40, 89, { align: "center" });
    doc.text("TOP 5 PRODUCTOS", 40, 95, { align: "center" });
    doc.text("---------------------------", 40, 101, { align: "center" });

    // Top 5 con buen espacio
    const top5 = [...productosGlobales].sort((a,b) => b.CantidadVendida - a.CantidadVendida).slice(0,5);
    let y = 108;
    top5.forEach(p => {
        const nombre = p.NombrePlatillo.substring(0, 15);
        doc.text(`${p.CantidadVendida}x ${nombre}`, 5, y);
        doc.text(`$${Number(p.TotalVendido).toFixed(2)}`, 75, y, { align: "right" });
        y += 7; // Salto de línea amplio
    });

    doc.text("---------------------------", 40, y + 5, { align: "center" });
    doc.text("REPORTE DEL DIA", 40, y + 12, { align: "center" });

    doc.save(`Corte_${fecha}.pdf`);
}