let tiendas = [];
let map = L.map('map').setView([40.4168, -3.7038], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let clienteMarker = null;
let lineaRuta = null;
let graficoFactura = null;
let nodosFactura = [];
let checkboxesFactura = [];
let nifs = [];
let nifsFiltrados = [];
let planesUnicos = [];
let currentNifIndex = 0;

async function cargarTiendas() {
  try {
    const response = await fetch('pruebabase_procesado.csv');
    const text = await response.text();
    tiendas = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
    console.log('Tiendas cargadas desde CSV:', tiendas);

    tiendas.forEach(t => {
      L.marker([parseFloat(t.lat), parseFloat(t.lng)], {
        title: t.nombre,
        icon: L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(map).bindPopup(`🏬 ${t.nombre}<br/>CP: ${t.cp}`);
    });
  } catch (error) {
    console.error('Error al cargar pruebabase_procesado.csv, usando datos de prueba:', error);
    tiendas = [
      { nombre: "TD Camarena", cp: "28047", lat: 40.387, lng: -3.751 },
      { nombre: "TD Torrijos", cp: "45500", lat: 39.983, lng: -4.283 },
      { nombre: "FQ C.C. Valdemoro", cp: "28340", lat: 40.19, lng: -3.673 },
      { nombre: "FQ Carreteria", cp: "16003", lat: 40.07, lng: -2.13 },
      { nombre: "FQ CC EL VENTANAL", cp: "28770", lat: 40.662, lng: -3.689 },
      { nombre: "FQ Fuencarral", cp: "28010", lat: 40.432, lng: -3.702 },
      { nombre: "FQ Mostoles", cp: "28931", lat: 40.322, lng: -3.865 },
      { nombre: "FQ Pedro Laborde", cp: "28038", lat: 40.388, lng: -3.653 },
      { nombre: "FQ PLAZA RIO", cp: "28026", lat: 40.389, lng: -3.703 },
      { nombre: "FQ PINTO CC EBOLI", cp: "28320", lat: 40.24, lng: -3.699 },
      { nombre: "FQ SECTOR 3 CC", cp: "28950", lat: 40.324, lng: -3.731 },
      { nombre: "TD Acacias", cp: "28005", lat: 40.406, lng: -3.713 },
      { nombre: "TD Alberto Palacios", cp: "28021", lat: 40.344, lng: -3.707 },
      { nombre: "TD C.C. El Parque", cp: "13005", lat: 38.984, lng: -3.931 },
      { nombre: "TD Coslada", cp: "28821", lat: 40.426, lng: -3.557 },
      { nombre: "TD Francos Rodriguez", cp: "28039", lat: 40.454, lng: -3.716 },
      { nombre: "TD Fuensalida", cp: "45510", lat: 40.024, lng: -4.258 },
      { nombre: "TD Mejorada", cp: "28840", lat: 40.388, lng: -3.482 },
      { nombre: "TD Pozuelo", cp: "28224", lat: 40.434, lng: -3.811 },
      { nombre: "TD Sahara", cp: "28041", lat: 40.362, lng: -3.683 }
    ];

    tiendas.forEach(t => {
      L.marker([t.lat, t.lng], {
        title: t.nombre,
        icon: L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(map).bindPopup(`🏬 ${t.nombre}<br/>CP: ${t.cp}`);
    });
  }
}

async function cargarNifs() {
  try {
    const response = await fetch('/nifs');
    if (!response.ok) throw new Error('Error al cargar NIFs');
    nifs = await response.json();
    console.log('NIFs cargados:', nifs);
  } catch (error) {
    console.error('Error al cargar NIFs, usando datos de prueba:', error);
    nifs = ["619156757", "679735826", "663579369"];
  }

  nifsFiltrados = [...nifs];
  await cargarPlanesUnicos();

  const datalist = document.getElementById('nifList');
  datalist.innerHTML = '';

  nifsFiltrados.forEach(nif => {
    const option = document.createElement('option');
    option.value = nif;
    option.textContent = nif;
    datalist.appendChild(option);
  });

  const input = document.getElementById('nifInput');
  const prevBtn = document.getElementById('prevNifBtn');
  const nextBtn = document.getElementById('nextNifBtn');
  const planFilter = document.getElementById('planFilter');

  if (nifsFiltrados.length > 0) {
    currentNifIndex = 0;
    input.value = nifsFiltrados[currentNifIndex];
    await cargarDatos(nifsFiltrados[currentNifIndex]);
    updateButtons();
  } else {
    document.getElementById('output').textContent = 'No se encontraron NIFs.';
  }

  planFilter.addEventListener('change', () => {
    filtrarPorPlan(planFilter.value);
  });

  input.addEventListener('input', () => {
    const valor = input.value.toLowerCase();
    if (nifsFiltrados.includes(valor)) {
      currentNifIndex = nifsFiltrados.indexOf(valor);
      cargarDatos(valor);
      updateButtons();
    }
  });

  input.addEventListener('change', () => {
    const selectedNif = input.value;
    if (selectedNif && nifsFiltrados.includes(selectedNif)) {
      currentNifIndex = nifsFiltrados.indexOf(selectedNif);
      cargarDatos(nifsFiltrados[currentNifIndex]);
      updateButtons();
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const selectedNif = input.value;
      if (selectedNif && nifsFiltrados.includes(selectedNif)) {
        currentNifIndex = nifsFiltrados.indexOf(selectedNif);
        cargarDatos(selectedNif);
        updateButtons();
      }
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentNifIndex > 0) {
      currentNifIndex--;
      input.value = nifsFiltrados[currentNifIndex];
      cargarDatos(nifsFiltrados[currentNifIndex]);
      updateButtons();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentNifIndex < nifsFiltrados.length - 1) {
      currentNifIndex++;
      input.value = nifsFiltrados[currentNifIndex];
      cargarDatos(nifsFiltrados[currentNifIndex]);
      updateButtons();
    }
  });
}

async function cargarPlanesUnicos() {
  planesUnicos = [];
  let errorCount = 0;
  for (const nif of nifs) {
    try {
      const res = await fetch(`/data/${nif}`);
      if (!res.ok) {
        console.warn(`No se pudo cargar datos para NIF ${nif}: ${res.status}`);
        errorCount++;
        continue;
      }
      const data = await res.json();
      console.log(`Datos para NIF ${nif}:`, data);
      if (!data || !data[0] || !data[0].Plan) {
        console.warn(`Datos incompletos para NIF ${nif}:`, data);
        continue;
      }
      const plan = data[0].Plan;
      if (plan && !planesUnicos.includes(plan)) {
        planesUnicos.push(plan);
        console.log(`Plan encontrado: ${plan}`);
      }
    } catch (e) {
      console.error(`Error al cargar datos para NIF ${nif}:`, e);
      errorCount++;
    }
  }

  if (errorCount === nifs.length) {
    console.error('No se pudieron cargar planes de ningún NIF. Usando datos de prueba para planes.');
    planesUnicos = ["Love Empresa Activa", "Love FUTbol 2", "Fibra con 1 Línea", "Love TOTAL 4"];
  }

  planesUnicos.sort();
  console.log('Planes únicos encontrados:', planesUnicos);

  const planFilter = document.getElementById('planFilter');
  planFilter.innerHTML = '<option value="">Todos los planes</option>';
  planesUnicos.forEach(plan => {
    const option = document.createElement('option');
    option.value = plan;
    option.textContent = plan;
    planFilter.appendChild(option);
  });
}

async function filtrarPorPlan(planSeleccionado) {
  nifsFiltrados = [];
  if (!planSeleccionado) {
    nifsFiltrados = [...nifs];
  } else {
    for (const nif of nifs) {
      try {
        const res = await fetch(`/data/${nif}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data[0].Plan === planSeleccionado) {
          nifsFiltrados.push(nif);
        }
      } catch (e) {
        console.error(`Error al filtrar NIF ${nif}:`, e);
      }
    }
  }

  const datalist = document.getElementById('nifList');
  datalist.innerHTML = '';
  nifsFiltrados.forEach(nif => {
    const option = document.createElement('option');
    option.value = nif;
    option.textContent = nif;
    datalist.appendChild(option);
  });

  const input = document.getElementById('nifInput');
  if (nifsFiltrados.length > 0) {
    currentNifIndex = 0;
    input.value = nifsFiltrados[currentNifIndex];
    await cargarDatos(nifsFiltrados[currentNifIndex]);
  } else {
    input.value = '';
    document.getElementById('output').textContent = 'No se encontraron NIFs con el plan seleccionado.';
  }
  updateButtons();
}

async function buscarIdEnServicios() {
  const idBuscado = document.getElementById('idSearch').value.trim();
  const resultadoDiv = document.getElementById('idSearchResultado');
  if (!idBuscado) {
    resultadoDiv.textContent = "⚠️ Introduce un ID para buscar.";
    return;
  }

  resultadoDiv.innerHTML = "🔍 Buscando...";

  for (let i = 0; i < nifs.length; i++) {
    const nif = nifs[i];
    try {
      const res = await fetch(`/data/${nif}`);
      if (!res.ok) continue;
      const data = await res.json();
      let servicios = [];
      try {
        servicios = JSON.parse(data[0].servicios || "[]");
      } catch (e) {
        console.warn(`Error al parsear servicios para NIF ${nif}:`, e);
        servicios = [];
      }

      for (const servicio of servicios) {
        const encontrado = buscarProfundamente(servicio, "id", idBuscado) ||
          buscarProfundamente(servicio, "numero", idBuscado);
        if (encontrado) {
          resultadoDiv.innerHTML = `✅ ID <strong>${idBuscado}</strong> encontrado en NIF: <strong>${nif}</strong>`;
          document.getElementById('nifInput').value = nif;
          currentNifIndex = nifsFiltrados.indexOf(nif);
          await cargarDatos(nif);
          updateButtons();
          return;
        }
      }
    } catch (e) {
      console.error(`❌ Error al buscar en NIF ${nif}`, e);
    }
  }

  resultadoDiv.innerHTML = `❌ ID <strong>${idBuscado}</strong> no encontrado en ningún NIF.`;
}

function updateButtons() {
  const prevBtn = document.getElementById('prevNifBtn');
  const nextBtn = document.getElementById('nextNifBtn');
  prevBtn.disabled = currentNifIndex <= 0;
  nextBtn.disabled = currentNifIndex >= nifsFiltrados.length - 1;
}

async function cargarDatos(nif) {
  let datos;
  try {
    const response = await fetch(`/data/${nif}`);
    if (!response.ok) throw new Error('Error al cargar datos');
    datos = await response.json();
    console.log(`Datos cargados para NIF ${nif}:`, datos);
  } catch (error) {
    console.error('Error al cargar datos, usando datos de prueba:', error);
    datos = [{
      id: 30159,
      nif_empresa: "619156757",
      numero_linea_bot: "BOT-5",
      name: "Backup01",
      estacion: "Backup01",
      servicios: JSON.stringify([{ tipo: "Fibra", plan: "Love Empresa Activa" }]),
      compromisos: JSON.stringify([{ numero: "", mes: "JUL", title: "Pac None Abril 20 2025-04-30 1 t", nif: "39860 OK" }]),
      detalles_linea: "",
      factura: "",
      factura_detalle: JSON.stringify([{
        title: "Pack Love Fútbol 2",
        amount: 111.57,
        details: []
      }, {
        title: "Consumos y otros servicios",
        amount: 4.12,
        details: []
      }, {
        title: "Descuentos y promociones cliente",
        amount: -0.35,
        details: []
      }, {
        title: "Venta a plazos",
        amount: 14.49,
        details: []
      }, {
        title: "IVA (21%)",
        amount: 24.22,
        details: []
      }]),
      factura_pdf: "",
      fecha_proces: "30/04/2025",
      info: "{\"nif\": \"39860998C\", \"nombre\": \"AURORA FORNOS VILANOVA\", \"details\": [\"Credito total del cliente:4000 €*\", \"Credito utilizado:0 € *\", \"Credito disponible:4000 € *\"], \"seg_fijo\": \"EMP - 1 lInea\", \"direccion\": \"AVENIDA MILALENARI, No 17, 43850, CAMBRILS, TARRAGONA\", \"seg_movil\": \"EMP - 1 lInea\", \"scoring_grey\": 10, \"scoring_orange\": 0}",
      mensaje_error: "",
      fechaAlta: "30/04/2025",
      "Nif Extraido": "39860998C",
      Plan: "Love Empresa Activa"
    }];
  }

  const contenedor = document.getElementById('output');
  const clienteCardContenedor = document.getElementById('clienteCard');
  const mapDetailsContenedor = document.getElementById('mapDetails');
  const tipoSectionContenedor = document.getElementById('tipoSection');
  contenedor.innerHTML = "";
  clienteCardContenedor.innerHTML = "";
  mapDetailsContenedor.innerHTML = "";
  tipoSectionContenedor.innerHTML = "";
  const data = datos[0];
  let geo = null;
  let tiendaCercana = null;

  let customerInfo = {};
  let cp = "N/A";
  try {
    customerInfo = JSON.parse(data.info || "{}");
    if (customerInfo.direccion) {
      const match = customerInfo.direccion.match(/\b\d{5}\b/);
      cp = match ? match[0] : "N/A";
    }
  } catch (e) {
    console.error('Error parsing info field:', e);
    customerInfo = { nombre: "No disponible", direccion: "No disponible" };
  }

  if (cp !== "N/A") {
    try {
      geo = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=España&format=json`)
        .then(res => res.json());
    } catch (error) {
      console.error('Error al obtener geolocalización:', error);
      geo = [];
    }

    if (geo.length > 0) {
      const lat = parseFloat(geo[0].lat);
      const lon = parseFloat(geo[0].lon);

      if (clienteMarker) map.removeLayer(clienteMarker);
      if (lineaRuta) map.removeLayer(lineaRuta);

      tiendaCercana = tiendas
        .map(t => ({
          ...t,
          distancia: calcularDistancia(lat, lon, parseFloat(t.lat), parseFloat(t.lng))
        }))
        .sort((a, b) => a.distancia - b.distancia)[0];

      const popupContent = `
        📍 Cliente<br/>CP: ${cp}<br><br>
        🏬 Tienda más cercana:<br><b>${tiendaCercana.nombre}</b><br>
        📏 Distancia: ${tiendaCercana.distancia.toFixed(2)} km
      `;

      clienteMarker = L.marker([lat, lon], {
        icon: L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(map)
        .bindPopup(popupContent, { autoClose: false })
        .on('mouseover', function () { this.openPopup(); })
        .on('mouseout', function () { this.closePopup(); });

      lineaRuta = L.polyline([[lat, lon], [parseFloat(tiendaCercana.lat), parseFloat(tiendaCercana.lng)]], {
        color: '#0077cc',
        weight: 3,
        dashArray: '5,5'
      }).addTo(map);

      map.setView([lat, lon], 11);
    }
  }

  clienteCardContenedor.innerHTML = `
    <div><strong>👤 Nombre:</strong> ${customerInfo.nombre || "No disponible"}</div><br>
    <div><strong>🏠 Dirección:</strong> ${customerInfo.direccion || "No disponible"}</div><br>
    <div><strong>🆔 DNI:</strong> ${data["Nif Extraido"] || "No disponible"}</div><br>
  `;

  let numerosConRenove = [];
  if (data.servicios) {
    try {
      const servicios = JSON.parse(data.servicios);
      servicios.forEach(item => {
        const renove = buscarClave(item, "Renove");
        if (item.numero && Array.isArray(renove) && renove.length && renove.join(", ") !== "Ninguno") {
          numerosConRenove.push({ numero: item.numero, renove: renove.join(", ") });
        }
      });
    } catch (e) {
      console.error('Error parsing servicios for Renove summary:', e);
    }
  }

  const resumenRenoveSection = document.createElement("div");
  resumenRenoveSection.innerHTML = `<h3>Resumen de Números con Renove</h3>`;

  const resumenRenoveCard = document.createElement("div");
  resumenRenoveCard.className = "resumen-renove-card";

  const tituloResumen = document.createElement("strong");
  tituloResumen.textContent = "📦 Números con Renove";
  resumenRenoveCard.appendChild(tituloResumen);

  if (numerosConRenove.length > 0) {
    const listaNumeros = document.createElement("div");
    listaNumeros.className = "detalle";
    listaNumeros.innerHTML = numerosConRenove
      .map(item => `<span class="numero-grande">${item.numero}</span> - Renove: <span class="renove-highlight">${item.renove}</span>`)
      .join("<br>");
    resumenRenoveCard.appendChild(listaNumeros);
  } else {
    const mensaje = document.createElement("div");
    mensaje.className = "detalle";
    mensaje.textContent = "No hay números con Renove.";
    resumenRenoveCard.appendChild(mensaje);
  }

  resumenRenoveSection.appendChild(resumenRenoveCard);
  contenedor.appendChild(resumenRenoveSection);

  let tipoServicios = "Tipo no especificado";
  if (data.servicios) {
    try {
      const servicios = JSON.parse(data.servicios);
      if (servicios.length > 0 && servicios[0].tipo) {
        tipoServicios = servicios[0].tipo;
      }
    } catch {
      tipoServicios = "Error al cargar el tipo";
    }
  }
  tipoSectionContenedor.innerHTML = `📝 Tipo: ${tipoServicios}`;

  if (cp !== "N/A" && geo && geo.length > 0 && tiendaCercana) {
    mapDetailsContenedor.innerHTML = `
      <strong>🏠 Código Postal:</strong> ${cp}<br>
      <strong>🏬 Tienda más cercana:</strong> ${tiendaCercana.nombre}<br>
      <strong>📏 Distancia:</strong> ${tiendaCercana.distancia.toFixed(2)} km
    `;
  }

  let detallesLineasMap = {};
  if (data.detalles_linea) {
    try {
      const detalles = JSON.parse(data.detalles_linea);
      detalles.forEach(d => { if (d.numero) detallesLineasMap[d.numero] = d; });
    } catch {}
  }

  const camposJson = [
    { campo: "servicios", titulo: "Servicios" },
    { campo: "factura", titulo: "Factura" },
    { campo: "factura_detalle", titulo: "Detalle de Factura" }
  ];

  camposJson.forEach(({ campo, titulo }) => {
    if (data[campo]) {
      const seccion = document.createElement("div");
      seccion.innerHTML = `<h3>${titulo}</h3>`;
      try {
        const contenido = JSON.parse(data[campo] || "[]");

        if (campo === "factura") {
          const canvasWrapper = document.createElement("div");
          canvasWrapper.style.padding = "10px";
          const canvas = document.createElement("canvas");
          canvas.height = 70;
          canvasWrapper.appendChild(canvas);
          seccion.appendChild(canvasWrapper);

          const meses = contenido.map(item => item.mes);
          const montos = contenido.map(item => {
            let valor = parseFloat(String(item.monto).replace(",", ".").replace("€", "").trim());
            return isNaN(valor) ? 0 : valor;
          });

          if (graficoFactura) graficoFactura.destroy();
          graficoFactura = new Chart(canvas, {
            type: 'bar',
            data: {
              labels: meses,
              datasets: [{
                label: 'Factura mensual (€)',
                data: montos,
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                datalabels: {
                  anchor: 'end',
                  align: 'end',
                  color: '#333',
                  font: { weight: 'bold' },
                  formatter: value => value.toFixed(2) + " €"
                },
                legend: { display: false }
              },
              scales: {
                x: { ticks: { color: '#333' }, grid: { display: false } },
                y: {
                  ticks: {
                    color: '#333',
                    callback: val => val + " €"
                  },
                  grid: { color: '#eee' }
                }
              }
            },
            plugins: [ChartDataLabels]
          });
        }

        if (campo === "factura_detalle") {
          const btnToggle = document.createElement("button");
          btnToggle.className = "btn-toggle";
          btnToggle.textContent = "Expandir/Colapsar Todo";
          btnToggle.onclick = () => {
            nodosFactura.forEach(({ chevron, children }) => {
              const isOpen = children.classList.contains("open");
              children.classList.toggle("open");
              chevron.textContent = isOpen ? "▶" : "▼";
            });
          };
          seccion.appendChild(btnToggle);

          checkboxesFactura = [];
          contenido.forEach(item => {
            const nodo = renderFacturaDetalle(item, 0);
            seccion.appendChild(nodo);
          });

          let totalInicial = 0;
          checkboxesFactura.forEach(cb => {
            totalInicial += parseFloat(cb.dataset.monto) || 0;
          });

          const totalDiv = document.createElement("div");
          totalDiv.id = "totalFacturaDesglosada";
          totalDiv.className = "detalle";
          totalDiv.style.fontWeight = "bold";
          totalDiv.style.marginTop = "10px";
          totalDiv.innerHTML = `💶 Total factura desglosada: ${totalInicial.toFixed(2)} € <br><br><br>`;
          seccion.appendChild(totalDiv);

          const additionalChargeInputDiv = document.createElement("div");
          additionalChargeInputDiv.id = "additionalChargeInput";
          additionalChargeInputDiv.style.marginTop = "10px";
          additionalChargeInputDiv.className = "detalle";
          additionalChargeInputDiv.innerHTML = `
            <label for="additionalCharge">➕ Cargo Adicional (€):</label>
            <input type="number" id="additionalCharge" value="0" min="0" step="0.01">
            <button id="calcularTotalBtn" class="nif-btn" style="margin-left: 10px;">Calcular Total</button>
          `;
          seccion.appendChild(additionalChargeInputDiv);

          const finalTotalDiv = document.createElement("div");
          finalTotalDiv.id = "totalFacturaConAdicional";
          finalTotalDiv.style.marginTop = "10px";
          finalTotalDiv.style.fontWeight = "bold";
          finalTotalDiv.className = "detalle";
          finalTotalDiv.textContent = `💶 Total con cargos adicionales: ${totalInicial.toFixed(2)} €`;
          seccion.appendChild(finalTotalDiv);

          const checkButton = () => {
            const calculateButton = document.getElementById("calcularTotalBtn");
            if (calculateButton) {
              calculateButton.addEventListener("click", () => {
                console.log("Botón 'Calcular Total' clicado");
                recalcularTotalFactura();
              });
            } else {
              console.error("Botón 'calcularTotalBtn' no encontrado en el DOM, reintentando...");
              setTimeout(checkButton, 100);
            }
          };
          checkButton();
        }

        if (campo === "servicios") {
          contenido.forEach(item => {
            const card = document.createElement("div");
            card.className = "servicio-card";

            const tituloCard = document.createElement("strong");
            tituloCard.textContent = "📱 " + (data.Plan || "Tipo desconocido");
            card.appendChild(tituloCard);

            if (item.etiquetas) {
              item.etiquetas.split("|").map(e => e.trim()).forEach(et => {
                const badge = document.createElement("span");
                badge.className = "badge";
                badge.textContent = et;
                card.appendChild(badge);
              });
            }

            if (item.numero) {
              const numero = document.createElement("div");
              numero.className = "detalle";
              const span = document.createElement("span");
              span.className = "numero-grande";
              span.textContent = item.numero;

              const botonCopiar = document.createElement("button");
              botonCopiar.textContent = "📋";
              botonCopiar.className = "copy-btn";
              botonCopiar.onclick = () => {
                navigator.clipboard.writeText(item.numero);
                botonCopiar.textContent = "✅";
                setTimeout(() => { botonCopiar.textContent = "📋"; }, 1500);
              };

              numero.appendChild(span);
              numero.appendChild(botonCopiar);
              card.appendChild(numero);
            }

            if (item.activo_desde) {
              const activo = divTexto(`<strong class="descriptor">📅</strong> ${item.activo_desde}`);
              activo.style.marginTop = "6px";
              card.appendChild(activo);
            }

            if (item.detalles) {
              item.detalles
                .split("|")
                .map(det => det.trim())
                .filter(det => !/compromisos/i.test(det) && !/consumo/i.test(det) && !/permanencia/i.test(det) && !/venta a plazos/i.test(det))
                .forEach((det, i) => {
                  let textoDetalle = det.toLowerCase().includes("dirección del servicio fijo")
                    ? `<strong class="descriptor">🏠 Dirección del servicio fijo:</strong> ${det.replace(/\n/g, ": ")}`
                    : `<strong class="descriptor">📋 Detalle:</strong> ${det.replace(/\n/g, ": ")}`;
                  const detalle = divTexto(textoDetalle);
                  if (i === 0) detalle.style.marginTop = "6px";
                  card.appendChild(detalle);
                });
            }

            const extrasBox = document.createElement("div");
            extrasBox.className = "extras-box";
            const extrasTitle = document.createElement("div");
            extrasTitle.style.marginBottom = "6px";
            extrasBox.appendChild(extrasTitle);

            const renove = buscarClave(item, "Renove");
            const descuentos = buscarClave(item, "Bonos y Descuen.");
            const textoExtras = `
              <strong class="descriptor">📦 Renove:</strong> <span class="renove-highlight">${Array.isArray(renove) && renove.length ? renove.join(", ") : "Ninguno"}</span><br><br>
              <strong class="descriptor">🎁 Descuentos:</strong> <span class="descuento-highlight">${Array.isArray(descuentos) && descuentos.length ? descuentos.join(", ") : "Ninguno"}</span>
            `;

            const extrasDetalle = document.createElement("div");
            extrasDetalle.className = "detalle";
            extrasDetalle.innerHTML = textoExtras;
            extrasBox.appendChild(extrasDetalle);
            card.appendChild(extrasBox);

            const detallesBox = document.createElement("div");
            detallesBox.className = "extras-box";
            detallesBox.style.marginTop = "10px";

            const detallesTitle = document.createElement("div");
            detallesTitle.style.marginBottom = "6px";
            detallesBox.appendChild(detallesTitle);

            const detallesContenido = document.createElement("div");
            detallesContenido.className = "detalle";

            const activoDesde = item.activo_desde || "-";
            const detallesTexto = item.detalles || "";
            const extraerCampo = (clave) => {
              if (!detallesTexto) return "No disponible";
              const secciones = detallesTexto.split("|").map(s => s.trim());
              for (let s of secciones) {
                const [k, ...resto] = s.split("\n");
                if (k.toLowerCase().includes(clave.toLowerCase())) {
                  return resto.join("\n").trim() || "No disponible";
                }
              }
              return "No disponible";
            };

            const consumo = detallesLineasMap[item.numero]?.consumo || extraerCampo("consumo");
            const permanencia = detallesLineasMap[item.numero]?.permanencia || extraerCampo("permanencia");
            const ventaPlazos = detallesLineasMap[item.numero]?.plazos || extraerCampo("venta a plazos");
            const dispositivoExtra = detallesLineasMap[item.numero]?.dispositivos || "-";

            detallesContenido.innerHTML = `
              <strong class="descriptor">📊 Consumo:</strong> ${consumo}<br>
              <strong class="descriptor">⏳ Permanencia:</strong> ${permanencia}<br>
              <strong class="descriptor">💰 Venta a Plazos:</strong> ${ventaPlazos}<br>
              <strong class="descriptor">📱 Dispositivo en Uso:</strong> ${dispositivoExtra !== "-" ? dispositivoExtra : "No disponible"}<br>
            `;

            detallesBox.appendChild(detallesContenido);
            card.appendChild(detallesBox);

            if (data.compromisos) {
              try {
                const compromisos = JSON.parse(data.compromisos);
                const relacionados = compromisos.filter(c => c.id === item.numero);
                if (relacionados.length > 0) {
                  relacionados.forEach(comp => {
                    const compromisoBox = document.createElement("div");
                    compromisoBox.className = "extras-box";
                    compromisoBox.style.marginTop = "10px";

                    const compromisoTitle = document.createElement("div");
                    compromisoTitle.style.marginBottom = "6px";
                    compromisoBox.appendChild(compromisoTitle);

                    const compromisoDetalle = document.createElement("div");
                    compromisoDetalle.className = "detalle";
                    compromisoDetalle.innerHTML = `
                      <strong class="descriptor">📝 Motivo:</strong> ${comp.motivo || "Sin motivo"}<br>
                      <strong class="descriptor">⏳ Periodo:</strong> ${comp.f_inicio || "?"} → ${comp.f_fin || "?"}<br>
                      <strong class="descriptor">📆 Duración:</strong> ${comp.duracion || "-"}<br>
                      <strong class="descriptor">📄 Resan:</strong> ${comp.resumen || "-"}
                    `;
                    compromisoBox.appendChild(compromisoDetalle);

                    card.appendChild(compromisoBox);
                  });
                }
              } catch (e) {
                console.warn("Error al parsear compromisos", e);
              }
            }

            seccion.appendChild(card);
          });
        }

      } catch (e) {
        seccion.innerHTML += `<p style="color:red;">⚠️ Error al interpretar ${campo}</p>`;
      }
      contenedor.appendChild(seccion);
    }
  });
}

function buscarProfundamente(obj, clave, valorBuscado) {
  if (typeof obj !== "object" || obj === null) return false;

  if (obj[clave] && String(obj[clave]).includes(valorBuscado)) return true;

  for (const key in obj) {
    if (typeof obj[key] === "object") {
      if (buscarProfundamente(obj[key], clave, valorBuscado)) return true;
    }
  }

  return false;
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function renderFacturaDetalle(item, nivel = 0) {
  const container = document.createElement("div");
  container.className = "factura-nodo";

  const header = document.createElement("div");
  header.className = `factura-nodo-header nivel-${nivel}`;

  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.textContent = '▶';
  header.appendChild(chevron);

  const texto = document.createElement("span");
  const monto = typeof item.amount === "number"
    ? item.amount
    : parseFloat((item.amount || "").replace(",", ".").replace("€", "").trim()) || 0;
  texto.textContent = `${item.title || item.key || ""}: ${monto.toFixed(2)} €`;
  header.appendChild(texto);

  let checkbox;
  if (!Array.isArray(item.details) || item.details.length === 0) {
    chevron.style.visibility = "hidden";

    checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.style.marginLeft = "8px";
    checkbox.dataset.monto = monto.toFixed(2);
    checkbox.addEventListener("change", recalcularTotalFactura);
    header.appendChild(checkbox);
    checkboxesFactura.push(checkbox);
  }

  container.appendChild(header);

  if (Array.isArray(item.details) && item.details.length > 0) {
    const children = document.createElement("div");
    children.className = "factura-children";
    item.details.forEach(sub => children.appendChild(renderFacturaDetalle(sub, nivel + 1)));
    container.appendChild(children);
    header.addEventListener("click", () => {
      const isOpen = children.classList.contains("open");
      children.classList.toggle("open");
      chevron.textContent = isOpen ? "▶" : "▼";
    });
    nodosFactura.push({ chevron, children });
  }

  return container;
}

function recalcularTotalFactura() {
  let total = 0;
  checkboxesFactura.forEach(cb => {
    if (cb.checked) {
      total += parseFloat(cb.dataset.monto) || 0;
    }
  });

  const totalElement = document.getElementById("totalFacturaDesglosada");
  if (totalElement) {
    totalElement.innerHTML = `💶 Total factura desglosada: ${total.toFixed(2)} € <br><br><br>`;
  }

  const additionalChargeInput = document.getElementById("additionalCharge");
  let additionalCharge = parseFloat(additionalChargeInput?.value) || 0;

  const finalTotal = total + additionalCharge;
  const finalTotalElement = document.getElementById("totalFacturaConAdicional");
  if (finalTotalElement) {
    finalTotalElement.textContent = `💶 Total con cargos adicionales: ${finalTotal.toFixed(2)} €`;
  }
}

function divTexto(texto) {
  const d = document.createElement("div");
  d.className = "detalle";
  d.innerHTML = texto;
  return d;
}

function buscarClave(obj, clave) {
  if (!obj || typeof obj !== 'object') return null;
  if (clave in obj) return obj[clave];
  for (const k in obj) {
    const res = buscarClave(obj[k], clave);
    if (res !== null && res !== undefined) return res;
  }
  return null;
}

function actualizarFechaHora() {
  const now = new Date();
  const opciones = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const formato = now.toLocaleString('es-ES', opciones);
  document.getElementById("fechaHoraActual").textContent = `📅 ${formato}`;
}

setInterval(actualizarFechaHora, 1000);
actualizarFechaHora();

cargarTiendas();
cargarNifs();
