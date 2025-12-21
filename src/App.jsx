import { useState, useEffect, useMemo } from 'react';
import './App.css';
import CustomSelect from './components/CustomSelect';
import {
  IoCalendarOutline,
  IoDownloadOutline,
  IoLogoRss,
  IoLocationOutline
} from 'react-icons/io5';

// Waste type colors mapping
const WASTE_COLORS = {
  'Biodéchets': '#10b981', // Green
  'Valorlux': '#06b6d4', // Cyan
  'Papier/Carton': '#3b82f6', // Blue
  'Verre': '#854d0e', // Brown
  'Déchets ménagers en mélange': '#6b7280', // Gray
  'SuperDrecksKëscht': '#ef4444', // Red
  'Arbres de Noël': '#059669', // Green
  'Encombrants': '#8b5cf6', // Violet
  'Ferraille': '#64748b', // Slate
  'Bois': '#a16207', // Yellow-Brown
  'Pneus': '#1f2937', // Dark
  'Vêtements': '#db2777', // Pink
};

// Aggressive fuzzy normalization: remove accents, lowercase, remove all non-alphanumeric chars
const normalizeStr = (str) => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // remove non-alphanumeric (spaces, dashes, apostrophes)
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  // Selection State
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('');
  const [selectedStreet, setSelectedStreet] = useState('');

  // Derived State
  const [schedule, setSchedule] = useState([]);
  const [nextCollections, setNextCollections] = useState([]);
  const [icsFile, setIcsFile] = useState(null);

  // Load Data
  useEffect(() => {
    fetch('/waste_collection.json')
      .then(res => res.json())
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data", err);
        setLoading(false);
      });
  }, []);

  // Compute Options
  const communeOptions = useMemo(() => {
    return data.map(c => ({ value: c.commune, label: c.commune }));
  }, [data]);

  const localityOptions = useMemo(() => {
    if (!selectedCommune) return [];
    const communeObj = data.find(c => c.commune === selectedCommune);
    if (!communeObj) return [];

    return communeObj.localities.map(l => ({
      value: l.name || 'default',
      label: l.name || 'Toutes les localités'
    }));
  }, [data, selectedCommune]);

  // Derived Streets
  const streetOptions = useMemo(() => {
    if (!selectedLocality) return [];
    const communeObj = data.find(c => c.commune === selectedCommune);
    if (!communeObj) return [];

    const locObj = communeObj.localities.find(l => (l.name || 'default') === selectedLocality);
    if (!locObj) return [];

    return locObj.streets.map(s => ({
      value: s.name,
      label: s.name || 'Toutes les rues'
    }));
  }, [data, selectedCommune, selectedLocality]);

  // Helper to update schedule state from a street object
  const updateScheduleForStreet = (streetObj) => {
    if (!streetObj) {
      setSchedule([]);
      setNextCollections([]);
      setIcsFile(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = streetObj.collectes
      .filter(ev => new Date(ev.date_iso) >= today)
      .sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso));

    // Group by date for the list
    const groupedByDate = {};
    future.forEach(ev => {
      if (!groupedByDate[ev.date_iso]) {
        groupedByDate[ev.date_iso] = {
          date_iso: ev.date_iso,
          jour_semaine: ev.jour_semaine,
          types: []
        };
      }
      groupedByDate[ev.date_iso].types.push(ev.type);
    });

    const groupedList = Object.values(groupedByDate).sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso));

    groupedList.forEach(group => {
      group.types.sort();
    });

    setSchedule(groupedList);

    if (future.length > 0) {
      const nextDate = future[0].date_iso;
      const nextBatch = future.filter(ev => ev.date_iso === nextDate);
      nextBatch.sort((a, b) => a.type.localeCompare(b.type));
      setNextCollections(nextBatch);
    } else {
      setNextCollections([]);
    }

    setIcsFile(streetObj.ics_filename);
  };

  // Handlers
  const handleCommuneChange = (val) => {
    setSelectedCommune(val);
    setSelectedLocality('');
    setSelectedStreet('');
    setSchedule([]);
    setNextCollections([]);
    setIcsFile(null);
  };

  const handleLocalityChange = (val) => {
    setSelectedLocality(val);
    setSelectedStreet('');
    setSchedule([]);
    setNextCollections([]);
    setIcsFile(null);
  };

  const handleStreetChange = (val) => {
    setSelectedStreet(val);

    // Find schedule
    const communeObj = data.find(c => c.commune === selectedCommune);
    const locObj = communeObj?.localities.find(l => (l.name || 'default') === selectedLocality);
    const streetObj = locObj?.streets.find(s => s.name === val);

    updateScheduleForStreet(streetObj);
  };

  // Auto-select logic
  useEffect(() => {
    if (localityOptions.length === 1 && selectedLocality !== localityOptions[0].value) {
      handleLocalityChange(localityOptions[0].value);
    }
  }, [localityOptions]);

  useEffect(() => {
    if (streetOptions.length === 1 && selectedStreet !== streetOptions[0].value) {
      handleStreetChange(streetOptions[0].value);
    }
  }, [streetOptions]);


  // Geolocation Logic
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Fetch address from OpenStreetMap Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(geoData => {
            const addr = geoData.address;
            if (!addr) {
              alert("Impossible de déterminer l'adresse.");
              setLocating(false);
              return;
            }

            console.log("Geo Address:", addr);

            // Try to match Commune
            const communeName = addr.town || addr.city || addr.village || addr.municipality;
            if (!communeName) {
              setLocating(false);
              return;
            }

            const normCommune = normalizeStr(communeName);
            const foundCommune = data.find(c => normalizeStr(c.commune) === normCommune);

            if (foundCommune) {
              setSelectedCommune(foundCommune.commune);

              let foundLocality = null;

              // Priority to auto-selection logic if only 1 locality
              if (foundCommune.localities.length === 1) {
                foundLocality = foundCommune.localities[0];
              } else {
                // Try to match Locality
                const localityName = addr.suburb || addr.quarter || addr.village || addr.town || addr.city;
                if (localityName) {
                  const normLocality = normalizeStr(localityName);
                  foundLocality = foundCommune.localities.find(l => {
                    const lName = l.name || 'default';
                    return normalizeStr(lName) === normLocality;
                  });
                }
                // Fallback
                if (!foundLocality) {
                  foundLocality = foundCommune.localities.find(l => normalizeStr(l.name || '') === normCommune);
                }
              }

              if (foundLocality) {
                const locValue = foundLocality.name || 'default';
                setSelectedLocality(locValue);

                // Try to match Street
                const roadName = addr.road || addr.pedestrian || addr.residential;
                if (roadName) {
                  const normRoad = normalizeStr(roadName);
                  const foundStreet = foundLocality.streets.find(s => normalizeStr(s.name) === normRoad);

                  if (foundStreet) {
                    setSelectedStreet(foundStreet.name);
                    updateScheduleForStreet(foundStreet);
                  } else {
                    setSelectedStreet('');
                    updateScheduleForStreet(null);
                  }
                } else {
                  setSelectedStreet('');
                  updateScheduleForStreet(null);
                }
              } else {
                setSelectedLocality('');
                setSelectedStreet('');
                updateScheduleForStreet(null);
              }
            } else {
              alert("Commune non trouvée dans le calendrier: " + communeName);
            }
            setLocating(false);
          })
          .catch(err => {
            console.error(err);
            alert("Erreur lors de la récupération de l'adresse.");
            setLocating(false);
          });
      },
      (error) => {
        console.error(error);
        alert("Erreur de géolocalisation: " + error.message);
        setLocating(false);
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" style={{ height: '100vh' }}>
        <div className="spinner">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>Calendrier Déchets</h1>
        <p>Luxembourg Waste Collection Schedule</p>
      </div>

      <div className="glass-card selection-card">
        <button
          className={`locate-btn ${locating ? 'loading' : ''}`}
          onClick={handleLocateMe}
          disabled={locating}
          title="Me localiser"
        >
          <IoLocationOutline size={18} />
          {locating ? '...' : 'Me Localiser'}
        </button>

        <CustomSelect
          label="1. Commune"
          placeholder="Selectionner une commune..."
          options={communeOptions}
          value={selectedCommune}
          onChange={handleCommuneChange}
        />

        <CustomSelect
          label="2. Localité"
          placeholder={!selectedCommune ? "En attente..." : "Selectionner une localité..."}
          options={localityOptions}
          value={selectedLocality}
          onChange={handleLocalityChange}
          disabled={!selectedCommune}
        />

        <CustomSelect
          label="3. Rue"
          placeholder={!selectedLocality ? "En attente..." : "Selectionner une rue..."}
          options={streetOptions}
          value={selectedStreet}
          onChange={handleStreetChange}
          disabled={!selectedLocality}
        />
      </div>

      {nextCollections.length > 0 && (
        <div className="highlight-card bg-glass">
          <div className="highlight-header">
            <p>Prochaine Collecte</p>
            <div className="date-badge">
              <IoCalendarOutline />
              <span>
                {nextCollections[0].jour_semaine} {nextCollections[0].date_iso.split('-').reverse().join('/')}
              </span>
            </div>
          </div>

          <div className="next-items-list">
            {nextCollections.map((col, idx) => (
              <div
                key={idx}
                className="collection-badge"
                style={{
                  '--badge-color': WASTE_COLORS[col.type] || '#666',
                  boxShadow: `0 4px 15px -3px ${WASTE_COLORS[col.type] || '#666'}66`
                }}
              >
                {col.type}
              </div>
            ))}
          </div>

          <IoCalendarOutline className="highlight-icon" />
        </div>
      )}

      {selectedStreet && icsFile && (
        <div className="actions-container">
          <div className="glass-card action-card">
            <div className="action-info">
              <h3>Téléchargement Unique</h3>
              <p>Téléchargez le fichier .ics pour l'importer manuellement dans votre calendrier. C'est une copie statique (one-shot) des dates actuelles.</p>
            </div>
            <a href={`/ics/${icsFile}`} download className="download-btn">
              <IoDownloadOutline size={20} />
              <span>Télécharger .ics</span>
            </a>
          </div>

          <div className="glass-card action-card">
            <div className="action-info">
              <h3>Abonnement Automatique</h3>
              <p>Abonnez-vous pour que votre calendrier reste toujours à jour automatiquement. Si vous préférez ne pas vous abonner, utilisez le téléchargement classique.</p>
            </div>
            <a href={`webcal://${window.location.host}/ics/${icsFile}`} className="subscribe-btn">
              <IoLogoRss size={20} />
              <span>S'abonner</span>
            </a>
          </div>
        </div>
      )}

      {schedule.length > 0 && (
        <div className="glass-card schedule-container">
          <div className="schedule-header">
            Calendrier 2025-2026
          </div>
          <div className="schedule-list">
            {schedule.map((group, idx) => (
              <div key={idx} className="schedule-item">
                <div className="waste-group-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {group.types.map(type => (
                    <div className="waste-type" key={type}>
                      <div
                        className="color-dot"
                        style={{
                          color: WASTE_COLORS[type] || '#ccc',
                          background: WASTE_COLORS[type] || '#ccc'
                        }}
                      />
                      <span>{type}</span>
                    </div>
                  ))}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {group.date_iso.split('-').reverse().join('/')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="footer">
        <a href="https://data.public.lu/fr/datasets/waste-municipal-waste-collection-calendars-dechets-calendriers-municipaux-de-collecte-des-dechets/" target="_blank" rel="noopener noreferrer">Données ouvertes du Luxembourg</a>
        <span className="separator">•</span>
        <a href="https://antigravity.app" target="_blank" rel="noopener noreferrer">Design by Antigravity</a>
        <span className="separator">•</span>
        <a href="https://thibaultmilan.com" target="_blank" rel="noopener noreferrer">Created by Thibault Milan</a>
      </div>
    </div>
  );
}

export default App;
