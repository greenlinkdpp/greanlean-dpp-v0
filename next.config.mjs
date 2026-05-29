const nextConfig = {
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