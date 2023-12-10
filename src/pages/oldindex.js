import React, { useRef, useEffect } from "react";
import { Helmet } from "react-helmet";
import L from "leaflet";
import Layout from "components/Layout";
import Container from "components/Container";
import Map from "components/Map";
import axios from 'axios';
const LOCATION = {
  lat: 33.8872,
  lng: -117.8869,
};
const CENTER = [LOCATION.lat, LOCATION.lng];
const DEFAULT_ZOOM = 2;
/**
 * MapEffect
 * @description This is an example of creating an effect used to zoom in and set a popup on load
 */

const MapEffect = async ({ leafletElement: map }) => {
  if (!map) { return }

let response;
try {
  
  response = await axios.get('https://corona.lmao.ninja/countries');
} catch(e){
  console.log('E', e);
  return;
}


  console.log('response', response);
  return response;
};
// MapEffect.propTypes = {
//   markerRef: PropTypes.object,
// };


const IndexPage = () => {
  const markerRef = useRef();

  const mapSettings = {
    center: CENTER,
    defaultBaseMap: "OpenStreetMap",
    zoom: DEFAULT_ZOOM,
  };

  return (
    <Layout pageName="home">
      <Helmet>
        <title>Home Page</title>
      </Helmet>

      <Map {...mapSettings}>

      </Map>

      <Container type="content" className="text-center home-start">
        <h2>Still Getting Started?</h2>
        <p>Run the following in your terminal!</p>
        {/* <Snippet>
          gatsby new [directory]
          https://github.com/colbyfayock/gatsby-starter-leaflet
        </Snippet> */}
        <p className="note">
          Note: Gatsby CLI required globally for the above command
        </p>
      </Container>
    </Layout>
  );
};

export default IndexPage;
