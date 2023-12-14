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

        <h2>{companyName}</h2>
        <p>{siteDescription}</p>
        <p>
          <a href="https://github.com/UserSpy/349CovidDashboardFinalProject">
            View on Github
          </a>
        </p>

        <h2>Base Code By</h2>
        <p>
          <a href={authorUrl}>{authorName}</a>
        </p>
        <p>
          <a href={companyUrl}>View on Github </a>
        </p>
      </Container>
    </Layout>
  );
};

export default SecondPage;
