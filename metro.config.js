const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  "@": path.resolve(__dirname, "src"),
};

// Ignore transient native build trees that can disappear while Metro is watching.
config.resolver.blockList = [
  /android[\\/]+app[\\/]+\.cxx[\\/]+.*/,
  /android[\\/]+app[\\/]+build[\\/]+.*/,
  /android[\\/]+build[\\/]+.*/,
];

module.exports = config;
