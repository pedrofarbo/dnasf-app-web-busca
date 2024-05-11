import 'maplibre-gl/dist/maplibre-gl.css';
import 'primeicons/primeicons.css';
import { PrimeReactProvider } from 'primereact/api';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { ConfirmPopup } from 'primereact/confirmpopup';
import { Menu } from 'primereact/menu';
import "primereact/resources/themes/lara-light-cyan/theme.css";
import { useEffect, useRef, useState } from 'react';
import { Layer, LayerProps, Marker, Source } from 'react-map-gl';
import Map from 'react-map-gl/maplibre';
import './App.css';
import logo from './logo.png';
import { Dialog } from 'primereact/dialog';
import { Fieldset } from 'primereact/fieldset';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';

export const clusterLayer: LayerProps = {
  id: 'clusters',
  type: 'circle',
  source: 'rescuePointsSource',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], 'red', 100, 'red', 750, 'red'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
  }
};

export const clusterCountLayer: LayerProps = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'rescuePointsSource',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  }
};

export const unclusteredPointLayer: LayerProps = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'rescuePointsSource',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': 'red',
    'circle-radius': 4,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff'
  }
};

export const BasePointLayer: LayerProps = {
  id: 'base-point',
  type: 'circle',
  source: 'basePointsSource',
  paint: {
    'circle-color': 'green',
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#000'
  }
};


function App() {
  const [coordenadas, setCoordenadas] = useState<any>({ latitude: 0, longitude: 0 });
  const [mapClickCoords, setMapClickCoords] = useState<any>({ latitude: 0, longitude: 0 });
  const [mapClickPointId, setMapClickPointId] = useState<any>("");
  const [rescuePoints, setRescuePoints] = useState<any>({});
  const [basePoints, setBasePoints] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const menuBase = useRef(null);
  const menuPoint = useRef(null);
  const toast = useRef(null);
  const [showDialogBase, setShowDialogBase] = useState<boolean>(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState<boolean>(false);
  const [showConfirmationDialogBusca, setShowConfirmationDialogBusca] = useState<boolean>(false);
  const [baseObject, setBaseObject] = useState<any>({});
  const BASE_URL = "https://dnasf-api-resgate-e6cfe2k6ya-uw.a.run.app";

  const itemsMenuPoints = [
    {
      label: `Latitude ${mapClickCoords.latitude} - Longitude ${mapClickCoords.longitude}`,
      items: [
        {
          label: 'Marcar como resgatado',
          icon: 'pi pi-check',
          command: (e: any) => {
            setShowConfirmationDialog(true);
          }
        },
        {
          label: 'Navegar',
          icon: 'pi pi-map',
          command: (e: any) => {
            window.open(`https://www.waze.com/ul?ll=${mapClickCoords.latitude},${mapClickCoords.longitude}&navigate=yes&zoom=17`, '_blank');
          }
        },
        {
          label: 'Fechar',
          icon: 'pi pi-times'
        }
      ]
    }
  ];

  const itemsMenuBase = [
    {
      label: `Latitude ${mapClickCoords.latitude} - Longitude ${mapClickCoords.longitude}`,
      items: [
        {
          label: 'Navegar',
          icon: 'pi pi-map',
          command: (e: any) => {
            window.open(`https://www.waze.com/ul?ll=${mapClickCoords.latitude},${mapClickCoords.longitude}&navigate=yes&zoom=17`, '_blank');
          }
        },
        {
          label: 'Fechar',
          icon: 'pi pi-times'
        }
      ]
    }
  ];

  const load = async () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        setCoordenadas({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });

        await loadBasePoints();
        await loadRescuePoints();

        setLoading(false);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  const loadBasePoints = async () => {
    try {
      const response = await fetch(BASE_URL + '/api/v1/rescue-bases/all');
      const data = await response.json();
      console.log(data);
      setBasePoints(data);
    } catch (error) {
      console.error(error);
    }
  }

  const loadRescuePoints = async () => {
    try {
      const response = await fetch(BASE_URL + '/api/v1/rescue-points/all');
      const data = await response.json();
      console.log(data);
      setRescuePoints(data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const mapRef = useRef<any>();

  const mapClick = (event: any) => {
    if (mapRef.current) {
      mapRef.current.queryRenderedFeatures(event.point, { layers: ['base-point'] }).forEach((feature: any) => {
        if (menuBase.current) {
          setMapClickCoords({ latitude: feature.geometry.coordinates[1], longitude: feature.geometry.coordinates[0] });
          (menuBase.current as any).toggle(event.originalEvent, feature);
        }
      });

      mapRef.current.queryRenderedFeatures(event.point, { layers: ['clusters'] }).forEach((feature: any) => {
        mapRef.current.flyTo({
          center: feature.geometry.coordinates,
          zoom: mapRef.current.getZoom() + 2
        });
      });

      mapRef.current.queryRenderedFeatures(event.point, { layers: ['unclustered-point'] }).forEach((feature: any) => {
        if (menuPoint.current) {
          setMapClickPointId(feature.properties.id);
          setMapClickCoords({ latitude: feature.geometry.coordinates[1], longitude: feature.geometry.coordinates[0] });
          (menuPoint.current as any).toggle(event.originalEvent, feature);
        }
      });
    }
  };

  const solicitarResgate = async () => {
    setShowConfirmationDialogBusca(true);
  };

  const solicitarResgateAccept = async () => {
    const body = {
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude,
      alreadyRescued: false
    }
    try {
      const response = await fetch(BASE_URL + '/api/v1/rescue-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.status === 201) {
        if ((toast.current as any)) {
          (toast.current as any).show({ severity: 'success', summary: 'Sucesso', detail: 'Solicitação de resgate realizada com sucesso.' });
        }

        window.location.reload();
      }
    } catch (error) {
      console.error(error);

      if ((toast.current as any)) {
        (toast.current as any).show({ severity: 'error', summary: 'Erro!', detail: 'Tente novamente mais tarde!' });
      }
    }
  };

  const baseFormInputSet = (event: any) => {
    setBaseObject({
      ...baseObject,
      [event.target.id]: event.target.value
    });
  }

  const salvarBase = async () => {
    try {
      const response = await fetch(BASE_URL + '/api/v1/rescue-bases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baseObject)
      });

      if (response.status === 201) {
        if ((toast.current as any)) {
          (toast.current as any).show({ severity: 'success', summary: 'Sucesso', detail: 'Base de resgate criada com sucesso.' });
        }

        setShowDialogBase(false);
        window.location.reload();
      }
    } catch (error) {
      console.error(error);

      if ((toast.current as any)) {
        (toast.current as any).show({ severity: 'error', summary: 'Erro!', detail: 'Tente novamente mais tarde!' });
        setShowDialogBase(false);
      }
    }
  };

  const marcarComoResgatado = async () => {
    try {
      const response = await fetch(BASE_URL + '/api/v1/rescue-points/' + mapClickPointId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baseObject)
      });

      if (response.status === 201) {
        if ((toast.current as any)) {
          (toast.current as any).show({ severity: 'success', summary: 'Sucesso', detail: 'Resgate realizado com sucesso.' });
        }

        window.location.reload();
      }
    } catch (error) {
      console.error(error);

      if ((toast.current as any)) {
        (toast.current as any).show({ severity: 'error', summary: 'Erro!', detail: 'Tente novamente mais tarde!' });
      }
    }
  }

  const reject = () => {
    console.log('Rejeitou');
  }

  return (
    <PrimeReactProvider>
      <Toast ref={toast} />
      <div className="App">
        <div className="app-container">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="DNASF - BUSCA" />
          </header>

          <div className="App-body">
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: '5px', paddingLeft: '18px', paddingRight: '18px' }}>
              <div style={{ marginRight: '20px' }}>
                <Button size='small' style={{ background: '#fff', border: '2px solid #FE5500', color: '#FE5500' }} label="Base de Resgate" icon="pi pi-plus" onClick={() => { setShowDialogBase(true) }} />
              </div>

              <div>
                <Button size='small' style={{ background: '#fff', border: '2px solid #FE5500', color: '#FE5500' }} label="Solicitação de Resgate" icon="pi pi-plus" onClick={() => { solicitarResgate() }} />
              </div>
            </div>

            <div style={{ marginTop: '20px', fontWeight: 'bold', color: '#000' }}>
              Mapa de Resgate
            </div>

            <div style={{ marginTop: '3px', fontWeight: '400', fontSize: '12px', paddingLeft: '10px', paddingRight: '10px', paddingTop: '5px' }}>
              Pontos em <span style={{ color: 'green', fontWeight: 'bold' }}>VERDE</span> são as bases de resgate e os pontos em <span style={{ color: 'red', fontWeight: 'bold' }}>VERMELHO</span> são as solicitações de resgate.
            </div>

            <div style={{ marginTop: '8px', fontWeight: '400', fontSize: '12px', marginBottom: '10px', textDecoration: 'underline' }}>Clique nos pontos no mapa para interagir.</div>

            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: '15px', marginBottom: '10px', paddingRight: '15px', paddingLeft: '15px', borderRadius: '10px' }}>
              {loading ? <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}> Carregando... </div> :
                <Map
                  initialViewState={{
                    longitude: coordenadas ? coordenadas.longitude : -51.3177,
                    latitude: coordenadas ? coordenadas.latitude : -30.0331,
                    zoom: 6
                  }}

                  interactiveLayerIds={[clusterLayer.id ?? '']}
                  onClick={mapClick}
                  ref={mapRef}
                  style={{ width: '400px', height: '440px', borderRadius: '10px' }}
                  mapStyle="https://api.maptiler.com/maps/streets/style.json?key=zjXs2txfaYdCiY8WF1Fn"
                >
                  <Source
                    id="rescuePointsSource"
                    type="geojson"
                    data={rescuePoints}
                    cluster={true}
                    clusterMaxZoom={14}
                    clusterRadius={50}
                  >
                    <Layer {...clusterLayer} />
                    <Layer {...clusterCountLayer} />
                    <Layer {...unclusteredPointLayer} />
                  </Source>

                  <Source
                    id="basePointsSource"
                    type="geojson"
                    data={basePoints}
                    cluster={false}
                    clusterMaxZoom={14}
                    clusterRadius={50}
                  >
                    <Layer {...BasePointLayer} />
                  </Source>

                  <Marker latitude={coordenadas.latitude} longitude={coordenadas.longitude}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                      <div style={{ color: 'red', fontSize: '24px' }}>📍</div>
                      <div style={{ fontSize: '12px', background: '#fff', color: '#000', padding: '5px', borderRadius: '10px', marginLeft: '5px', fontWeight: 'bold' }}>Você está aqui</div>
                    </div>
                  </Marker>
                </Map>
              }

              <Menu popup model={itemsMenuBase} ref={menuBase} />
              <Menu popup model={itemsMenuPoints} ref={menuPoint} />

              <ConfirmPopup visible={showConfirmationDialog} onHide={() => setShowConfirmationDialog(false)}
                message="Tem certeza que deseja continuar?" icon="pi pi-exclamation-triangle" accept={marcarComoResgatado} reject={reject} />

              <ConfirmDialog
                visible={showConfirmationDialogBusca}
                onHide={() => setShowConfirmationDialogBusca(false)}
                message="Tem certeza que deseja continuar?"
                header="Solicitação de Resgate"
                icon="pi pi-exclamation-triangle"
                accept={solicitarResgateAccept}
                reject={reject}
                style={{ width: '50vw' }}
                breakpoints={{ '1100px': '75vw', '960px': '100vw' }}
              />

              <Dialog visible={showDialogBase} style={{ width: '100%' }} onHide={() => setShowDialogBase(false)}>
                <Fieldset legend="Nova Base de Resgate (+)">
                  <div style={{ marginBottom: '12px' }} className="flex flex-column gap-2">
                    <label htmlFor="title">Título da Base (*)</label>
                    <InputText onChange={(e: any) => baseFormInputSet(e)} style={{ marginTop: '5px', marginBottom: '5px' }} id="title" aria-describedby="base-title-help" />
                    <small id="base-title-help">
                      Insira o título da base de resgate.
                    </small>
                  </div>

                  <div style={{ marginBottom: '12px' }} className="flex flex-column gap-2">
                    <label htmlFor="latitude">Latitude (*)</label>
                    <InputText onChange={(e: any) => baseFormInputSet(e)} style={{ marginTop: '5px', marginBottom: '5px' }} id="latitude" aria-describedby="base-latitude-help" />
                    <small id="base-latitude-help">
                      Insira o latitude da base de resgate.
                    </small>
                  </div>

                  <div style={{ marginBottom: '12px' }} className="flex flex-column gap-2">
                    <label htmlFor="longitude">Longitude (*)</label>
                    <InputText onChange={(e: any) => baseFormInputSet(e)} style={{ marginTop: '5px', marginBottom: '5px' }} id="longitude" aria-describedby="base-longitude-help" />
                    <small id="base-longitude-help">
                      Insira a longitude da base de resgate.
                    </small>
                  </div>

                  <Button disabled={!baseObject.title || !baseObject.latitude || !baseObject.longitude} size='small' style={{ marginTop: '10px', background: '#fff', border: '2px solid #FE5500', color: '#FE5500' }} label="Salvar" icon="pi pi-check" onClick={() => { salvarBase() }} />
                  <div style={{ fontWeight: '400', fontSize: '12px', marginTop: '10px' }}>* Campos obrigatórios.</div>
                </Fieldset>
              </Dialog>
            </div>
          </div>
        </div>

      </div>
    </PrimeReactProvider>

  );
}

export default App;
