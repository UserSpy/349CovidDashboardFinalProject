import React from "react";
import { Helmet } from "react-helmet";

import { useSiteMetadata } from "hooks";

import Layout from "components/Layout";
import Container from "components/Container";

const SecondPage = () => {
  const { companyName, companyUrl, authorName, authorUrl, siteDescription } =
    useSiteMetadata();

  return (
    <Layout pageName="about">
      <Helmet>
        <title>About</title>
      </Helmet>
      <Container type="content">
        <h1>About</h1>

        <p>Covid Stats</p>

        <p></p>

        <h2>Contributers</h2>
        <p>- Mark Raden</p>
        <p>- John Rehagen</p>
        <p>- Anthony LaPan</p>
        <p>- Elizabeth Steubs</p>

        <p>
          <a href="https://github.com/UserSpy/349CovidDashboardFinalProject">
            View our Github
          </a>
        </p>
      </Container>
    </Layout>
  );
};

export default SecondPage;
