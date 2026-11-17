import demoDigitalLinks from "./config/demo-digital-links.json" with { type: "json" };

const nextConfig = {
  async rewrites() {
    return {
      // Resolve only registered GTIN/serial pairs. Never resolve by GTIN alone
      // when the request identifies an individual item.
      beforeFiles: demoDigitalLinks.map(({ passportIdentifier, gtin, serialNumber }) => ({
        source: `/01/${gtin}/21/${encodeURIComponent(serialNumber)}`,
        destination: `/p/${encodeURIComponent(passportIdentifier)}`,
      })),
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "dpp.greanlean.com",
          },
        ],
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
