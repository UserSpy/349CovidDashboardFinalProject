import React, { useRef, useEffect, useState } from "react";
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { Chart, registerables } from 'chart.js';

import PropTypes from "prop-types";
import { Helmet } from "react-helmet";
import L from "leaflet";
import { Marker, useMap } from "react-leaflet";

import { promiseToFlyTo, getCurrentLocation } from "lib/map";

import Layout from "components/Layout";
import Container from "components/Container";
import Map from "components/Map";
import Dark from "../assets/stylesheets/components/dark.css";
import table from "../assets/stylesheets/components/table.css";
import stateGeolocation from '../data/stateloc.json';


import axios from "axios";

const LOCATION = { lat: 0, lng: 0 }; // middle of the world
// { lat: 38.9072, lng: -77.0369 };  // in Los Angeles

const CENTER = [LOCATION.lat, LOCATION.lng];
const DEFAULT_ZOOM = 2;
const ZOOM = 10;

const timeToZoom = 2000;
Chart.register(...registerables);
function countryPointToLayer(feature = {}, latlng, setSelectedData) {
  const { properties = {} } = feature;
  let updatedFormatted;
  let casesString;

  const { country, updated, cases, deaths, recovered } = properties;

  casesString = `${cases}`;

  if (cases > 1000000) {
    casesString = `${casesString.slice(0, -6)}M+`;
  } else if (cases > 1000) {
    casesString = `${casesString.slice(0, -3)}k+`;
  }

  if (updated) {
    updatedFormatted = new Date(updated).toLocaleString();
  }

  const html = `
    <span class="icon-marker">
      <span class="icon-marker-tooltip">
        <h2>${country}</h2>
        <ul>
          <li><strong>Confirmed:</strong> ${cases}</li>
          <li><strong>Deaths:</strong> ${deaths}</li>
          <li><strong>Recovered:</strong> ${recovered}</li>
          <li><strong>Last Update:</strong> ${updatedFormatted}</li>
        </ul>
      </span>
      ${casesString} 
    </span>
  `;

  return L.marker(latlng, {
    icon: L.divIcon({
      className: "icon",
      html,
    }),
    riseOnHover: true,
  });
}

function statePointToLayer(feature = {}, latlng, setSelectedData) {
  const { properties = {} } = feature;
  let updatedFormatted;
  let casesString;

  const { state, cases, deaths, active } = properties;

  casesString = `${cases}`;

  if (cases > 1000) {
    casesString = `${casesString.slice(0, -3)}k+`;
  }

  const html = `
    <span class="icon-marker">
      <span class="icon-marker-tooltip">
        <h2>${state}</h2>
        <ul>
          <li><strong>Active:</strong> ${active}</li>
          <li><strong>Confirmed:</strong> ${cases}</li>
          <li><strong>Deaths:</strong> ${deaths}</li>
        </ul>
      </span>
      ${casesString}
    </span>
  `;

  const marker = L.marker(latlng, {
    icon: L.divIcon({
      className: "icon",
      html,
    }),
    riseOnHover: true,
  });
  marker.on('click', () => {
    console.log("Marker clicked", feature.properties);
    //setSelectedData(feature.properties);
  });

  return marker;
}

const MapEffect = ({ markerRef, setSelectedData }) => {
  console.log("in MapEffect...");
  const map = useMap();
  const ZOOM_THRESHOLD = 5; // Set an appropriate zoom level
  useEffect(() => {
    if (!markerRef.current || !map) return;

    (async function run() {
      console.log("about to call axios to get the data...");

      // const options = {
      //   method: 'GET',
      //   url: 'https://api.api-ninjas.com/v1/covid19',
      //   // params: {country: 'China'},    // for one country -- if blank will get all countries
      //   headers: {
      //     'X-API-Key': 'Vx489MBLcso/FNugQeMLNw==7tSBYITt1WeQkCTu',
      //     'X-API-Host': 'api.api-ninjas.com'
      //   }
      // };

      const options = {
        method: "GET",
        url: "https://disease.sh/v3/covid-19/countries",
        // params: {country: 'China'},    // for one country -- if blank will get all countries
        // headers: {
        //   'Disease.sh': 'disease.sh'
        // }
      };

      let response;

      try {
        response = await axios.request(options);
      } catch (error) {
        console.error(error);
        return;
      }
      console.log(response.data);
      // const rdr = response.data.response;    // for rapidapi
      // const data = rdr;

      const data = response.data; // for disease.sh
      const hasData = Array.isArray(data) && data.length > 0;
      if (!Array.isArray(data)) {
        console.log("not an array!");
        return;
      }
      if (data.length === 0) {
        console.log("data length is === 0");
      }

      if (!hasData) {
        console.log("No data, sorry!");
        return;
      }

      const geoJson = {
        type: "FeatureCollection",
        features: data.map((country = {}) => {
          const { countryInfo = {} } = country;
          const { lat, long: lng } = countryInfo;
          return {
            type: "Feature",
            properties: {
              ...country,
            },
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
          };
        }),
      };

      console.log("geoJson", geoJson);

      const geoJsonLayers = new L.GeoJSON(geoJson, {
        pointToLayer: (feature, latlng) => countryPointToLayer(feature, latlng, setSelectedData),
});
      var _map = markerRef.current._map;
      geoJsonLayers.addTo(_map);

      const location = await getCurrentLocation().catch(() => LOCATION);

      setTimeout(async () => {
        await promiseToFlyTo(map, { zoom: ZOOM, center: location });
      }, timeToZoom);
    })();

    const zoomHandler = () => {
      const currentZoom = map.getZoom();
      if (currentZoom >= ZOOM_THRESHOLD) {
        loadAndShowStatePins(map);
      } else {
        loadAndShowCountryPins(map);
      }
    };

    map.on('zoomend', zoomHandler);

    // Cleanup
    return () => {
      map.off('zoomend', zoomHandler);
    };

  }, [map, markerRef]);

  return null;
};

MapEffect.propTypes = {
  markerRef: PropTypes.object,
};

async function loadAndShowStatePins(map, setSelectedData) {

  // Clear existing layers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // Fetch state COVID data
  try {
    const response = await axios.get('https://disease.sh/v3/covid-19/states');
    const covidStatesData = response.data;

    // Merge COVID data with geolocation data
    const mergedData = covidStatesData.map(covidState => {
      const geoState = stateGeolocation.find(geo => geo.state === covidState.state);
      if (!geoState) {
        console.warn(`No geolocation found for state: ${covidState.state}`);
        return null; // Skip states without geolocation data
      }
      return {
        ...covidState,
        latitude: geoState.latitude,
        longitude: geoState.longitude
      };
    }).filter(state => state !== null); // Remove states with no geolocation data

    const geoJson = {
      type: "FeatureCollection",
      features: mergedData.map((state = {}) => ({
        type: "Feature",
        properties: {
          ...state,
        },
        geometry: {
          type: "Point",
          coordinates: [state.longitude, state.latitude],
        },
      })),
    };

    const geoJsonLayers = new L.GeoJSON(geoJson, {
      pointToLayer: (feature, latlng) => statePointToLayer(feature, latlng, setSelectedData),
    });

    geoJsonLayers.addTo(map);
  } catch (error) {
    console.error('Error fetching state data:', error);
  }
}


async function loadAndShowCountryPins(map) {
  // Clear existing layers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // Fetch country data
  try {
    const response = await axios.get('https://disease.sh/v3/covid-19/countries');
    const countries = response.data;

    const geoJson = {
      type: "FeatureCollection",
      features: countries.map((country = {}) => {
        const { countryInfo = {} } = country;
        return {
          type: "Feature",
          properties: {
            ...country,
          },
          geometry: {
            type: "Point",
            coordinates: [countryInfo.long, countryInfo.lat],
          },
        };
      }),
    };

    const geoJsonLayers = new L.GeoJSON(geoJson, {
      pointToLayer: countryPointToLayer,
    });

    geoJsonLayers.addTo(map);
  } catch (error) {
    console.error('Error fetching country data:', error);
  }
}

const IndexPage = () => {
  console.log("in IndexPage, before useRef");
  const [covidData, setCovidData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [statesData, setStatesData] = useState([]);
  const [yesterdayData, setYesterdayData] = useState([]);
  const markerRef = useRef();
  const [casesChartData, setCasesChartData] = useState({
    labels: [],
    datasets: []
  });
  const [selectedData, setSelectedData] = useState(null);
  
  const [deathsChartData, setDeathsChartData] = useState({
    labels: [],
    datasets: []
  });

  const [recoveriesChartData, setRecoveriesChartData] = useState({
    labels: [],
    datasets: []
  });
  
  const [newCasesBarChartData, setNewCasesBarChartData] = useState({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "https://disease.sh/v3/covid-19/countries"
        );
        console.log(response.data);
        setCovidData(response.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("https://disease.sh/v3/covid-19/all");
        console.log(response.data);
        setAllData(response.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "https://disease.sh/v3/covid-19/states"
        );
        console.log(response.data);
        setStatesData(response.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
  console.log("Selected Data:", selectedData);
}, [selectedData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "https://disease.sh/v3/covid-19/all?yesterday=true"
        );
        console.log(response.data);
        setYesterdayData(response.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Fetch data for the three days
        const responses = await Promise.all([
          axios.get('https://disease.sh/v3/covid-19/all'),
          axios.get('https://disease.sh/v3/covid-19/all?yesterday=true'),
          axios.get('https://disease.sh/v3/covid-19/all?twoDaysAgo=true')
        ]);
  
        const [todayData, yesterdayData, twoDaysAgoData] = responses.map(response => response.data);
  
        // Set data for cases chart
        setCasesChartData({
          labels: ['Two Days Ago', 'Yesterday', 'Today'],
          datasets: [
            {
              label: 'Global Total Cases',
              data: [twoDaysAgoData.cases, yesterdayData.cases, todayData.cases],
              fill: false,
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
            },
          ],
        });
  
        // Set data for deaths chart
        setDeathsChartData({
          labels: ['Two Days Ago', 'Yesterday', 'Today'],
          datasets: [
            {
              label: 'Global Total Deaths',
              data: [twoDaysAgoData.deaths, yesterdayData.deaths, todayData.deaths],
              fill: false,
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
          ],
        });
        // Set data for recoveries chart
      setRecoveriesChartData({
        labels: ['Two Days Ago', 'Yesterday', 'Today'],
        datasets: [
          {
            label: 'Global Total Recoveries',
            data: [twoDaysAgoData.recovered, yesterdayData.recovered, todayData.recovered],
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      });

      // Calculate new cases for each day
      const newCases = [
        yesterdayData.cases - twoDaysAgoData.cases,
        todayData.cases - yesterdayData.cases,
      ];

      // Set data for new cases bar chart
      setNewCasesBarChartData({
        labels: ['Yesterday', 'Today'],
        datasets: [
          {
            label: 'New Global Cases',
            data: newCases,
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
        ],
      });
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };
  
    fetchChartData();
  }, []);

  const mapSettings = {
    center: CENTER,
    defaultBaseMap: "OpenStreetMap",
    zoom: DEFAULT_ZOOM,
  };

  return (
    <div className="dark">
      <Layout pageName="home">
        <Helmet>
          <title>Home Page</title>
        </Helmet>
        {/* do not delete MapEffect and Marker
              with current code or axios will not run */}
        <Map {...mapSettings}>
        <MapEffect markerRef={markerRef} setSelectedData={setSelectedData} />


          <Marker ref={markerRef} position={CENTER} />
        </Map>
        <Container type="table" className="text-center home-start table-container">
  <h2 className="white-text">COVID-19 Case Data</h2>
  {selectedData && (
    <table className="white-text">
      <thead>
        <tr>
          <th>State</th>
          <th>Total Cases</th>
          <th>Total Deaths</th>
          <th>Total Recovered</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{selectedData.state}</td>
          <td>{selectedData.cases.toLocaleString()}</td>
          <td>{selectedData.deaths.toLocaleString()}</td>
          <td>{selectedData.recovered ? selectedData.recovered.toLocaleString() : 'N/A'}</td>
        </tr>
      </tbody>
    </table>
  )}
</Container>
        <Container
          type="table"
          className="text-center home-start table-container"
        >
          <h2 className="white-text">Total</h2>
          <table className="white-text">
            <thead>
              <tr>
                <th>Cases</th>
                <th>Deaths</th>
                <th>Recovered</th>
              </tr>
            </thead>
            <tbody>
              <td>
                {allData.cases ? allData.cases.toLocaleString() : allData.cases}
              </td>
              <td>
                {allData.deaths
                  ? allData.deaths.toLocaleString()
                  : allData.deaths}
              </td>
              <td>
                {allData.recovered
                  ? allData.recovered.toLocaleString()
                  : allData.recovered}
              </td>
            </tbody>
          </table>
        </Container>
        <Container type="content" className="text-center home-start">
      <h2 className="white-text">Global Total Cases Over Time</h2>
      <Line data={casesChartData} />
    </Container>

    <Container type="content" className="text-center home-start">
      <h2 className="white-text">Global Total Deaths Over Time</h2>
      <Line data={deathsChartData} />
    </Container>
    <Container type="content" className="text-center home-start">
      <h2 className="white-text">Global Total Recoveries Over Time</h2>
      <Line data={recoveriesChartData} />
    </Container>

    <Container type="content" className="text-center home-start">
      <h2 className="white-text">New Global Cases</h2>
      <Bar data={newCasesBarChartData} />
    </Container>
    <Container
          type="table"
          className="text-center home-start table-container"
        >
          <h2 className="white-text">Today's Cases</h2>
          <table className="white-text">
            <thead>
              <tr>
                <th>Cases</th>
                <th>Deaths</th>
                <th>Recovered</th>
              </tr>
            </thead>
            <tbody>
              <td>
                {allData.todayCases ? allData.todayCases.toLocaleString() : allData.todayCases}
              </td>
              <td>
                {yesterdayData.todayDeaths
                  ? yesterdayData.todayDeaths.toLocaleString()
                  : yesterdayData.todayDeaths}
              </td>
              <td>
                {allData.todayRecovered
                  ? allData.todayRecovered.toLocaleString()
                  : allData.todayRecovered}
              </td>
            </tbody>
          </table>
        </Container>
    <Container
          type="table"
          className="text-center home-start table-container"
        >
          <h2 className="white-text">Countries</h2>
          <table className="white-text">
            <thead>
              <tr>
                <th>Country</th>
                <th>Cases</th>
                <th>Deaths</th>
                <th>Recovered</th>
                <th>Cases Per Million</th>
              </tr>
            </thead>
            <tbody>
              {covidData.map((countryData) => (
                <tr key={countryData.country}>
                  <td>{countryData.country}</td>
                  <td>{countryData.cases.toLocaleString()}</td>
                  <td>{countryData.deaths.toLocaleString()}</td>
                  <td>{countryData.recovered.toLocaleString()}</td>
                  <td>{countryData.casesPerOneMillion.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Container>
        <Container
          type="table"
          className="text-center home-start table-container"
        >
          <h2 className="white-text">United States</h2>
          <table className="white-text">
            <thead>
              <tr>
                <th>State</th>
                <th>Population</th>
                <th>Cases</th>
                <th>Cases Per Million</th>
                <th>Deaths</th>
              </tr>
            </thead>
            <tbody>
              {statesData.map((unitedStatesData) => (
                <tr key={unitedStatesData.state}>
                  <td>{unitedStatesData.state}</td>
                  <td>{unitedStatesData.population.toLocaleString()}</td>
                  <td>{unitedStatesData.cases.toLocaleString()}</td>
                  <td>
                    {unitedStatesData.casesPerOneMillion.toLocaleString()}
                  </td>
                  <td>{unitedStatesData.deaths.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Container>
        <Container
          type="content"
          className="text-center home-start"
        ></Container>
      </Layout>
    </div>
  );
};

export default IndexPage;