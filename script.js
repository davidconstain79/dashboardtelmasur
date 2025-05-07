let map, tiendas = [], nifs = [], datos = [], uniquePlans = [];
let currentNifIndex = 0;

// Initialize map
function initMap() {
  map = L.map('map').setView([40.4168, -3.7038], 6); // Centered on Madrid
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);
}

// Load store data (hardcoded for now)
function cargarTiendas() {
  console.log('Cargando tiendas (usando datos de prueba debido a falta de stores.csv)');
  tiendas = [
    { nombre: "TD Camarena", cp: "28047", lat: 40.387, lng: -3.751 },
    { nombre: "TD Torrijos", cp: "45500", lat: 39.983, lng: -4.283 },
    { nombre: "FQ C.C. Valdemoro", cp: "28340", lat: 40.19, lng: -3.673 }
  ];

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

  // To use a store CSV, uncomment and adjust the following:
  /*
  async function loadStoresCsv() {
    try {
      const response = await fetch('stores.csv');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const text = await response.text();
      tiendas = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' }).data;
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
      console.error('Error al cargar stores.csv:', error.message);
    }
  }
  loadStoresCsv();
  */
}

// Load NIFs from pruebabase_procesado.csv
async function cargarNifs() {
  try {
    console.log('Intentando cargar pruebabase_procesado.csv');
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, URL: ${response.url}`);
    }
    const text = await response.text();
    console.log('Contenido del CSV (primeros 200 caracteres):', text.substring(0, 200));
    const parsed = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true, 
      delimiter: ';' 
    });
    if (parsed.errors.length > 0) {
      throw new Error(`Errores al parsear CSV: ${JSON.stringify(parsed.errors)}`);
    }
    nifs = parsed.data.map(row => row['Nif Extraido']).filter(nif => nif);
    console.log('NIFs cargados desde CSV:', nifs);

    const datalist = document.getElementById('nifList');
    datalist.innerHTML = '';
    nifs.forEach(nif => {
      const option = document.createElement('option');
      option.value = nif;
      datalist.appendChild(option);
    });

    if (nifs.length > 0) {
      document.getElementById('nifInput').value = nifs[0];
      currentNifIndex = 0;
      cargarDatos(nifs[0]);
    } else {
      throw new Error('No se encontraron NIFs en el CSV');
    }
  } catch (error) {
    console.error('Error al cargar NIFs:', error.message);
    nifs = ["X9430481K", "02248434T", "54495405X"];
    console.log('Usando NIFs de prueba:', nifs);

    const datalist = document.getElementById('nifList');
    datalist.innerHTML = '';
    nifs.forEach(nif => {
      const option = document.createElement('option'); // Fixed typo
      option.value = nif;
      datalist.appendChild(option);
    });

    if (nifs.length > 0) {
      document.getElementById('nifInput').value = nifs[0];
      cargarDatos(nifs[0]);
    }
  }
}

// Load customer data for a specific NIF
async function cargarDatos(nif) {
  try {
    console.log(`Cargando datos para NIF: ${nif}`);
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, URL: ${response.url}`);
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' });
    if (parsed.errors.length > 0) {
      throw new Error(`Errores al parsear CSV: ${JSON.stringify(parsed.errors)}`);
    }
    const cliente = parsed.data.find(row => row['Nif Extraido'] === nif);
    if (!cliente) {
      throw new Error(`Cliente no encontrado para NIF: ${nif}`);
    }

    datos = cliente;
    console.log('Datos del cliente:', datos);

    // Update cliente info
    const clienteCard = document.getElementById('clienteCard');
    const info = JSON.parse(datos.info || '{}');
    clienteCard.innerHTML = `
      <h3>${info.nombre || 'Sin nombre'}</h3>
      <p><strong>NIF:</strong> ${nif}</p>
      <p><strong>Dirección:</strong> ${info.direccion || 'Sin dirección'}</p>
      <p><strong>CP:</strong> ${datos.CP || 'Sin CP'}</p>
      <p><strong>Plan:</strong> ${datos.Plan || 'Sin plan'}</p>
    `;

    // Geocode customer location
    const cp = datos.CP;
    if (cp) {
      try {
        console.log(`Geocodificando CP: ${cp}`);
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=Spain&format=json&limit=1`);
        const geoData = await geoResponse.json();
        if (geoData.length > 0) {
          const { lat, lon } = geoData[0];
          L.marker([lat, lon], {
            icon: L.icon({
              iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
              iconSize: [32, 32],
              iconAnchor: [16, 32]
            })
          }).addTo(map).bindPopup(`📍 Cliente: ${info.nombre || 'Sin nombre'}<br/>CP: ${cp}`);
          map.setView([lat, lon], 12);
        } else {
          console.warn(`No se encontraron coordenadas para CP: ${cp}`);
        }
      } catch (geoError) {
        console.error('Error al geocodificar CP:', geoError.message);
      }
    }

    // Update billing chart
    if (typeof Chart === 'undefined') {
      console.error('Chart.js no está cargado. Asegúrese de incluir la librería en index.html.');
      document.getElementById('output').innerHTML = '<p>Error: Chart.js no está disponible.</p>';
      return;
    }
    const factura = JSON.parse(datos.factura || '[]');
    const ctx = document.createElement('canvas');
    document.getElementById('output').innerHTML = '';
    document.getElementById('output').appendChild(ctx);
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: factura.map(f => f.mes),
        datasets: [{
          label: 'Facturación (€)',
          data: factura.map(f => parseFloat(f.monto.replace(' €', '').replace(',', '.'))),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: value => value.toFixed(2) + ' €'
          }
        }
      }
    });

  } catch (error) {
    console.error('Error al cargar datos del NIF:', error.message);
    document.getElementById('clienteCard').innerHTML = '<p>Error al cargar datos del cliente.</p>';
    document.getElementById('output').innerHTML = '<p>Error al cargar facturación.</p>';
  }
}

// Load unique plans for filtering
async function cargarPlanesUnicos() {
  try {
    console.log('Cargando planes únicos desde pruebabase_procesado.csv');
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, URL: ${response.url}`);
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' });
    if (parsed.errors.length > 0) {
      throw new Error(`Errores al parsear CSV: ${JSON.stringify(parsed.errors)}`);
    }
    uniquePlans = [...new Set(parsed.data.map(row => row.Plan).filter(plan => plan))];
    console.log('Planes únicos:', uniquePlans);

    const planFilter = document.getElementById('planFilter');
    planFilter.innerHTML = '<option value="">Todos los planes</option>'; // Add default option
    uniquePlans.forEach(plan => {
      const option = document.createElement('option');
      option.value = plan;
      option.textContent = plan;
      planFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar planes:', error.message);
    uniquePlans = ["Love FUtbol 2", "Love Futbol Total 4 2024", "Love Cine y Series Total 4 2024"];
    console.log('Usando planes de prueba:', uniquePlans);
    const planFilter = document.getElementById('planFilter');
    planFilter.innerHTML = '<option value="">Todos los planes</option>';
    uniquePlans.forEach(plan => {
      const option = document.createElement('option');
      option.value = plan;
      option.textContent = plan;
      planFilter.appendChild(option);
    });
  }
}

// Filter NIFs by plan
async function filtrarPorPlan(plan) {
  try {
    console.log(`Filtrando NIFs por plan: ${plan || 'Todos'}`);
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, URL: ${response.url}`);
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' });
    if (parsed.errors.length > 0) {
      throw new Error(`Errores al parsear CSV: ${JSON.stringify(parsed.errors)}`);
    }
    nifs = plan ? parsed.data.filter(row => row.Plan === plan).map(row => row['Nif Extraido']) : parsed.data.map(row => row['Nif Extraido']);
    console.log('NIFs filtrados:', nifs);

    const datalist = document.getElementById('nifList');
    datalist.innerHTML = '';
    nifs.forEach(nif => {
      const option = document.createElement('option');
      option.value = nif;
      datalist.appendChild(option);
    });

    if (nifs.length > 0) {
      currentNifIndex = 0;
      document.getElementById('nifInput').value = nifs[0];
      cargarDatos(nifs[0]);
    } else {
      document.getElementById('nifInput').value = '';
      document.getElementById('clienteCard').innerHTML = '<p>No se encontraron clientes para este plan.</p>';
      document.getElementById('output').innerHTML = '';
    }
  } catch (error) {
    console.error('Error al filtrar por plan:', error.message);
    nifs = ["X9430481K", "02248434T", "54495405X"];
    const datalist = document.getElementById('nifList');
    datalist.innerHTML = '';
    nifs.forEach(nif => {
      const option = document.createElement('option');
      option.value = nif;
      datalist.appendChild(option);
    });
    if (nifs.length > 0) {
      document.getElementById('nifInput').value = nifs[0];
      cargarDatos(nifs[0]);
    }
  }
}

// Search by phone number
function buscarIdEnServicios() {
  const idSearch = document.getElementById('idSearch').value.trim();
  const resultado = document.getElementById('idSearchResultado');
  if (!idSearch) {
    resultado.innerHTML = 'Por favor, ingrese un número de teléfono.';
    return;
  }

  try {
    const servicios = JSON.parse(datos.servicios || '[]');
    const servicio = servicios.find(s => s.numero === idSearch);
    if (servicio) {
      resultado.innerHTML = `Encontrado: ${servicio.plan} (${servicio.tipo})`;
      cargarDatos(datos['Nif Extraido']);
    } else {
      resultado.innerHTML = 'Número no encontrado en los servicios.';
    }
  } catch (error) {
    console.error('Error al buscar ID:', error.message);
    resultado.innerHTML = 'Error al realizar la búsqueda.';
  }
}

// Update date and time
function actualizarFechaHora() {
  const fechaHoraActual = document.getElementById('fechaHoraActual');
  const ahora = new Date();
  fechaHoraActual.textContent = ahora.toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando dashboard...');
  initMap();
  cargarTiendas();
  await cargarNifs();
  await cargarPlanesUnicos();
  actualizarFechaHora();
  setInterval(actualizarFechaHora, 1000);

  document.getElementById('prevNifBtn').addEventListener('click', () => {
    if (currentNifIndex > 0) {
      currentNifIndex--;
      document.getElementById('nifInput').value = nifs[currentNifIndex];
      cargarDatos(nifs[currentNifIndex]);
    }
  });

  document.getElementById('nextNifBtn').addEventListener('click', () => {
    if (currentNifIndex < nifs.length - 1) {
      currentNifIndex++;
      document.getElementById('nifInput').value = nifs[currentNifIndex];
      cargarDatos(nifs[currentNifIndex]);
    }
  });

  document.getElementById('nifInput').addEventListener('change', (e) => {
    const nif = e.target.value;
    currentNifIndex = nifs.indexOf(nif);
    if (currentNifIndex !== -1) {
      cargarDatos(nif);
    }
  });

  document.getElementById('planFilter').addEventListener('change', (e) => {
    const plan = e.target.value;
    filtrarPorPlan(plan);
  });

  // Add event listener for phone number search
  const searchButton = document.getElementById('idSearchButton');
  if (searchButton) {
    searchButton.addEventListener('click', buscarIdEnServicios);
  } else {
    console.warn('Botón de búsqueda (idSearchButton) no encontrado. Asegúrese de incluirlo en index.html.');
  }
});
