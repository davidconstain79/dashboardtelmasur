let map, tiendas = [], nifs = [], datos = [], uniquePlans = [];
let currentNifIndex = 0;

// Initialize map
function initMap() {
  map = L.map('map').setView([40.4168, -3.7038], 6); // Centered on Madrid
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);
}

// Load store data from CSV
async function cargarTiendas() {
  try {
    const response = await fetch('stores.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, URL: ${response.url}`);
    }
    const text = await response.text();
    tiendas = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true, 
      delimiter: ';' 
    }).data;
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
    console.error('Error al cargar stores.csv:', error.message);
    console.error('Usando datos de prueba');
    tiendas = [
      { nombre: "TD Camarena", cp: "28047", lat: 40.387, lng: -3.751 },
      { nombre: "TD Torrijos", cp: "45500", lat: 39.983, lng: -4.283 },
      { nombre: "FQ C.C. Valdemoro", cp: "28340", lat: 40.19, lng: -3.673 }
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

// Load NIFs from API or customer CSV
async function cargarNifs() {
  try {
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' }).data;
    nifs = parsed.map(row => row['Nif Extraido']).filter(nif => nif);
    console.log('NIFs cargados desde CSV:', nifs);
  } catch (error) {
    console.error('Error al cargar NIFs:', error.message);
    nifs = ["X9430481K", "02248434T", "54495405X"];
    console.log('Usando NIFs de prueba:', nifs);
  }

  const datalist = document.getElementById('nifList');
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

// Load customer data for a specific NIF
async function cargarDatos(nif) {
  try {
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' }).data;
    const cliente = parsed.find(row => row['Nif Extraido'] === nif);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
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
          }).addTo(map).bindPopup(`📍 Cliente: ${info.nombre}<br/>CP: ${cp}`);
          map.setView([lat, lon], 12);
        }
      } catch (geoError) {
        console.error('Error al geocodificar CP:', geoError.message);
      }
    }

    // Update billing chart
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
          data: factura.map(f => parseFloat(f.monto.replace(' €', ''))),
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
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' }).data;
    uniquePlans = [...new Set(parsed.map(row => row.Plan).filter(plan => plan))];
    console.log('Planes únicos:', uniquePlans);

    const planFilter = document.getElementById('planFilter');
    uniquePlans.forEach(plan => {
      const option = document.createElement('option');
      option.value = plan;
      option.textContent = plan;
      planFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar planes:', error.message);
    uniquePlans = ["Love FUtbol 2", "Love Futbol Total 4 2024", "Love Cine y Series Total 4 2024"];
    const planFilter = document.getElementById('planFilter');
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
    const response = await fetch('pruebabase_procesado.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: ';' }).data;
    nifs = plan ? parsed.filter(row => row.Plan === plan).map(row => row['Nif Extraido']) : parsed.map(row => row['Nif Extraido']);
    console.log('NIFs filtrados por plan:', nifs);

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
  initMap();
  await cargarTiendas();
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
    currentNifIndex = 0;
    filtrarPorPlan(plan);
  });
});
