module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8546,
      network_id: "*", // Match any network id
    },
    localBlockchain: {
      host: "localhost",
      port: 20010,
      network_id: "*" // Match any network id
    },
    production: {
      host: "13.80.147.2",
      port: 20010,
      network_id: "*" // Match any network id
    }
  }
};
