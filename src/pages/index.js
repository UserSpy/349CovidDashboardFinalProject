import React, { useRef, useEffect, useState } from "react";
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

import axios from "axios";

const LOCATION = { lat: 0, lng: 0 }; // middle of the world
// { lat: 38.9072, lng: -77.0369 };  // in Los Angeles

const CENTER = [LOCATION.lat, LOCATION.lng];
const DEFAULT_ZOOM = 2;
const ZOOM = 10;

const timeToZoom = 2000;

function countryPointToLayer(feature = {}, latlng) {
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

const MapEffect = ({ markerRef }) => {
  console.log("in MapEffect...");
  const map = useMap();

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
        pointToLayer: countryPointToLayer,
      });
      var _map = markerRef.current._map;
      geoJsonLayers.addTo(_map);

      const location = await getCurrentLocation().catch(() => LOCATION);

      setTimeout(async () => {
        await promiseToFlyTo(map, { zoom: ZOOM, center: location });
      }, timeToZoom);
    })();
  }, [map, markerRef]);

  return null;
};

MapEffect.propTypes = {
  markerRef: PropTypes.object,
};

const IndexPage = () => {
  console.log("in IndexPage, before useRef");
  const [covidData, setCovidData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [statesData, setStatesData] = useState([]);
  const markerRef = useRef();

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
          <MapEffect markerRef={markerRef} />
          <Marker ref={markerRef} position={CENTER} />
        </Map>
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
        <Container
          type="table"
          className="text-center home-start table-container"
        >
          <h2 className="white-text">Countries</h2>
          <table className="white-text">
            <thead>
              <tr>
                <th>Country</th>
                <th>Population</th>
                <th>Cases</th>
                <th>Cases Per Million</th>
                <th>Deaths</th>
              </tr>
            </thead>
            <tbody>
              {covidData.map((countryData) => (
                <tr key={countryData.country}>
                  <td>{countryData.country}</td>
                  <td>{countryData.population.toLocaleString()}</td>
                  <td>{countryData.cases.toLocaleString()}</td>
                  <td>{countryData.casesPerOneMillion.toLocaleString()}</td>
                  <td>{countryData.deaths.toLocaleString()}</td>
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
